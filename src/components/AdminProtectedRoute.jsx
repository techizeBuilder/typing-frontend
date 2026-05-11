import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token || !['Admin', 'SuperAdmin', 'Sub-Admin'].includes(role)) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        textAlign: 'center'
      }}>
        <h2>Admin Access Required</h2>
        <p>You need admin privileges to access this page</p>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminProtectedRoute;
