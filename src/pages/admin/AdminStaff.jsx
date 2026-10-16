import { useEffect, useState } from 'react';
import { CrownIcon, KeyRoundIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon, ShieldCheckIcon, UserCogIcon, UsersIcon, XIcon } from 'lucide-react';
import { userService } from '../../services/api';
import Pagination from '../../components/Pagination';
import { PageHeading } from '../../ui/PageHeading';
import { StatCard } from '../../ui/StatCard';

const AVAILABLE_MODULES = [
  { id: 'students', label: 'Manage Students' },
  { id: 'exams', label: 'Manage Exams' },
  { id: 'chapters', label: 'Add Chapter (Content)' },
  { id: 'messages', label: 'Message Center' },
  { id: 'flash_banner', label: 'Flash Banner' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'support', label: 'Support Tickets' },
  { id: 'reviews', label: 'Student Reviews' },
  { id: 'magazines', label: 'PDF Magazines' },
  { id: 'plans', label: 'Subscription & Plan' },
];
const MODULE_LABEL = Object.fromEntries(AVAILABLE_MODULES.map((m) => [m.id, m.label]));
const ROLE_TONE = { SuperAdmin: 'bg-amber-50 text-amber-800', Admin: 'bg-primary-50 text-primary-700', 'Sub-Admin': 'bg-slate-100 text-slate-600' };
const EMPTY = { id: '', name: '', user_id: '', phone: '', password_hash: '', designation: '', status: 'Active', permissions: [] };
const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[12.5px] text-navy-800 outline-none focus:border-primary disabled:bg-slate-50';
const labelCls = 'mb-1 block text-[11.5px] font-semibold text-navy-800';

function StaffForm({ member, onClose, onSaved }) {
  const isEditing = !!member;
  const [formData, setFormData] = useState(() => (member ? {
    id: member.id, name: member.name, user_id: member.user_id, phone: member.phone, password_hash: '', // leave empty to not change
    designation: member.designation || '', status: member.status || 'Active', permissions: member.permissions || [],
  } : EMPTY));
  const [saving, setSaving] = useState(false);
  const fullAccess = isEditing && member.role !== 'Sub-Admin';
  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
  const toggle = (id) => setFormData((prev) => ({ ...prev, permissions: prev.permissions.includes(id) ? prev.permissions.filter((p) => p !== id) : [...prev.permissions, id] }));
  const allOn = AVAILABLE_MODULES.every((m) => formData.permissions.includes(m.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name, user_id: formData.user_id, phone: formData.phone, designation: formData.designation,
      status: formData.status, permissions: formData.permissions,
    };
    // New accounts are Sub-Admins. Editing keeps the existing role — the old form
    // always sent 'Sub-Admin', which demoted an Admin whose details were edited.
    if (!isEditing) payload.role = 'Sub-Admin';
    if (formData.password_hash) payload.password_hash = formData.password_hash;
    setSaving(true);
    try {
      if (isEditing) await userService.updateUser(formData.id, payload);
      else await userService.createUser(payload);
      onSaved(isEditing ? `Saved ${formData.name}.` : `${formData.name} added as Sub-Admin.`);
    } catch (err) {
      alert('Error saving staff member: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true" aria-labelledby="staff-title">
      <form onSubmit={handleSubmit} className="nd flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center border-b border-slate-100 px-5 py-3.5">
          <h3 id="staff-title" className="text-[15px] font-bold text-navy-800">{isEditing ? `Edit ${member.role}: ${member.name}` : 'Add Sub-Admin'}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button>
        </div>
        <div className="scroll-thin flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3.5">
              <legend className="px-1 text-[12.5px] font-bold text-navy-800">Basic Info</legend>
              <label className="block"><span className={labelCls}>Full Name <span className="text-danger">*</span></span><input type="text" required value={formData.name} onChange={set('name')} className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Designation (Title)</span><input type="text" placeholder="e.g. Content Manager" value={formData.designation} onChange={set('designation')} className={inputCls} /></label>
              <label className="block"><span className={labelCls}>Phone Number <span className="text-danger">*</span></span><input type="text" required value={formData.phone} onChange={set('phone')} className={inputCls} /></label>
            </fieldset>
            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3.5">
              <legend className="px-1 text-[12.5px] font-bold text-navy-800">Account Details</legend>
              <label className="block"><span className={labelCls}>Username / Login ID <span className="text-danger">*</span></span><input type="text" required disabled={isEditing} value={formData.user_id} onChange={set('user_id')} className={`${inputCls} font-mono`} /></label>
              <label className="block"><span className={labelCls}>Password {isEditing ? '(leave blank to keep unchanged)' : <span className="text-danger">*</span>}</span><input type="text" required={!isEditing} value={formData.password_hash} onChange={set('password_hash')} className={inputCls} autoComplete="new-password" /></label>
              <label className="block"><span className={labelCls}>Status</span>
                <select value={formData.status} onChange={set('status')} className={inputCls}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
            </fieldset>
          </div>
          <fieldset className="rounded-lg border border-slate-200 p-3.5">
            <legend className="px-1 text-[12.5px] font-bold text-navy-800">Module Permissions</legend>
            {fullAccess
              ? <p className="text-[12px] text-slate-600">{member.role} accounts can open every module; these permissions only apply to Sub-Admins.</p>
              : <p className="mb-2.5 text-[12px] text-slate-500">Select which admin modules this sub-admin can access:</p>}
            <label className="mb-2 flex w-fit items-center gap-2 text-[12px] font-semibold text-primary">
              <input type="checkbox" checked={allOn} onChange={() => setFormData((p) => ({ ...p, permissions: allOn ? [] : AVAILABLE_MODULES.map((m) => m.id) }))} className="h-4 w-4 accent-primary" /> Select All
            </label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {AVAILABLE_MODULES.map((mod) => {
                const on = formData.permissions.includes(mod.id);
                return (
                  <label key={mod.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[12px] ${on ? 'border-primary bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-700'}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(mod.id)} className="h-3.5 w-3.5 accent-primary" /> {mod.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Sub-Admin'}</button>
        </div>
      </form>
    </div>
  );
}

const AdminStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined closed, null new, member edit
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchStaff = () => userService.getUsers()
    .then((data) => {
      setStaff(data
        .filter((u) => u.role === 'Sub-Admin' || u.role === 'Admin' || u.role === 'SuperAdmin')
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))); // newest first
      setErrorMsg(null);
    })
    .catch((error) => { console.error('Error fetching staff:', error); setErrorMsg('Failed to load staff list.'); })
    .finally(() => setLoading(false));
  useEffect(() => { fetchStaff(); }, []);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await userService.updateUser(user.id, { status: newStatus });
      fetchStaff();
    } catch {
      alert('Failed to toggle status.');
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = staff.filter((s) => !q || [s.name, s.user_id, s.phone, s.designation].some((v) => v && String(v).toLowerCase().includes(q)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="nd">
      <PageHeading icon={<UserCogIcon className="h-5 w-5" aria-hidden="true" />} title="Staff Management"
        subtitle="Admins, super admins and sub-admins. Sub-admins only see the modules you give them."
        actions={<button type="button" onClick={() => setEditing(null)} className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add Sub-Admin</button>} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<UsersIcon className="h-5 w-5" />} iconBg="#0D6EFD" label="Total Staff" value={staff.length} />
        <StatCard icon={<ShieldCheckIcon className="h-5 w-5" />} iconBg="#198754" label="Active" value={staff.filter((s) => s.status === 'Active').length} />
        <StatCard icon={<CrownIcon className="h-5 w-5" />} iconBg="#6F42C1" label="Admins" value={staff.filter((s) => s.role !== 'Sub-Admin').length} sub="Full access" />
        <StatCard icon={<KeyRoundIcon className="h-5 w-5" />} iconBg="#F59E0B" label="Sub-Admins" value={staff.filter((s) => s.role === 'Sub-Admin').length} sub="Module permissions" />
      </div>

      {errorMsg && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{errorMsg}</p>}
      {notice && <p role="status" className="mb-4 flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="ml-auto"><XIcon className="h-4 w-4" /></button></p>}

      <section className="rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3.5">
          <h3 className="text-[13.5px] font-bold text-navy-800">Staff Members</h3>
          <span className="relative ml-auto block w-full sm:w-[260px]">
            <SearchIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search name, login ID, phone..." aria-label="Search staff" className={`${inputCls} py-1.5 pr-8`} />
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50 text-[11.5px] font-semibold text-slate-600">
              <tr>{['Name', 'Role', 'Designation', 'Username', 'Phone', 'Permissions', 'Status', 'Action'].map((h) => <th key={h} scope="col" className="px-3 py-2.5">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {loading ? <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Loading staff...</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No staff members found.</td></tr>
                  : paged.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 font-semibold text-navy-800">{s.name}</td>
                      <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${ROLE_TONE[s.role] || ROLE_TONE['Sub-Admin']}`}>{s.role}</span></td>
                      <td className="px-3 py-2.5 text-slate-600">{s.designation || 'Staff'}</td>
                      <td className="px-3 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-[2px] font-mono text-[11px] text-primary-700">{s.user_id}</span></td>
                      <td className="px-3 py-2.5 text-slate-600">{s.phone}</td>
                      <td className="max-w-[300px] px-3 py-2.5">
                        {s.role !== 'Sub-Admin' ? <span className="text-[11px] font-medium text-violet-700">All modules</span>
                          : (s.permissions || []).length === 0 ? <span className="text-[11px] text-slate-400">None</span>
                            : <span className="flex flex-wrap gap-1">{(s.permissions || []).map((p) => <span key={p} className="rounded bg-primary-50 px-1.5 py-[1px] text-[10px] text-primary-700">{MODULE_LABEL[p] || p}</span>)}</span>}
                      </td>
                      <td className="px-3 py-2.5"><span className={`rounded px-2 py-[2px] text-[10.5px] font-semibold ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{s.status}</span></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setEditing(s)} title="Edit & Permissions" aria-label={`Edit ${s.name}`} className="rounded p-1.5 text-slate-500 hover:bg-primary-50 hover:text-primary"><PencilIcon className="h-4 w-4" /></button>
                          <button type="button" onClick={() => handleToggleStatus(s)} title={s.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label={`${s.status === 'Active' ? 'Deactivate' : 'Activate'} ${s.name}`} className={`rounded p-1.5 hover:bg-slate-100 ${s.status === 'Active' ? 'text-emerald-600' : 'text-slate-400'}`}><PowerIcon className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-3.5 pb-1 pt-3">
          <Pagination page={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(p) => { setPageSize(p); setPage(1); }} />
        </div>
      </section>

      {editing !== undefined && <StaffForm member={editing} onClose={() => setEditing(undefined)} onSaved={(msg) => { setEditing(undefined); setNotice(msg); fetchStaff(); }} />}
    </div>
  );
};

export default AdminStaff;
