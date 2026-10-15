import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserIcon, UsersIcon, SmartphoneIcon, MailIcon, MapPinIcon, MapIcon, LockIcon, EyeIcon, EyeOffIcon, GiftIcon } from 'lucide-react';
import { authService, referralService } from '../services/api';
import AuthShell, { AuthField, authInputClass } from '../layouts/AuthShell';

const STATES = [
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Maharashtra', label: 'Maharashtra' },
  { value: 'Rajasthan', label: 'Rajasthan' },
  { value: 'UP', label: 'Uttar Pradesh' },
  { value: 'Other', label: 'Other' },
];

function PasswordToggle({ shown, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-150 hover:text-slate-600">
      {shown ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
    </button>
  );
}

const Signup = () => {
  const navigate = useNavigate();
  // Refer & Earn: /signup?ref=CODE from a friend's referral link.
  const [params] = useSearchParams();
  const refCode = (params.get('ref') || '').trim().toUpperCase();
  const [referral, setReferral] = useState(null);
  useEffect(() => {
    if (!refCode) return;
    referralService.check(refCode).then((r) => setReferral(r?.valid ? r : null)).catch(() => {});
  }, [refCode]);
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
      await authService.signup(referral ? { ...formData, ref: refCode } : formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    }
  };

  return (
    <AuthShell heading="Student Self Registration" subheading="Create your account to start learning" backTo={-1}>
      <form onSubmit={handleSignup} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="font-display text-[17px] font-bold text-navy-800">Sign Up</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">Create your student account</p>

        {referral &&
          <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
            <GiftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Invited by <b>{referral.referrer}</b>{referral.discount_pct ? <> — you get <b>{referral.discount_pct}% off</b> your first plan.</> : '.'}</span>
          </div>
        }

        {error &&
          <div role="alert" className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[12.5px] font-medium text-danger">
            {error}
          </div>
        }

        <div className="mt-4 space-y-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <AuthField id="name" label="Student Name" icon={UserIcon} required>
              <input id="name" type="text" name="name" required placeholder="Enter your full name"
                value={formData.name} onChange={handleChange} className={authInputClass} />
            </AuthField>
            <AuthField id="father_name" label="Father Name" icon={UsersIcon}>
              <input id="father_name" type="text" name="father_name" placeholder="Enter father's name"
                value={formData.father_name} onChange={handleChange} className={authInputClass} />
            </AuthField>
          </div>

          <AuthField id="phone" label="Mobile Number" icon={SmartphoneIcon} required>
            <input id="phone" type="tel" name="phone" pattern="[0-9]{10}" required placeholder="Enter 10 digit mobile number"
              value={formData.phone} onChange={handleChange} className={authInputClass} />
          </AuthField>

          <AuthField id="username" label="Email ID / Username (Login ID)" icon={MailIcon} required help="This will be your Login ID">
            <input id="username" type="text" name="username" required autoComplete="username" placeholder="Enter your email or choose a username"
              value={formData.username} onChange={handleChange} className={authInputClass} />
          </AuthField>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <AuthField id="city" label="City" icon={MapPinIcon} required>
              <input id="city" type="text" name="city" required placeholder="Enter your city"
                value={formData.city} onChange={handleChange} className={authInputClass} />
            </AuthField>
            <AuthField id="state" label="State" icon={MapIcon} required>
              <select id="state" name="state" required value={formData.state} onChange={handleChange}
                className={`${authInputClass} appearance-none`}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </AuthField>
          </div>

          <AuthField
            id="password"
            label="Password"
            icon={LockIcon}
            required
            trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword(!showPassword)} label="password" />}>
            <input id="password" type={showPassword ? 'text' : 'password'} name="password" minLength={6} required
              autoComplete="new-password" placeholder="Create a password"
              value={formData.password} onChange={handleChange} className={`${authInputClass} pr-10`} />
          </AuthField>

          <AuthField
            id="confirmPassword"
            label="Confirm Password"
            icon={LockIcon}
            required
            trailing={<PasswordToggle shown={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} label="confirm password" />}>
            <input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" minLength={6} required
              autoComplete="new-password" placeholder="Confirm your password"
              value={formData.confirmPassword} onChange={handleChange} className={`${authInputClass} pr-10`} />
          </AuthField>
        </div>

        <button
          type="submit"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-[#7C3AED] py-3 text-[13.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#6D28D9]">
          <UsersIcon className="h-4 w-4" aria-hidden="true" /> Create My Account
        </button>

        <p className="mt-3 text-center text-[12.5px] text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">Login Here</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default Signup;
