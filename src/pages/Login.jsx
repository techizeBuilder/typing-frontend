import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserIcon, LockIcon, EyeIcon, EyeOffIcon, LogInIcon, GiftIcon } from 'lucide-react';
import { authService } from '../services/api';
import AuthShell, { AuthField, authInputClass } from '../layouts/AuthShell';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    <AuthShell heading="Welcome Back!" subheading="Login to continue your learning journey" backTo="/">
      <form onSubmit={handleLogin} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-display text-[17px] font-bold text-navy-800">Login</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">Sign in to your student or admin account</p>

        {error &&
          <div role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[12.5px] font-medium text-danger">
            {error}
          </div>
        }

        <div className="mt-4 space-y-3.5">
          <AuthField id="username" label="User ID / Phone Number / Email" icon={UserIcon} required>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              placeholder="Enter your User ID or Phone Number"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={authInputClass} />
          </AuthField>

          <AuthField
            id="password"
            label="Password"
            icon={LockIcon}
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-150 hover:text-slate-600">
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            }>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-10`} />
          </AuthField>
        </div>

        <div className="mt-2 text-right">
          <a href="#" className="text-[12px] font-medium text-primary hover:underline">Forget Password?</a>
        </div>

        <button
          type="submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-[13.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-700">
          <LogInIcon className="h-4 w-4" aria-hidden="true" /> Login
        </button>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-800">
          <GiftIcon className="h-4 w-4" aria-hidden="true" /> Get 30% Discount On Registration
        </div>

        <p className="mt-3 text-center text-[12.5px] text-slate-600">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-primary hover:underline">Sign up</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default Login;
