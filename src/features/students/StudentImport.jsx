import { useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle2Icon, DownloadIcon, FileSpreadsheetIcon, UploadIcon, XIcon } from 'lucide-react';
import { userService } from '../../services/api';
import { ALL_CATEGORIES, buildCreatePayload, blankStudent, errorText } from './studentData';

// Excel/CSV import for the admin Students page. Each valid row becomes one
// POST /users call (same rules as the Add Student form).

const COLUMNS = [
  ['Name', 'name', true], ['Mobile', 'phone', true], ['Password', 'password_hash', true], ['Login ID', 'user_id'],
  ['Father Name', 'fathers_name'], ['Roll No', 'roll_no'], ['Email', 'email'], ['Guardian Mobile', 'guardian_phone'],
  ['Address', 'address'], ['City', 'city'], ['State', 'state'], ['Pin Code', 'pin_code'],
  ['Course', 'course'], ['Status', 'status'], ['Validity End', 'validity_end'], ['Fees Amount', 'fees_amount'], ['Remarks', 'remarks'],
];
const ALIASES = {
  name: ['name', 'student name', 'full name'], phone: ['mobile', 'phone', 'mobile number', 'phone number'], password_hash: ['password'],
  user_id: ['login id', 'username', 'user id', 'login'], fathers_name: ['father name', "father's name", 'fathers name', 'guardian name'],
  roll_no: ['roll no', 'roll number', 'roll no.'], email: ['email', 'email id'], guardian_phone: ['guardian mobile', 'parent mobile'],
  address: ['address'], city: ['city'], state: ['state'], pin_code: ['pin code', 'pincode', 'pin'], course: ['course', 'course / type', 'category'],
  status: ['status'], validity_end: ['validity end', 'validity', 'valid till'], fees_amount: ['fees amount', 'fees', 'fee'], remarks: ['remarks', 'note'],
};
const COURSE_ALIASES = {
  'typing english': 'Typing English', 'english typing': 'Typing English', 'typing hindi': 'Typing Hindi', 'hindi typing': 'Typing Hindi',
  'steno english': 'Steno English', 'english steno': 'Steno English', 'steno hindi': 'Steno Hindi', 'hindi steno': 'Steno Hindi',
};
const norm = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

const toDate = (v) => {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') { const d = XLSX.SSF.parse_date_code(v); return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null; }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
};

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLUMNS.map(([h]) => h),
    ['Aman Kumar', '9876543210', 'aman@123', '', 'Rakesh Kumar', 'STU0001', 'aman@example.com', '9876500000', '12 MG Road', 'Jaipur', 'Rajasthan', '302001', 'Typing English, Typing Hindi', 'Active', '2027-03-31', '1500', ''],
  ]);
  ws['!cols'] = COLUMNS.map(([h]) => ({ wch: Math.max(12, h.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'students_import_template.xlsx');
}

// Turn sheet rows into checked candidates: { line, data, payload, errors }.
function parseRows(rows, existing) {
  const takenPhones = new Set(existing.map((u) => String(u.phone || '')));
  const takenIds = new Set(existing.map((u) => String(u.user_id || '').toLowerCase()));
  const seenPhones = new Set(); const seenIds = new Set();
  return rows.map((raw, i) => {
    const data = {};
    for (const [key, names] of Object.entries(ALIASES)) {
      const col = Object.keys(raw).find((h) => names.includes(norm(h)));
      data[key] = col == null ? '' : String(raw[col] ?? '').trim();
    }
    const errors = [];
    if (!data.name) errors.push('Name is missing');
    let phone = data.phone.replace(/\D/g, '');
    if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2); // +91 prefix
    if (!/^\d{10}$/.test(phone)) errors.push('Mobile must have 10 digits');
    if (!data.password_hash) errors.push('Password is missing');
    const loginId = (data.user_id || phone).toLowerCase();
    if (takenPhones.has(phone)) errors.push('Mobile already registered');
    if (takenIds.has(loginId)) errors.push('Login ID already taken');
    if (seenPhones.has(phone)) errors.push('Mobile repeated in this file');
    if (seenIds.has(loginId)) errors.push('Login ID repeated in this file');
    seenPhones.add(phone); seenIds.add(loginId);
    const courses = data.course ? data.course.split(/[,;/|]/).map((c) => COURSE_ALIASES[norm(c)] || null) : ['Typing English'];
    if (courses.some((c) => !c)) errors.push(`Unknown course (use ${ALL_CATEGORIES.join(', ')})`);
    const status = data.status ? ['Active', 'Inactive', 'Pending'].find((s) => s.toLowerCase() === norm(data.status)) : 'Active';
    if (!status) errors.push('Status must be Active, Inactive or Pending');
    const validity = toDate(raw[Object.keys(raw).find((h) => ALIASES.validity_end.includes(norm(h)))] ?? data.validity_end);
    if (validity === null) errors.push('Validity End must be a date (YYYY-MM-DD or DD/MM/YYYY)');
    if (data.fees_amount && Number.isNaN(Number(data.fees_amount))) errors.push('Fees Amount must be a number');
    const form = {
      ...blankStudent(), ...data, phone, user_id: data.user_id, status: status || 'Active', validity_end: validity || '',
      selectedCategories: [...new Set(courses.filter(Boolean))],
    };
    delete form.course;
    return { line: i + 2, data: { ...data, phone }, payload: buildCreatePayload(form), errors };
  });
}

export function StudentImportModal({ existing, onClose, onDone }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState(null); // { created, failed: [{line, name, reason}] }

  const readFile = async (file) => {
    setError(''); setRows(null); setOutcome(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true }).filter((r) => Object.values(r).some((v) => String(v).trim() !== ''));
      if (raw.length === 0) { setError('The file has no student rows.'); return; }
      if (raw.length > 2000) { setError('Please import at most 2,000 students per file.'); return; }
      setRows(parseRows(raw, existing));
    } catch {
      setError('Could not read the file. Use the Excel template (.xlsx) or a CSV file.');
    }
  };

  const valid = rows ? rows.filter((r) => r.errors.length === 0) : [];
  const runImport = async () => {
    setRunning(true); setProgress(0);
    let created = 0; const failed = [];
    for (const [i, r] of valid.entries()) {
      try { await userService.createUser(r.payload); created += 1; } catch (err) { failed.push({ line: r.line, name: r.data.name, reason: errorText(err, 'Failed') }); }
      setProgress(i + 1);
    }
    setRunning(false);
    setOutcome({ created, failed });
    if (created > 0) onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" role="dialog" aria-modal="true" aria-labelledby="import-title">
      <div className="nd flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <FileSpreadsheetIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h3 id="import-title" className="text-[15px] font-bold text-navy-800">Import Students</h3>
          <button type="button" onClick={onClose} disabled={running} aria-label="Close" className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100"><XIcon className="h-5 w-5" /></button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto p-5">
          <ol className="mb-4 grid gap-3 sm:grid-cols-3">
            <li className="rounded-lg border border-slate-200 p-3 text-[12px] text-slate-600">
              <b className="mb-1 block text-navy-800">1. Get the template</b>
              Required: Name, Mobile, Password. Course can list several, separated by commas.
              <button type="button" onClick={downloadTemplate} className="mt-2 flex items-center gap-1.5 rounded-md border border-emerald-300 px-2.5 py-1.5 text-[11.5px] font-medium text-emerald-700 hover:bg-emerald-50">
                <DownloadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Download Template
              </button>
            </li>
            <li className="rounded-lg border border-slate-200 p-3 text-[12px] text-slate-600">
              <b className="mb-1 block text-navy-800">2. Choose your file</b>
              Excel (.xlsx, .xls) or CSV, first sheet, one student per row.
              <label className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-[11.5px] font-semibold text-white hover:bg-primary-700">
                <UploadIcon className="h-3.5 w-3.5" aria-hidden="true" /> Choose File
                <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={running} onChange={(e) => { readFile(e.target.files?.[0]); e.target.value = ''; }} />
              </label>
              {fileName && <span className="mt-1 block truncate text-[11px] text-slate-500">{fileName}</span>}
            </li>
            <li className="rounded-lg border border-slate-200 p-3 text-[12px] text-slate-600">
              <b className="mb-1 block text-navy-800">3. Check and import</b>
              Rows with problems are skipped; fix them in the file and import again.
            </li>
          </ol>

          {error && <p role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-danger">{error}</p>}

          {outcome &&
            <div role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
              <p className="flex items-center gap-1.5 font-semibold"><CheckCircle2Icon className="h-4 w-4" aria-hidden="true" /> {outcome.created} student(s) imported.</p>
              {outcome.failed.length > 0 &&
                <ul className="mt-1 list-disc pl-5 text-danger">
                  {outcome.failed.map((f) => <li key={f.line}>Row {f.line} ({f.name}): {f.reason}</li>)}
                </ul>}
            </div>}

          {rows && !outcome &&
            <>
              <p className="mb-2 text-[12.5px] text-navy-800">
                <b>{rows.length}</b> rows read · <b className="text-emerald-700">{valid.length} ready</b>
                {rows.length - valid.length > 0 && <> · <b className="text-danger">{rows.length - valid.length} with problems</b></>}
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] text-left text-[11.5px]">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>{['Row', 'Name', 'Mobile', 'Login ID', 'Course', 'Status', 'Check'].map((h) => <th key={h} scope="col" className="px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 300).map((r) => (
                      <tr key={r.line} className={r.errors.length ? 'bg-rose-50/60' : ''}>
                        <td className="px-3 py-1.5 text-slate-500">{r.line}</td>
                        <td className="px-3 py-1.5 font-medium text-navy-800">{r.data.name || '—'}</td>
                        <td className="px-3 py-1.5">{r.data.phone || '—'}</td>
                        <td className="px-3 py-1.5 font-mono">{r.payload.user_id || '—'}</td>
                        <td className="px-3 py-1.5">{r.payload.category}</td>
                        <td className="px-3 py-1.5">{r.payload.status}</td>
                        <td className="px-3 py-1.5">{r.errors.length ? <span className="text-danger">{r.errors.join('; ')}</span> : <span className="text-emerald-700">OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 300 && <p className="mt-1 text-[11px] text-slate-500">Showing the first 300 rows.</p>}
            </>}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3">
          {running && <span className="text-[12px] text-slate-600">Importing {progress} / {valid.length}…</span>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onClose} disabled={running} className="rounded-md border border-slate-300 px-4 py-2 text-[12.5px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60">{outcome ? 'Close' : 'Cancel'}</button>
            {rows && !outcome &&
              <button type="button" onClick={runImport} disabled={running || valid.length === 0} className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
                Import {valid.length} Student(s)
              </button>}
          </div>
        </div>
      </div>
    </div>
  );
}
