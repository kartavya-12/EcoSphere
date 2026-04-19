import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('login');
  const [signupRole, setSignupRole] = useState('');
  const { login, signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  function handleClose() {
    onClose();
    setTimeout(() => {
      setActiveTab('login');
      setSignupRole('');
    }, 300);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'signup') setSignupRole('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    const email = e.target.elements['login-email'].value;
    const password = e.target.elements['login-password'].value;
    
    try {
      await login(email, password);
      alert('Logged in successfully!');
      handleClose();
      navigate('/dashboard');
    } catch (error) {
      alert(error.message || 'Login failed');
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const email = e.target.elements['signup-email'].value;
    const password = e.target.elements['signup-password'].value;
    const role = signupRole;
    
    let name = '';
    let org_name = null;
    let department = null;
    
    if (role === 'community' || role === 'volunteer') {
      name = e.target.elements['signup-name'].value;
    } else if (role === 'ngo') {
      org_name = e.target.elements['signup-org'].value;
      name = org_name;
    } else if (role === 'government') {
      department = e.target.elements['signup-dept'].value;
      name = department;
    }

    try {
      await signup({ name, org_name, department, role, email, password });
      alert('Account created successfully! Welcome to EcoSphere.');
      handleClose();
      navigate('/dashboard');
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('rate limit')) {
        alert('Supabase email rate limit exceeded!\n\nSince you are testing frequently, you have hit the free tier signup limit. \n\nWorkarounds:\n1. Try logging in if the account was already created.\n2. Use a different dummy email address.\n3. Wait about an hour.\n4. Go to Supabase Dashboard -> Auth -> Rate Limits and increase the limits.');
      } else {
        alert(error.message || 'Signup failed');
      }
    }
  }

  async function handleGoogle() {
    try {
      await googleLogin();
    } catch (error) {
      alert(error.message || 'Google login failed');
    }
  }


  if (!isOpen) return null;

  return (
    <div className={`modal ${isOpen ? 'active' : ''}`} id="loginModal">
      <div className="login-container">
        <button className="close" onClick={handleClose}>✖</button>

        <div className="auth-tabs">
            <button
              id="tab-login"
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => handleTabChange('login')}
            >
              Login
            </button>
            <button
              id="tab-signup"
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => handleTabChange('signup')}
            >
              Sign Up
            </button>
          </div>
        

        {/* Login Form */}
        {activeTab === 'login' && (
          <form id="loginForm" className="auth-form active" onSubmit={handleLogin}>
            <h2>Welcome Back</h2>
            <div className="input-box">
              <input type="email" id="login-email" placeholder="Email" required />
            </div>
            <div className="input-box">
              <input type="password" id="login-password" placeholder="Password" required />
            </div>
            <div className="options">
              <label><input type="checkbox" /> Remember Me</label>
              <a href="#" className="forgot-link">Forgot Password?</a>
            </div>
            <button type="submit" className="login-btn">Log In</button>
            <p className="or">Or Sign in with</p>
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogle}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                alt="Google"
                style={{ width: '20px' }}
              />
              Continue with Google
            </button>
          </form>
        )}

        {/* Signup Role Selection */}
        {activeTab === 'signup' && !signupRole && (
          <div className="auth-form active">
            <h2>Join EcoSphere</h2>
            <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>Choose your account type to continue</p>
            <div style={{ display: 'grid', gap: '15px' }}>
              <button type="button" onClick={() => setSignupRole('community')} className="role-card-btn">
                <span style={{ fontSize: '24px' }}>🧑‍🤝‍🧑</span>
                <div style={{ textAlign: 'left' }}>
                  <strong>Citizen / Volunteer</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: '#aaa', marginTop: '4px' }}>Join events and report local issues</span>
                </div>
              </button>
              <button type="button" onClick={() => setSignupRole('ngo')} className="role-card-btn">
                <span style={{ fontSize: '24px' }}>🏢</span>
                <div style={{ textAlign: 'left' }}>
                  <strong>NGO / Organization</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: '#aaa', marginTop: '4px' }}>Manage campaigns and volunteers</span>
                </div>
              </button>
              <button type="button" onClick={() => setSignupRole('government')} className="role-card-btn">
                <span style={{ fontSize: '24px' }}>🏛️</span>
                <div style={{ textAlign: 'left' }}>
                  <strong>Government Official</strong>
                  <span style={{ display: 'block', fontSize: '12px', color: '#aaa', marginTop: '4px' }}>Monitor reports & clearances</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && signupRole && (
          <form id="signupForm" className="auth-form active" onSubmit={handleSignup} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setSignupRole('')} style={{ position: 'absolute', top: '0', left: '0', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: '18px' }}>← Back</button>
            <h2 style={{ marginTop: '30px' }}>
              {signupRole === 'community' ? 'Citizen Signup' : signupRole === 'ngo' ? 'NGO Signup' : 'Govt Signup'}
            </h2>
            
            {signupRole === 'community' && (
              <div className="input-box">
                <input type="text" name="signup-name" placeholder="Full Name" required />
              </div>
            )}
            {signupRole === 'ngo' && (
              <div className="input-box">
                <input type="text" name="signup-org" placeholder="Organization Name" required />
              </div>
            )}
            {signupRole === 'government' && (
              <div className="input-box">
                <input type="text" name="signup-dept" placeholder="Department Name" required />
              </div>
            )}
            
            <div className="input-box">
              <input type="email" name="signup-email" placeholder={signupRole === 'government' ? 'Official Email Address' : 'Email Address'} required />
            </div>
            <div className="input-box">
              <input type="password" name="signup-password" placeholder="Password (Min 6 chars)" required />
            </div>
            <button type="submit" className="login-btn">Create Account</button>
          </form>
        )}
      </div>
      <style>{`
        .role-card-btn {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #1a1a1a;
          border: 1px solid #333;
          padding: 15px;
          border-radius: 8px;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }
        .role-card-btn:hover {
          background: #2a2a2a;
          border-color: #4caf50;
        }
      `}</style>
    </div>
  );
}
