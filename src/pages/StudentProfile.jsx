import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService, resultService } from '../services/api';
import { API_BASE_URL } from '../config';
import DashboardNav from '../components/DashboardNav';
import Header from '../components/Header';
import './StudentProfile.css';
import './StudentDashboard.css';

const StudentProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    fathers_name: '',
    phone: '',
    city: '',
    state: '',
    password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userData = await userService.getProfile();
      setUser(userData);
      setFormData({
        name: userData.name || '',
        fathers_name: userData.fathers_name || '',
        phone: userData.phone || '',
        city: userData.city || '',
        state: userData.state || '',
        password: '',
        confirm_password: ''
      });

      const userId = localStorage.getItem('userId');
      if (userId) {
        const resultData = await resultService.getUserResults(userId);
        setResults(resultData);
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password && formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: formData.name,
        fathers_name: formData.fathers_name,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
      };

      if (formData.password) {
        updateData.password_hash = formData.password;
      }

      await userService.updateProfile(updateData);
      setSuccess('Profile updated successfully!');
      setFormData({ ...formData, password: '', confirm_password: '' });
      setIsEditing(false);
      fetchData();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);

    try {
      setLoading(true);
      await userService.uploadAvatar(fd);
      setSuccess('Profile picture updated!');
      fetchData();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload profile picture.');
      setLoading(false);
    }
  };

  // Calculate Stats
  const highestSpeed = results.length > 0 ? Math.max(...results.map(r => r.nwpm || 0)) : 0;
  const avgSpeed = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + (r.nwpm || 0), 0) / results.length) : 0;
  const highestAccuracy = results.length > 0 ? Math.max(...results.map(r => parseFloat(r.accuracy) || 0)) : 0;
  
  let totalMinutes = 0;
  results.forEach(r => {
    if (r.time_elapsed) {
      // time_elapsed might be in MM:SS format, let's just approximate 1 min per test if it's too complex
      totalMinutes += 1; // Simplified for now
    }
  });

  if (loading && !user) return <div className="profile-loading">Loading...</div>;

  return (
    <div className="dashboard-page-container">
      <Header />
      
      {/* Blue Welcome Bar */}
      <div className="dashboard-welcome-bar">
        <div className="welcome-text-content">
          <h2>My Account</h2>
          <p>Manage your profile, subscription and typing performance.</p>
        </div>
      </div>

      <div className="dashboard-layout">
        <DashboardNav />
        <div className="dashboard-content saas-profile-container" style={{ backgroundColor: '#f4f7fe' }}>
          
          {/* Top Cards Row */}
          <div className="saas-grid-row-2">
            
            {/* Student Profile Card */}
            <div className="saas-card">
              <div className="saas-card-header">
                <h3>Student Profile</h3>
                <button className="btn-saas-outline" onClick={() => setIsEditing(!isEditing)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
              </div>
              <div className="saas-profile-info">
                <div className="saas-avatar-large" onClick={handleAvatarClick} title="Click to change profile picture">
                  {user?.profile_image ? (
                    <img src={`${API_BASE_URL}${user.profile_image}`} alt="Profile" />
                  ) : (
                    <span>{user?.name ? user.name.charAt(0).toUpperCase() : '👤'}</span>
                  )}
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
                </div>
                <div className="saas-profile-details">
                  <h4>{user?.name}</h4>
                  <p className="saas-text-muted">{user?.user_id} | {user?.fathers_name ? `D/o ${user.fathers_name}` : 'Student'}</p>
                  <p className="saas-text-muted">{user?.phone || '+91 XXXXX XXXXX'}</p>
                  <p className="saas-text-muted" style={{ marginTop: '8px' }}>Member Since: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Subscription Details Card */}
            <div className="saas-card">
              <div className="saas-card-header">
                <h3>Subscription Details</h3>
                <button className="btn-saas-light">View Details</button>
              </div>
              <div className="saas-subscription-grid">
                <div className="subs-item">
                  <span className="subs-label">Plan Name</span>
                  <span className="subs-value text-primary">{user?.category || 'Basic Plan'}</span>
                </div>
                <div className="subs-item">
                  <span className="subs-label">Status</span>
                  <span className={`subs-value badge-${user?.status?.toLowerCase() || 'inactive'}`}>{user?.status || 'Inactive'}</span>
                </div>
                <div className="subs-item">
                  <span className="subs-label">Start Date</span>
                  <span className="subs-value">{user?.validity_start ? new Date(user.validity_start).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="subs-item">
                  <span className="subs-label">Valid Till</span>
                  <span className="subs-value">{user?.validity_end ? new Date(user.validity_end).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Stats Row */}
          <div className="saas-stats-row">
            <div className="saas-stat-card">
              <div className="stat-icon bg-green-light text-green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">Highest Speed</span>
                <span className="stat-value">{highestSpeed} WPM</span>
                <span className="stat-sub">All Time</span>
              </div>
            </div>

            <div className="saas-stat-card">
              <div className="stat-icon bg-blue-light text-blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">Average Speed</span>
                <span className="stat-value">{avgSpeed} WPM</span>
                <span className="stat-sub">All Time Average</span>
              </div>
            </div>

            <div className="saas-stat-card">
              <div className="stat-icon bg-emerald-light text-emerald">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">Highest Accuracy</span>
                <span className="stat-value">{highestAccuracy.toFixed(1)}%</span>
                <span className="stat-sub">All Time</span>
              </div>
            </div>

            <div className="saas-stat-card">
              <div className="stat-icon bg-purple-light text-purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">Tests Attempted</span>
                <span className="stat-value">{results.length}</span>
                <span className="stat-sub">Total Completed</span>
              </div>
            </div>

            <div className="saas-stat-card">
              <div className="stat-icon bg-orange-light text-orange">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">Access Window</span>
                <span className="stat-value" style={{fontSize: '1.2rem'}}>{user?.allowed_login_time_start ? `${user.allowed_login_time_start}-${user.allowed_login_time_end}` : 'Anytime'}</span>
                <span className="stat-sub">Login Timing</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Form Container */}
          {isEditing && (
            <div className="saas-card fade-in" style={{ marginTop: '20px' }}>
              <div className="saas-card-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' }}>
                <h3>Edit Personal Information</h3>
              </div>
              
              {error && <div className="alert-error">{error}</div>}
              {success && <div className="alert-success">{success}</div>}
              
              <form onSubmit={handleSave} className="profile-form saas-form">
                <div className="form-row">
                  <div className="form-group half">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="form-group half">
                    <label>Father's Name</label>
                    <input type="text" name="fathers_name" value={formData.fathers_name} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half">
                    <label>Phone Number</label>
                    <input type="text" name="phone" value={formData.phone} onChange={handleChange} required />
                  </div>
                  <div className="form-group half">
                    <label>City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group" style={{ width: 'calc(50% - 10px)' }}>
                  <label>State</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} />
                </div>

                <h4 style={{ marginTop: '20px', marginBottom: '15px', color: '#0f172a' }}>Change Password</h4>
                <p className="help-text">Leave blank if you don't want to change your password.</p>

                <div className="form-row">
                  <div className="form-group half">
                    <label>New Password</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} minLength="6" />
                  </div>
                  <div className="form-group half">
                    <label>Confirm Password</label>
                    <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} minLength="6" />
                  </div>
                </div>

                <div className="form-actions" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '10px' }}>
                  <button type="button" className="btn-saas-outline" onClick={() => setIsEditing(false)} style={{ marginRight: '10px' }}>Cancel</button>
                  <button type="submit" className="btn-save" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
