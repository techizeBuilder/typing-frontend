import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import './AuthScreens.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    father_name: '',
    phone: '',
    username: '',
    city: '',
    state: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await authService.signup(formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="login-page-wrapper">
      <button className="btn-back-floating" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <div className="mobile-header-blue">
        <div className="login-logo-top">
          <img src="balaji logo.jpeg" alt="Balaji Logo" />
        </div>
        <h1 className="mobile-welcome-title">Create Account</h1>
        <p className="mobile-welcome-subtitle">Start Your Learning Journey</p>
      </div>

      <div className="login-split-container">
        <div className="login-left-side">
          <img src="girl.png" alt="Student Typing" className="girl-typing-image" />
        </div>
        
        <div className="login-right-side">
          <div className="auth-card login-card-custom" style={{ padding: '30px', maxWidth: '450px' }}>
            
            <div className="mobile-tabs">
              <Link to="/login" className="mobile-tab">Login</Link>
              <div className="mobile-tab active">Register</div>
            </div>

            <div className="desktop-only-header">
              <div className="user-icon-top" style={{ margin: '-15px auto 15px', width: '60px', height: '60px' }}>
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              
              <div className="login-title-row" style={{ marginBottom: '20px' }}>
                <div className="login-line"></div>
                <h2>SIGN UP</h2>
                <div className="login-line"></div>
              </div>
            </div>
            
            <form className="auth-form login-form-custom" onSubmit={handleSignup}>
              {error && <div className="auth-error" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}
              
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="input-group login-input-group" style={{ flex: 1, marginBottom: '15px' }}>
                  <span className="input-icon left-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input type="text" name="name" placeholder="Student Name" required onChange={handleChange} className="icon-input" style={{ padding: '12px 15px 12px 40px' }} />
                </div>
                
                <div className="input-group login-input-group" style={{ flex: 1, marginBottom: '15px' }}>
                  <span className="input-icon left-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input type="text" name="father_name" placeholder="Father Name" onChange={handleChange} className="icon-input" style={{ padding: '12px 15px 12px 40px' }} />
                </div>
              </div>

              <div className="input-group login-input-group" style={{ marginBottom: '15px' }}>
                <span className="input-icon left-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                </span>
                <input type="tel" name="phone" placeholder="Phone Number" pattern="[0-9]{10}" required onChange={handleChange} className="icon-input" style={{ padding: '12px 15px 12px 40px' }} />
              </div>

              <div className="input-group login-input-group" style={{ marginBottom: '15px' }}>
                <span className="input-icon left-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <input type="text" name="username" placeholder="Email ID / Username" required onChange={handleChange} className="icon-input" style={{ padding: '12px 15px 12px 40px' }} />
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="input-group login-input-group" style={{ flex: 1, marginBottom: '15px' }}>
                  <span className="input-icon left-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </span>
                  <input type="text" name="city" placeholder="City" required onChange={handleChange} className="icon-input" style={{ padding: '12px 15px 12px 40px' }} />
                </div>
                
                <div className="input-group login-input-group" style={{ flex: 1, marginBottom: '15px' }}>
                  <span className="input-icon left-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                      <line x1="8" y1="2" x2="8" y2="18"></line>
                      <line x1="16" y1="6" x2="16" y2="22"></line>
                    </svg>
                  </span>
                  <select name="state" required onChange={handleChange} className="icon-input" style={{ padding: '12px 15px 12px 40px', appearance: 'none' }}>
                    <option value="">State</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="UP">Uttar Pradesh</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="input-group login-input-group" style={{ marginBottom: '15px' }}>
                <span className="input-icon left-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="Password" 
                  minLength={6} 
                  required 
                  onChange={handleChange} 
                  className="icon-input" 
                  style={{ padding: '12px 15px 12px 40px' }} 
                />
                <span className="input-icon right-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </span>
              </div>

              <div className="input-group login-input-group" style={{ marginBottom: '20px' }}>
                <span className="input-icon left-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  name="confirmPassword" 
                  placeholder="Confirm Password" 
                  minLength={6} 
                  required 
                  onChange={handleChange} 
                  className="icon-input" 
                  style={{ padding: '12px 15px 12px 40px' }} 
                />
                <span className="input-icon right-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  )}
                </span>
              </div>
              
              <div className="login-actions">
                <button type="submit" className="btn-primary btn-login-custom">Sign Up</button>
              </div>
              
              <div className="auth-footer login-footer-custom" style={{ marginTop: '15px' }}>
                <p className="no-account-text" style={{ margin: 0 }}>Already Have An Account ? <Link to="/login" className="link-register">Signin</Link></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
