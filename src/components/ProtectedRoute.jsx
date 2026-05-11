import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';

const ProtectedRoute = () => {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const validateToken = () => {
      const token = localStorage.getItem('token');
      
      console.log('ProtectedRoute: Checking token...', !!token);
      
      if (!token) {
        console.log('ProtectedRoute: No token found');
        setIsAuthenticated(false);
        setIsValidating(false);
        return;
      }

      try {
        // Decode JWT to check if it's expired
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        console.log('ProtectedRoute: Token payload:', payload);
        console.log('ProtectedRoute: Token expires at:', new Date(payload.exp * 1000));
        console.log('ProtectedRoute: Current time:', new Date());
        
        if (payload.exp && payload.exp < currentTime) {
          // Token is expired
          console.log('ProtectedRoute: Token expired');
          localStorage.clear();
          setIsAuthenticated(false);
        } else {
          console.log('ProtectedRoute: Token valid');
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Invalid token format
        console.error('ProtectedRoute: Invalid token format:', error);
        localStorage.clear();
        setIsAuthenticated(false);
      }
      
      setIsValidating(false);
    };

    validateToken();
  }, []);

  // Show loading while validating
  if (isValidating) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  // Show access denied message instead of auto-redirect
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Access denied - not authenticated');
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
        <h2>Access Denied</h2>
        <p>Please login to access this page</p>
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

  console.log('ProtectedRoute: Rendering protected content');
  // Render protected content
  return <Outlet />;
};

export default ProtectedRoute;
