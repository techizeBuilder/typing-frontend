import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BookOpenIcon, CalendarClockIcon, CameraIcon, CheckCircle2Icon, ClockIcon, KeyRoundIcon, MapPinIcon, MonitorIcon, MonitorSmartphoneIcon,
  NotebookPenIcon, RotateCcwIcon, SaveIcon, ShieldCheckIcon, UserIcon, UserPlusIcon, WandIcon,
} from 'lucide-react';
import { userService } from '../../services/api';
import { PageHeading } from '../../ui/PageHeading';
import { INDIAN_STATES } from '../../features/students/indianStates';
import {
  ALL_CATEGORIES, STATUSES, TIME_ZONES, blankStudent, buildCreatePayload, buildUpdatePayload, errorText, photoUrl, studentToForm,
} from '../../features/students/studentData';

const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none transition-colors duration-150 focus:border-primary disabled:bg-slate-50';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';

function Card({ icon: Icon, title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-card ${className}`}>
      <h3 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy-800">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> {title}
      </h3>
      {children}
    </section>
  );
}

// Option card used for Login Window and Login Type (a styled radio button).
function ChoiceCard({ name, icon: Icon, title, text, checked, onChange }) {
  return (
    <label className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-3 py-3 text-center transition-colors duration-150 ${
      checked ? 'border-primary bg-primary-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {checked && <CheckCircle2Icon className="absolute right-2 top-2 h-4 w-4 text-primary" aria-hidden="true" />}
      <Icon className={`h-5 w-5 ${checked ? 'text-primary' : 'text-slate-500'}`} aria-hidden="true" />
      <span className="text-[12.5px] font-bold text-navy-800">{title}</span>
      <span className="text-[11px] leading-snug text-slate-500">{text}</span>
    </label>
  );
}

// Single-device status: which device the account is locked to, and the reset.
function DevicePanel({ student, wasSingle, onReset, resetting, message }) {
  const bound = wasSingle && student?.device_bound_at;
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">
      {bound ?
        <div className="flex flex-wrap items-center gap-2">
          <MonitorSmartphoneIcon className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Registered device: <b className="text-navy-800">{student.device_info || 'Unknown device'}</b>, since {new Date(student.device_bound_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
          <button type="button" onClick={onReset} disabled={resetting} className="ml-auto flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-navy-800 hover:bg-slate-100 disabled:opacity-60">
            <RotateCcwIcon className="h-3.5 w-3.5" aria-hidden="true" /> {resetting ? 'Resetting…' : 'Reset Device'}
          </button>
        </div> :
        <span>No device registered yet — the first device the student logs in on will be registered. Other devices are refused until you reset it here.</span>}
      {message && <p role="status" className="mt-1.5 font-semibold text-emerald-700">{message}</p>}
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-slate-500">{hint}</span>}
    </label>
  );
}

export default function AdminStudentForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [form, setForm] = useState(blankStudent);
  const [student, setStudent] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fixedWindow, setFixedWindow] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    let cancelled = false;
    userService.getUser(id)
      .then((s) => {
        if (cancelled) return;
        if (!s) { setError('Student not found.'); return; }
        setStudent(s);
        setForm(studentToForm(s));
        setFixedWindow(!!(s.allowed_login_time_start && s.allowed_login_time_end));
      })
      .catch((err) => { if (!cancelled) setError(errorText(err, 'Could not load the student.')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [editing, id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleCategory = (cat) => setForm((f) => ({
    ...f, selectedCategories: f.selectedCategories.includes(cat) ? f.selectedCategories.filter((c) => c !== cat) : [...f.selectedCategories, cat],
  }));
  const setWindow = (fixed) => {
    setFixedWindow(fixed);
    if (!fixed) setForm((f) => ({ ...f, allowed_login_time_start: '', allowed_login_time_end: '', login_timezone: '' }));
  };
  const [resetting, setResetting] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState('');
  const resetDevice = async () => {
    if (!window.confirm(`Reset the registered device for ${student?.name || 'this student'}? They can then log in on a new device, and the old device is signed out.`)) return;
    setResetting(true); setDeviceMsg(''); setError('');
    try {
      await userService.resetDevice(id);
      setStudent((s) => ({ ...s, device_info: null, device_bound_at: null }));
      setDeviceMsg('Device reset. The next device the student logs in on will be registered.');
    } catch (err) {
      setError(errorText(err, 'Could not reset the device.'));
    } finally {
      setResetting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.selectedCategories.length === 0) { setError('Please select at least one course.'); return; }
    if (!form.name.trim() || !form.phone.trim()) { setError('Student name and phone are required.'); return; }
    if (fixedWindow && (!form.allowed_login_time_start || !form.allowed_login_time_end)) { setError('Enter both login times, or choose Anytime.'); return; }
    setSaving(true);
    try {
      let savedId = id;
      if (editing) await userService.updateUser(id, buildUpdatePayload(form));
      else savedId = (await userService.createUser(buildCreatePayload(form)))?.id;
      let notice = editing ? `Saved changes to ${form.name}.` : `Student ${form.name} created.`;
      if (photo && savedId) {
        try { await userService.uploadUserAvatar(savedId, photo); } catch (err) { notice += ` The photo was not saved: ${errorText(err, 'upload failed')}`; }
      }
      navigate('/admin/students', { state: { notice } });
    } catch (err) {
      setError(errorText(err, editing ? 'Could not save the student.' : 'Could not create the student.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const generatePassword = () => setForm((f) => ({ ...f, password_hash: Math.random().toString(36).slice(-8) }));
  const preview = photo ? URL.createObjectURL(photo) : photoUrl(student?.profile_image);
  const title = editing ? `Edit Student${student ? `: ${student.name}` : ''}` : 'Add New Student';

  if (loading) return <div className="nd p-6 text-[12.5px] text-slate-500">Loading student…</div>;

  return (
    <div className="nd">
      <PageHeading
        icon={editing ? <UserIcon className="h-5 w-5" /> : <UserPlusIcon className="h-5 w-5" />}
        title={title}
        subtitle={editing ? 'Update the student’s details, access and limits.' : 'Fill the details below to add a new student.'}
        crumbs={[{ label: 'Students Management', to: '/admin/students' }, { label: editing ? 'Edit Student' : 'Add Student' }]} />

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
          <Card icon={UserIcon} title="Personal Details">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Student Name" required><input type="text" required value={form.name} onChange={set('name')} placeholder="Enter full name" className={inputCls} /></Field>
              <Field label="Father’s / Guardian Name"><input type="text" value={form.fathers_name} onChange={set('fathers_name')} placeholder="Enter name" className={inputCls} /></Field>
              <Field label="Mobile Number" required><input type="tel" required value={form.phone} onChange={set('phone')} placeholder="10 digit mobile number" className={inputCls} /></Field>
              <Field label="Parent / Guardian Mobile"><input type="tel" value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="10 digit mobile number" className={inputCls} /></Field>
              <Field label="Email ID"><input type="email" value={form.email} onChange={set('email')} placeholder="name@example.com" className={inputCls} /></Field>
              <Field label="Roll No."><input type="text" value={form.roll_no} onChange={set('roll_no')} placeholder="Enter roll number" className={inputCls} /></Field>
            </div>
          </Card>

          <Card icon={CameraIcon} title="Student Photo">
            <div className="flex flex-col items-center gap-3 text-center">
              {preview
                ? <img src={preview} alt="" className="h-28 w-28 rounded-full border border-slate-200 object-cover" />
                : <span className="grid h-28 w-28 place-items-center rounded-full bg-slate-100 text-slate-400"><UserIcon className="h-10 w-10" aria-hidden="true" /></span>}
              <label className="cursor-pointer rounded-md bg-primary px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-primary-700">
                {preview ? 'Change Photo' : 'Upload Photo'}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
              </label>
              <span className="text-[10.5px] text-slate-500">JPG, PNG, WEBP or GIF (max 2 MB)</span>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card icon={MapPinIcon} title="Address">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <div className="sm:col-span-3"><Field label="Address"><textarea rows={2} value={form.address} onChange={set('address')} placeholder="Enter address" className={inputCls} /></Field></div>
              <Field label="City"><input type="text" value={form.city} onChange={set('city')} placeholder="Enter city" className={inputCls} /></Field>
              <Field label="State">
                <input type="text" list="student-state-list" value={form.state} onChange={set('state')} placeholder="Type or pick" className={inputCls} />
                <datalist id="student-state-list">{INDIAN_STATES.map((st) => <option key={st} value={st} />)}</datalist>
              </Field>
              <Field label="Pin Code"><input type="text" inputMode="numeric" maxLength={6} value={form.pin_code} onChange={set('pin_code')} placeholder="6 digits" className={inputCls} /></Field>
            </div>
          </Card>

          <Card icon={BookOpenIcon} title="Course & Fees">
            <span className={labelCls}>Course / Type <span className="text-danger">*</span></span>
            <div className="mb-3.5 flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const on = form.selectedCategories.includes(cat);
                return (
                  <label key={cat} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] font-medium ${on ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-300 text-slate-600'}`}>
                    <input type="checkbox" checked={on} onChange={() => toggleCategory(cat)} className="h-3.5 w-3.5 accent-primary" /> {cat}
                  </label>
                );
              })}
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Fees Amount (₹)"><input type="number" step="0.01" min="0" value={form.fees_amount} onChange={set('fees_amount')} className={inputCls} /></Field>
              <Field label="Last Fees Submitted"><input type="date" value={form.last_fees_submitted_date} onChange={set('last_fees_submitted_date')} className={inputCls} /></Field>
              <Field label="Validity End Date" hint="Empty = no expiry"><input type="date" value={form.validity_end} onChange={set('validity_end')} className={inputCls} /></Field>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card icon={ShieldCheckIcon} title="Login & Access">
            <div className="grid gap-3.5 sm:grid-cols-2">
              {editing
                ? <Field label="Username (Login ID)" hint="The student signs in with this."><input type="text" value={form.user_id || form.phone} disabled className={`${inputCls} font-mono`} /></Field>
                : <Field label="Username (Login ID)" hint="Leave empty to use the mobile number."><input type="text" value={form.user_id} onChange={set('user_id')} placeholder="Defaults to mobile number" className={inputCls} /></Field>}
              <Field label="Status">
                <select value={form.status} onChange={set('status')} className={inputCls}>
                  {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                </select>
              </Field>
              <Field label={editing ? 'Override Password' : 'Password'} required={!editing} hint={editing ? 'Leave blank to keep the current password.' : undefined}>
                <span className="flex gap-2">
                  <input type="text" required={!editing} value={form.password_hash} onChange={set('password_hash')} placeholder={editing ? 'Leave blank to keep unchanged' : 'Enter password'} className={inputCls} autoComplete="new-password" />
                  <button type="button" onClick={generatePassword} title="Generate a random password" className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2.5 text-[11.5px] text-slate-600 hover:bg-slate-50">
                    <WandIcon className="h-3.5 w-3.5" aria-hidden="true" /> Generate
                  </button>
                </span>
              </Field>
            </div>

            <fieldset className="mt-4">
              <legend className={labelCls}>Login Window <span className="text-danger">*</span></legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <ChoiceCard name="loginWindow" icon={ClockIcon} title="Anytime" text="Student can log in any time" checked={!fixedWindow} onChange={() => setWindow(false)} />
                <ChoiceCard name="loginWindow" icon={CalendarClockIcon} title="Fixed Time" text="Student can log in only in the selected time slot" checked={fixedWindow} onChange={() => setWindow(true)} />
              </div>
            </fieldset>
            {fixedWindow &&
              <div className="mt-3 grid gap-3.5 sm:grid-cols-3">
                <Field label="From Time"><input type="time" value={form.allowed_login_time_start} onChange={set('allowed_login_time_start')} className={inputCls} /></Field>
                <Field label="To Time" hint="May end after midnight, e.g. 22:00 – 02:00."><input type="time" value={form.allowed_login_time_end} onChange={set('allowed_login_time_end')} className={inputCls} /></Field>
                <Field label="Time Zone (optional)">
                  <select value={form.login_timezone} onChange={set('login_timezone')} className={inputCls}>
                    <option value="">India (IST) — default</option>
                    {TIME_ZONES.filter(([v]) => v !== 'Asia/Kolkata').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
            }

            <fieldset className="mt-4">
              <legend className={labelCls}>Login Type <span className="text-danger">*</span></legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <ChoiceCard name="loginType" icon={MonitorIcon} title="Single Device" text="Student can log in on one device only" checked={form.login_type === 'Single'} onChange={() => setForm((f) => ({ ...f, login_type: 'Single' }))} />
                <ChoiceCard name="loginType" icon={MonitorSmartphoneIcon} title="Multiple Device" text="Student can log in on multiple devices" checked={form.login_type !== 'Single'} onChange={() => setForm((f) => ({ ...f, login_type: 'Multiple' }))} />
              </div>
            </fieldset>
            {form.login_type === 'Single' &&
              <DevicePanel student={editing ? student : null} wasSingle={editing && student?.login_type === 'Single'} onReset={resetDevice} resetting={resetting} message={deviceMsg} />}
          </Card>

          <Card icon={KeyRoundIcon} title="Test Limits">
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field label="Live Tests / Day" hint="Empty = default 1"><input type="number" min="0" value={form.live_tests_limit} onChange={set('live_tests_limit')} className={inputCls} /></Field>
              <Field label="Pre-load Tests" hint="Empty = default 10"><input type="number" min="0" value={form.preload_tests_limit} onChange={set('preload_tests_limit')} className={inputCls} /></Field>
              <Field label="Steno Tests" hint="Empty = default 10"><input type="number" min="0" value={form.steno_tests_limit} onChange={set('steno_tests_limit')} className={inputCls} /></Field>
            </div>
          </Card>
        </div>

        <Card icon={NotebookPenIcon} title="Remarks (admin only)">
          <textarea rows={2} value={form.remarks} onChange={set('remarks')} placeholder="Notes about this student — not shown to the student" className={inputCls} />
        </Card>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur">
          <p className="text-[11.5px] text-slate-500">Fields marked <span className="text-danger">*</span> are required.</p>
          <div className="ml-auto flex gap-2">
            <Link to="/admin/students" className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
            {!editing && <button type="button" onClick={() => { setForm(blankStudent()); setPhoto(null); setFixedWindow(false); }} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Reset</button>}
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
              <SaveIcon className="h-4 w-4" aria-hidden="true" /> {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Student'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
