import { useState, useEffect } from 'react';
import { userService } from '../../services/api'; // we will add create logic via userService or custom axios call since we added POST /users
import axios from 'axios';
import './Admin.css';

const AVAILABLE_MODULES = [
  { id: 'students', label: 'Manage Students' },
  { id: 'exams', label: 'Manage Exams' },
  { id: 'chapters', label: 'Add Chapter (Content)' },
  { id: 'messages', label: 'Message Center' },
  { id: 'flash_banner', label: 'Flash Banner' },
  { id: 'staff', label: 'Staff Management' }
];

const AdminStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    user_id: '',
    phone: '',
    password_hash: '',
    designation: '',
    status: 'Active',
    permissions: []
  });

  const [token] = useState(localStorage.getItem('token'));

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      const staffMembers = data.filter(u => u.role === 'Sub-Admin');
      setStaff(staffMembers);
    } catch (error) {
      console.error('Error fetching staff:', error);
      setErrorMsg('Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await userService.updateUser(user.id, { status: newStatus });
      fetchStaff();
    } catch (err) {
      alert("Failed to toggle status.");
    }
  };

  const handleCheckboxChange = (moduleId) => {
    setFormData(prev => {
      const perms = prev.permissions || [];
      if (perms.includes(moduleId)) {
        return { ...prev, permissions: perms.filter(p => p !== moduleId) };
      } else {
        return { ...prev, permissions: [...perms, moduleId] };
      }
    });
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({
      id: '',
      name: '',
      user_id: '',
      phone: '',
      password_hash: '',
      designation: '',
      status: 'Active',
      permissions: []
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setIsEditing(true);
    setFormData({
      id: user.id,
      name: user.name,
      user_id: user.user_id,
      phone: user.phone,
      password_hash: '', // leave empty to not change
      designation: user.designation || '',
      status: user.status || 'Active',
      permissions: user.permissions || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        user_id: formData.user_id,
        phone: formData.phone,
        designation: formData.designation,
        status: formData.status,
        permissions: formData.permissions,
        role: 'Sub-Admin'
      };

      if (formData.password_hash) {
        payload.password_hash = formData.password_hash;
      }

      if (isEditing) {
        await userService.updateUser(formData.id, payload);
      } else {
        await userService.createUser(payload);
      }
      
      setShowModal(false);
      fetchStaff();
    } catch (err) {
      alert('Error saving staff member: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>Sub-Admin / Staff Management</h2>
        <button className="btn-primary" onClick={openCreateModal}>+ Add Sub-Admin</button>
      </header>

      {errorMsg && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', marginBottom: '10px' }}>
          {errorMsg}
        </div>
      )}

      {showModal && (
        <div className="admin-form-container pattern-setup" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h3>{isEditing ? 'Edit Sub-Admin' : 'Create Sub-Admin'}</h3>
             <button className="btn-secondary" onClick={() => setShowModal(false)}>Close</button>
          </div>
          
          <form onSubmit={handleSubmit} className="admin-grid-form" style={{ marginTop: '15px' }}>
            <div className="form-section">
              <h4>Basic Info</h4>
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Designation (Title)</label>
                <input type="text" placeholder="e.g. Content Manager" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            </div>

            <div className="form-section">
              <h4>Account Details</h4>
              <div className="input-group">
                <label>Username / Login ID</label>
                <input type="text" required disabled={isEditing} value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Password {isEditing && '(Leave blank to keep unchanged)'}</label>
                <input type="text" required={!isEditing} value={formData.password_hash} onChange={e => setFormData({...formData, password_hash: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-section" style={{ gridColumn: '1 / -1' }}>
              <h4>Module Permissions</h4>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>Select which admin modules this sub-admin can access:</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={formData.permissions.includes(mod.id)} 
                      onChange={() => handleCheckboxChange(mod.id)}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions-full">
               <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px' }}>
                 {isEditing ? 'Update Sub-Admin' : 'Create Sub-Admin'}
               </button>
            </div>
          </form>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Designation</th>
            <th>Username</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6">Loading staff...</td></tr>
          ) : staff.length === 0 ? (
            <tr><td colSpan="6">No sub-admins found.</td></tr>
          ) : staff.map(s => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.designation || 'Staff'}</td>
              <td>{s.user_id}</td>
              <td>{s.phone}</td>
              <td>
                <span className={`status-badge ${s.status?.toLowerCase() || 'pending'}`}>
                  {s.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button className="btn-action btn-edit" onClick={() => openEditModal(s)}>Edit & Permissions</button>
                  <button className="btn-action btn-edit" onClick={() => handleToggleStatus(s)}>{s.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminStaff;
