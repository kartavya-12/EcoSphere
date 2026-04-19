import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import ScrollReveal from '../components/ScrollReveal';
import { useAuth } from '../hooks/useAuth';
import { useReports, useEvents, useGlobalStats, useRegistrations } from '../hooks/useSupabaseData';
import { Skeleton } from '../components/Skeleton';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/Home.css';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const bounds = { minLat: 28.0, maxLat: 29.0, minLng: 76.5, maxLng: 77.8 };

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) {
        alert('Select location within Delhi NCR');
        return;
      }
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      onLocationSelect({ lat, lng, address: data.display_name || 'Address not found' });
    },
  });
  return null;
}

function FlyToMarker({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 14);
    }
  }, [position, map]);
  return null;
}

const ecosystems = [
  { title: 'Forests', desc: 'Protecting biodiversity and preventing deforestation.' },
  { title: 'Marine', desc: 'Preserving oceans, coral reefs and marine wildlife.' },
  { title: 'Mountains', desc: 'Sustainable trekking and wildlife conservation.' },
  { title: 'Wetlands', desc: 'Protecting migratory birds and water ecosystems.' },
  { title: 'Deserts', desc: 'Maintaining fragile desert ecological balance.' },
  { title: 'Urban Ecosystems', desc: 'Promoting sustainable and green cities.' },
];

const galleryItems = [
  { img: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5', label: 'Beach Cleanup Drive' },
  { img: 'https://images.unsplash.com/photo-1589923188900-85dae523342b', label: 'Tree Plantation Activity' },
  { img: 'https://tse2.mm.bing.net/th/id/OIP.8P0GiIjVw1jO6t5_Xms2IQHaEK?rs=1&pid=ImgDetMain&o=7&rm=3', label: 'River Restoration Work' },
  { img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', label: 'Forest Conservation Campaign' },
];

const testimonials = [
  { quote: 'EcoSphere helped us organize volunteer clean-up drives efficiently.', org: 'GreenEarth NGO' },
  { quote: 'We were able to monitor pollution reports and respond faster.', org: 'OceanCare Foundation' },
  { quote: 'The volunteer participation boosted our forest restoration project.', org: 'WildLife Protectors' },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addReport } = useReports();
  const { events, loading: eventsLoading } = useEvents();
  const { stats, loading: statsLoading } = useGlobalStats();
  const { registrations, registerForEvent } = useRegistrations();

  const [markerPos, setMarkerPos] = useState(null);
  const [locationValue, setLocationValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locationInputRef = useRef(null);

  const handleLocationSelect = useCallback(({ lat, lng, address }) => {
    setMarkerPos([lat, lng]);
    setLocationValue(address);
  }, []);

  async function handleLocationKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = locationValue;
      if (!query) return;

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}`
      );
      const data = await res.json();

      if (data.length === 0) { alert('Location not found'); return; }

      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);

      if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) {
        alert('Location must be within Delhi NCR');
        return;
      }

      setMarkerPos([lat, lng]);
    }
  }

  function getUserLocation() {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (lat < bounds.minLat || lat > bounds.maxLat || lng < bounds.minLng || lng > bounds.maxLng) {
          alert('You are outside Delhi NCR');
          return;
        }

        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
        );
        const data = await res.json();

        setMarkerPos([lat, lng]);
        setLocationValue(data.display_name || 'Address not found');
      },
      () => alert('Location permission denied')
    );
  }

  async function handleJoinEvent(eventId) {
    if (!user) {
      alert('Please log in to join an event.');
      return;
    }
    try {
      await registerForEvent(eventId);
      alert('Successfully joined the event! Pending approval.');
    } catch (err) {
      alert('Failed to join: ' + err.message);
    }
  }

  async function handleReportSubmit(e) {
    e.preventDefault();
    if (!user) {
      alert('Please log in to submit a report.');
      return;
    }

    const title = e.target.elements[1].value;
    const description = e.target.elements[2].value;

    if (!locationValue || !title) {
      alert('Please select a location and issue type.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addReport({
        title,
        location: locationValue,
        description,
        status: 'pending'
      });
      alert('Issue Report Submitted Successfully!');
      e.target.reset();
      setLocationValue('');
      setMarkerPos(null);
    } catch (err) {
      alert('Failed to submit report: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <section id="home" className="hero">
        <div className="hero-content">
          <h2>Sustainable Tourism & Ecosystem Conservation</h2>
          <p>
            EcoSphere connects tourists, volunteers, NGOs and government
            agencies to protect ecosystems while promoting responsible tourism.
          </p>
          <button onClick={() => document.getElementById('ecosystems')?.scrollIntoView({ behavior: 'smooth' })}>
            Explore Ecosystems
          </button>
        </div>
      </section>

      <ScrollReveal as="section" id="ecosystems" className="relative-section">
        <div className="eco-bg-text">EcoSphere</div>
        <h2>Protected Ecosystems</h2>
        <div className="card-grid">
          {ecosystems.map((eco, i) => (
            <ScrollReveal key={i} className="card">
              <h3>{eco.title}</h3>
              <p>{eco.desc}</p>
            </ScrollReveal>
          ))}
        </div>
        <div className="center-btn">
          <button onClick={() => navigate('/explore')}>Explore More</button>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" id="volunteer">
        <h2>Conservation Activities</h2>
        <div className="card-grid">
          {eventsLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} height="200px" borderRadius="15px" />)
          ) : events.length > 0 ? (
            events.map((act, i) => {
              const hasJoined = registrations?.some(r => r.event_id === act.id && r.volunteer_id === user?.id);
              return (
                <div className="card" key={act.id || i}>
                  <h3>{act.title}</h3>
                  <p>Location: {act.location || 'Remote/TBD'}</p>
                  <p>Date: {act.event_date || act.date ? new Date(act.event_date || act.date).toLocaleDateString() : 'TBD'}</p>
                  <button onClick={() => handleJoinEvent(act.id)} disabled={hasJoined || act.status === 'completed'}>
                    {hasJoined ? 'Joined ✓' : 'Join'}
                  </button>
                </div>
              );
            })
          ) : (
            <p>No activities found.</p>
          )}
        </div>
        <div className="center-btn">
          <button onClick={() => navigate('/activities')}>View All Activities</button>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" id="report">
        <h2>Report Environmental Issue</h2>
        <div className="report-container">
          <form id="reportForm" className="report-form" onSubmit={handleReportSubmit}>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                ref={locationInputRef}
                value={locationValue}
                onChange={(e) => setLocationValue(e.target.value)}
                onKeyDown={handleLocationKeyDown}
                placeholder="Enter location"
              />
            </div>
            <div className="form-group">
              <label>Issue Type</label>
              <select defaultValue="" required>
                <option value="" disabled>Select Issue</option>
                <option>Pollution</option>
                <option>Deforestation</option>
                <option>Waste Dumping</option>
                <option>Wildlife Threat</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea placeholder="Describe the issue" required></textarea>
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>

          <div className="map-container">
            <MapContainer
              center={[28.6139, 77.2090]}
              zoom={10}
              maxBounds={[[bounds.minLat, bounds.minLng], [bounds.maxLat, bounds.maxLng]]}
              maxBoundsViscosity={1.0}
              style={{ width: '100%', height: '300px', borderRadius: '15px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              <MapClickHandler onLocationSelect={handleLocationSelect} />
              <FlyToMarker position={markerPos} />
              {markerPos && <Marker position={markerPos} />}
            </MapContainer>
            <p className="map-note">📍 Click on map to select location</p>
          </div>



          <button type="button" className="location-btn" onClick={getUserLocation}>
            Use My Current Location
          </button>
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" id="gallery">
        <h2>Ground Work Gallery</h2>
        <div className="gallery-grid">
          {galleryItems.map((item, i) => (
            <ScrollReveal key={i} className="gallery-card">
              <img src={item.img} alt={item.label} />
              <p>{item.label}</p>
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" id="testimonials">
        <h2>NGO Testimonials</h2>
        <div className="testimonial-grid">
          {testimonials.map((t, i) => (
            <ScrollReveal key={i} className="testimonial">
              <p>{t.quote}</p>
              <h4>{t.org}</h4>
            </ScrollReveal>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal as="section" id="dashboard-stats">
        <h2>Impact Dashboard</h2>
        <div className="stats">
          {statsLoading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="stat">
                 <Skeleton width="100px" height="40px" className="mb-10" />
                 <Skeleton width="150px" height="20px" />
              </div>
            ))
          ) : (
            <>
              <ScrollReveal className="stat">
                <h3>{stats.carbon_offset}</h3>
                <p>Carbon Offset</p>
              </ScrollReveal>
              <ScrollReveal className="stat">
                <h3>{stats.total_volunteers.toLocaleString()}+</h3>
                <p>Total Volunteers</p>
              </ScrollReveal>
              <ScrollReveal className="stat">
                <h3>{(events.length || 0) + 12}</h3>
                <p>Active Projects</p>
              </ScrollReveal>
              <ScrollReveal className="stat">
                <h3>24/7</h3>
                <p>Monitoring</p>
              </ScrollReveal>
            </>
          )}
        </div>
      </ScrollReveal>
    </>
  );
}
