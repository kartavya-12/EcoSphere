import { Link } from 'react-router-dom';
import { useEvents, useRegistrations } from '../hooks/useSupabaseData';
import { useAuth } from '../hooks/useAuth';
import '../styles/Activities.css';

export default function Activities() {
  const { user } = useAuth();
  const { events, loading: eventsLoading } = useEvents();
  const { registrations, registerForEvent } = useRegistrations();

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

  return (
    <div className="activities-page">
      <header className="activities-header">
        <h1>EcoSphere</h1>
        <nav>
          <Link to="/">← Back to Home</Link>
        </nav>
      </header>

      <section className="activities-section">
        <h2>Conservation Activities in Delhi</h2>
        <p>
          Participate in real environmental activities across Delhi including river cleanups,
          tree plantation drives, park maintenance, and awareness campaigns.
        </p>

        <div className="card-grid">
          {eventsLoading ? (
            <p>Loading activities...</p>
          ) : events.length > 0 ? (
            events.map((act) => {
              const hasJoined = registrations?.some(r => r.event_id === act.id && r.volunteer_id === user?.id);
              return (
                <div className="card" key={act.id}>
                  <img src={act.img || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500&q=80'} alt={act.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  <h3>{act.title}</h3>
                  <p>Location: {act.location}</p>
                  <p>Date: {act.event_date || act.date ? new Date(act.event_date || act.date).toLocaleDateString() : 'TBD'}</p>
                  <button onClick={() => handleJoinEvent(act.id)} disabled={hasJoined || act.status === 'completed'}>
                    {hasJoined ? 'Joined ✓' : 'Join'}
                  </button>
                </div>
              );
            })
          ) : (
            <p>No activities available at the moment.</p>
          )}
        </div>
      </section>
    </div>
  );
}
