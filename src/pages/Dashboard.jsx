import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useReports, useEvents, useGlobalStats, useRegistrations } from '../hooks/useSupabaseData';
import { CardSkeleton } from '../components/Skeleton';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const { reports, loading: reportsLoading, updateReportStatus } = useReports();
  const { events, loading: eventsLoading, addEvent } = useEvents();
  const { registrations, registerForEvent, updateRegistrationStatus } = useRegistrations();
  const { stats, loading: statsLoading } = useGlobalStats();
  const navigate = useNavigate();

  const [creatingEvent, setCreatingEvent] = useState(false);
  const [linkedIssue, setLinkedIssue] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      alert('Unauthorized Access. Please log in.');
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="dashboard-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>
        <h2>Loading profile...</h2>
      </div>
    );
  }

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/');
  }

  async function handleResolve(reportId) {
    try {
      await updateReportStatus(reportId, 'resolved');
    } catch (err) {
      alert('Failed to resolve report: ' + err.message);
    }
  }

  async function handleJoinEvent(eventId) {
    if (!eventId) return;
    try {
      await registerForEvent(eventId);
      alert('Successfully joined the event!');
    } catch (err) {
      alert('Failed to join: ' + err.message);
    }
  }

  async function handleCreateEvent(e) {
    e.preventDefault();
    const title = e.target.elements['event-title'].value;
    const location = e.target.elements['event-location'].value;
    const date = e.target.elements['event-date'].value;

    try {
      await addEvent({
        title,
        description: linkedIssue ? `Event for issue: ${linkedIssue.title}` : 'New eco activity',
        location,
        date,
        organizer_id: user.id,
        organizer_name: user.name || 'Organization',
        status: 'upcoming',
        issue_id: linkedIssue?.id || null // Newly requested field
      });
      alert('Event Created successfully!');
      setCreatingEvent(false);
      setLinkedIssue(null);
    } catch (err) {
      alert('Failed to create event: ' + err.message);
    }
  }

  const userJoinedCount = registrations?.filter(r => r.volunteer_id === user.id)?.length || user.cleanup_drives || 0;

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR NVAIGATION */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          EcoSphere
        </div>
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="active">Overview</Link>
          <Link to="/explore">Explore Map</Link>
          <Link to="/activities">Activities</Link>
          <button onClick={handleLogout} style={{ marginTop: '40px' }}>Logout</button>
        </nav>
      </aside>

      {/* DASHBOARD MAIN CONTENT */}
      <main className="dashboard-main">
        {/* TOP NAVBAR */}
        <header className="top-navbar">
           <div className="user-profile-nav">
             <div style={{ textAlign: 'right' }}>
               <strong style={{ display: 'block', fontSize: '14px', color: '#fff' }}>{user.name}</strong>
               <span style={{ fontSize: '12px', color: '#a8e6cf', textTransform: 'uppercase', fontWeight: 'bold' }}>{user.role}</span>
             </div>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#4caf50', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', color: '#fff' }}>
               {user.name.charAt(0).toUpperCase()}
             </div>
           </div>
        </header>

        {/* TOP STAT CARDS */}
        <div className="top-stat-cards">
           {statsLoading ? (
             <p style={{ padding: '0 30px' }}>Loading system statistics...</p>
           ) : (
             <>
               <div className="stat-card">
                  <h4>Total Active Issues</h4>
                  <h2>{reports.filter(r => r.status === 'pending').length}</h2>
               </div>
               <div className="stat-card">
                  <h4>Total Events Started</h4>
                  <h2>{events.length}</h2>
               </div>
               <div className="stat-card">
                  <h4>Global Volunteers</h4>
                  <h2>{stats.total_volunteers?.toLocaleString() || 0}</h2>
               </div>
               <div className="stat-card">
                  <h4>Carbon Offset (kg)</h4>
                  <h2>{stats.carbon_offset || 0}</h2>
               </div>
             </>
           )}
        </div>

        {/* WIDGET GRID CONTENT */}
        <div className="dashboard-content">
          <div className="dashboard-grid">
          {/* COMMUNITY & VOLUNTEER WIDGETS */}
          {(user.role === 'community' || user.role === 'volunteer') && (
            <>
              <div className="widget">
                <h3>My Contributions</h3>
                <p>Joined Events: {userJoinedCount}</p>
                <p>Trees Planted: {user.trees_planted || 0}</p>
                <p>Community Rank: 🌟 {user.rank || 'Novice'}</p>
              </div>

              <div className="widget">
                <h3>Upcoming Local Activities</h3>
                {eventsLoading ? (
                  <p>Loading events...</p>
                ) : events.length > 0 ? (
                  events.slice(0, 3).map(event => {
                    const reg = registrations.find(r => r.event_id === event.id && r.volunteer_id === user.id);
                    const hasJoined = !!reg;
                    let displayStatus = 'Join Event';
                    let btnDisabled = false;
                    
                    if (hasJoined) {
                      btnDisabled = true;
                      if (reg.status === 'accepted') displayStatus = 'Joined ✓';
                      else if (reg.status === 'rejected') displayStatus = 'Rejected ❌';
                      else displayStatus = 'Pending Appv';
                    } else if (event.status === 'completed') {
                      btnDisabled = true;
                      displayStatus = 'Completed';
                    }

                    return (
                      <div key={event.id} className="mini-event" style={{ borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '10px' }}>
                        <p><strong>{event.title}</strong> - {new Date(event.event_date || event.date).toLocaleDateString()}</p>
                        <p style={{ fontSize: '12px', color: '#aaa' }}>{event.location} • By {event.organizer_name}</p>
                        {event.issue_id && <p style={{ fontSize: '11px', color: '#4caf50' }}>✓ Linked to Ecological Issue</p>}
                        <button 
                          style={{ marginTop: '5px', padding: '5px 10px', fontSize: '12px' }} 
                          onClick={() => handleJoinEvent(event.id)}
                          disabled={btnDisabled}
                        >
                          {displayStatus}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p>No upcoming activities.</p>
                )}
              </div>

              <div className="widget" style={{ gridColumn: '1 / -1' }}>
                <h3>My Submitted Reports</h3>
                <div style={{ marginTop: '20px', display: 'grid', gap: '15px' }}>
                  {reportsLoading ? (
                    <CardSkeleton />
                  ) : reports.length > 0 ? (
                    reports.map(report => (
                      <div key={report.id} className={`report-item ${report.status}`}>
                        <div className="report-header">
                          <strong>{report.title}</strong>
                          <span className={`status-badge ${report.status}`}>{report.status.toUpperCase()}</span>
                        </div>
                        <p className="report-location">📍 {report.location}</p>
                        <p className="report-date">Reported on: <strong>{new Date(report.created_at).toLocaleDateString()}</strong></p>
                        <p className="report-desc">"{report.description}"</p>
                      </div>
                    ))
                  ) : (
                    <p>No reports submitted yet.</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* NGO/GOVERNMENT WIDGETS (Admin View) */}
          {(user.role === 'ngo' || user.role === 'government') && (
            <>
              <div className="widget" style={{ gridColumn: '1 / -1' }}>
                <h3>Global Ecological Reports (Management)</h3>
                <div style={{ marginTop: '20px', display: 'grid', gap: '15px' }}>
                  {reportsLoading ? (
                    <CardSkeleton />
                  ) : reports.length > 0 ? (
                    reports.map(report => (
                      <div key={report.id} className={`report-item ${report.status}`}>
                        <div className="report-header">
                          <strong>{report.title}</strong>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className={`status-badge ${report.status}`}>{report.status.toUpperCase()}</span>
                            {report.status === 'pending' && (
                              <>
                                <button 
                                  className="resolve-btn" 
                                  onClick={() => handleResolve(report.id)}
                                >
                                  Mark Resolved
                                </button>
                                <button 
                                  onClick={() => { setLinkedIssue(report); setCreatingEvent(true); }}
                                  style={{ marginLeft: '10px', padding: '5px 10px', fontSize: '12px', backgroundColor: '#3f51b5', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Create Event
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="report-location">📍 {report.location}</p>
                        <p className="report-date">Reported by User ID: {report.reporter_id?.slice(0, 8) || 'Unknown'}...</p>
                        <p className="report-desc">"{report.description}"</p>
                      </div>
                    ))
                  ) : (
                    <p>No reports found.</p>
                  )}
                </div>
              </div>

              <div className="widget" style={{ gridColumn: '1 / -1' }}>
                <h3>{user.role === 'ngo' ? 'Campaign Management' : 'Regional Alerts'}</h3>
                {!creatingEvent ? (
                  <>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                      <p>Active Tasks: {reports.filter(r => r.status === 'pending').length}</p>
                      <p>Total Events Managed: {events.filter(e => e.organizer_id === user.id).length}</p>
                      <p>Volunteers Registered: {registrations.filter(r => events.some(e => e.id === r.event_id && e.organizer_id === user.id)).length}</p>
                    </div>
                    
                    <button style={{ marginTop: '5px' }} onClick={() => setCreatingEvent(true)}>
                      Create New Activity
                    </button>

                    <div style={{ marginTop: '20px' }}>
                      <h4>My Events & Volunteers</h4>
                      {events.filter(e => e.organizer_id === user.id).map(event => {
                        const eventRegs = registrations.filter(r => r.event_id === event.id);
                        return (
                          <div key={event.id} style={{ borderBottom: '1px solid #444', paddingBottom: '15px', marginBottom: '15px' }}>
                            <h5 style={{ marginBottom: '10px', fontSize: '16px' }}>{event.title} <span style={{fontSize: '12px', fontWeight: 'normal'}}>({new Date(event.event_date || event.date).toLocaleDateString()})</span></h5>
                            {eventRegs.length > 0 ? (
                              <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                                {eventRegs.map(reg => (
                                  <li key={reg.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#2a2a2a', padding: '10px', marginBottom: '5px', borderRadius: '4px' }}>
                                    <span>{reg.volunteer_name || 'Volunteer'} - <strong style={{ color: reg.status === 'accepted' ? '#4caf50' : reg.status === 'rejected' ? '#f44336' : '#ffeb3b'}}>{reg.status || 'pending'}</strong></span>
                                    {(!reg.status || reg.status === 'pending') && (
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => updateRegistrationStatus(reg.id, 'accepted')} style={{ backgroundColor: '#2e7d32', padding: '5px 10px', fontSize: '13px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Accept</button>
                                        <button onClick={() => updateRegistrationStatus(reg.id, 'rejected')} style={{ backgroundColor: '#c62828', padding: '5px 10px', fontSize: '13px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>No volunteers registered yet.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <form onSubmit={handleCreateEvent} style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#1E1E1E', padding: '15px', borderRadius: '8px' }}>
                    <h4>{linkedIssue ? `Create Event for: ${linkedIssue.title}` : 'Create Event'}</h4>
                    <input type="text" id="event-title" placeholder="Event Title" required style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
                    <input type="text" id="event-location" placeholder="Location" defaultValue={linkedIssue ? linkedIssue.location : ''} required style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
                    <input type="date" id="event-date" required style={{ padding: '8px', borderRadius: '4px', border: 'none' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" style={{ flex: 1, backgroundColor: '#4caf50', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', color: '#fff', fontWeight: 'bold' }}>Save</button>
                      <button type="button" onClick={() => { setCreatingEvent(false); setLinkedIssue(null); }} style={{ flex: 1, backgroundColor: '#555', border: 'none', padding: '10px', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          {/* NGO/GOVERNMENT SPECIFIC WIDGETS */}
          {user.role === 'ngo' && (
             <div className="widget">
                <h3>Resource Requests</h3>
                <p>Pending Govt Approval: 2</p>
                <button style={{ marginTop: '10px' }}>View Details</button>
              </div>
          )}

          {user.role === 'government' && (
            <div className="widget">
              <h3>NGO Clearances</h3>
              <p>3 NGOs pending authorization</p>
              <button style={{ marginTop: '10px' }}>Manage Approvals</button>
            </div>
          )}

          </div>
        </div>
      </main>
    </div>
  );
}
