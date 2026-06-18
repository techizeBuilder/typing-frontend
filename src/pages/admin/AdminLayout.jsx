import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import './Admin.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const permsStr = localStorage.getItem('permissions');
  const permissions = permsStr ? JSON.parse(permsStr) : [];

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <img src="/balaji logo.jpeg" alt="Balaji TC" style={{ width: '100%', maxHeight: '80px', objectFit: 'contain', borderRadius: '6px' }} />
        </div>
        
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
          {(role === 'Admin' || role === 'SuperAdmin' || permissions.includes('students')) && 
             <NavLink to="/admin/students" className={({isActive}) => isActive ? "active" : ""}>Manage Students</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin' || permissions.includes('exams')) && 
             <NavLink to="/admin/exams" className={({isActive}) => isActive ? "active" : ""}>Manage Exams</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin' || permissions.includes('chapters')) && 
             <NavLink to="/admin/content" className={({isActive}) => isActive ? "active" : ""}>Add Chapter</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin' || permissions.includes('messages')) && 
             <NavLink to="/admin/messages" className={({isActive}) => isActive ? "active" : ""}>Message Center</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin' || permissions.includes('flash_banner')) && 
             <NavLink to="/admin/flash-banner" className={({isActive}) => isActive ? "active" : ""}>Flash Banner</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin' || permissions.includes('staff')) &&
             <NavLink to="/admin/staff" className={({isActive}) => isActive ? "active" : ""}>Staff Management</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin') &&
             <NavLink to="/admin/results" className={({isActive}) => isActive ? "active" : ""}>Results (Typing/Steno)</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin') &&
             <NavLink to="/admin/leaderboard" className={({isActive}) => isActive ? "active" : ""}>🏆 Leaderboard</NavLink>}
          {(role === 'Admin' || role === 'SuperAdmin') &&
             <NavLink to="/admin/settings" className={({isActive}) => isActive ? "active" : ""}>⚙️ Settings</NavLink>}

          <div className="nav-divider"></div>
          <NavLink to="/dashboard" className="nav-secondary">Switch to Student View</NavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="btn-admin-logout">Secure logout</button>
        </div>
      </aside>
      
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
