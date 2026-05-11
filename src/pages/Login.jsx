import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import './AuthScreens.css';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    
    try {
      console.log('Starting login process...');
      const response = await authService.login(username, password);
      console.log('Login API response:', response);
      
      // Check if login was successful
      if (response.success) {
        // Get role from response or localStorage
        const role = response.user?.role || localStorage.getItem('role');
        const token = localStorage.getItem('token');
        
        console.log('Login successful - Role:', role, 'Token exists:', !!token);
        
        if (!token) {
          throw new Error('Token not saved properly');
        }
        
        // Use React Router navigate (no page refresh)
        if (role === 'Admin' || role === 'SuperAdmin' || role === 'Sub-Admin') {
          console.log('Navigating to admin dashboard...');
          navigate('/admin', { replace: true });
        } else {
          console.log('Navigating to student dashboard...');
          navigate('/dashboard', { replace: true });
        }
      } else {
        throw new Error(response.message || 'Login failed');
      }
        
    } catch (err) {
      console.error('Login error:', err);
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      if (err.response?.status === 401 && msg.toLowerCase().includes('inactive')) {
        window.alert('Login Blocked: ' + msg);
      }
    }
  };

  return (
    <div className="login-page-wrapper">
      <button className="btn-back-floating" onClick={() => navigate('/')}>
        &larr; Back
      </button>

      <div className="mobile-header-blue">
        <div className="login-logo-top">
          <img src="/balaji logo.jpeg" alt="Balaji Logo" />
        </div>
        <h1 className="mobile-welcome-title">Welcome Back!</h1>
        <p className="mobile-welcome-subtitle">Start Your Learning Journey</p>
      </div>

      <div className="login-split-container">
        <div className="login-left-side">
          <img src="/girl.png" alt="Student Typing" className="girl-typing-image" />
        </div>
        
        <div className="login-right-side">
          <div className="auth-card login-card-custom">
            
            <div className="mobile-tabs">
              <div className="mobile-tab active">Login</div>
              <Link to="/signup" className="mobile-tab">Register</Link>
            </div>

            <div className="desktop-only-header">
              <div className="user-icon-top">
                <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              
              <div className="login-title-row">
                <div className="login-line"></div>
                <h2>LOGIN</h2>
                <div className="login-line"></div>
              </div>
            </div>
            
            <form className="auth-form login-form-custom" onSubmit={handleLogin}>
              {error && <div className="auth-error" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}
              
              <div className="input-group login-input-group">
                <span className="input-icon left-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </span>
                <input 
                  type="text" 
                  placeholder={isMobile ? "User Id/Email Id" : "User ID/Phone Number"} 
                  required 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="icon-input"
                />
              </div>
              
              <div className="input-group login-input-group">
                <span className="input-icon left-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="icon-input"
                />
                <span className="input-icon right-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  )}
                </span>
              </div>
              
              <div className="forgot-password-row">
                <a href="#" className="link-forgot-custom">Forget Password?</a>
              </div>
              
              <div className="login-actions">
                <button type="submit" className="btn-primary btn-login-custom">Login</button>
              </div>
              
              <div className="auth-footer login-footer-custom">
                <div className="discount-banner-mobile">
                  <span className="banner-icon">🎉</span>
                  <span className="banner-text">Get 30% Discount On Registration</span>
                  <span className="banner-icon">🎁</span>
                </div>

                <p className="no-account-text">Dont have an account? <Link to="/signup" className="link-register">Sign up</Link></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
