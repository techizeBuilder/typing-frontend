import { useState, useEffect } from 'react';
import { flashBannerService } from '../../services/api';
import Pagination from '../../components/Pagination';
import './Admin.css';

// Swatches from the design; any hex colour can still be picked.
const COLORS = ['#DC3545', '#0D6EFD', '#198754', '#F59E0B', '#6F42C1', '#0EA5E9'];
const EMPTY = { title: '', content: '', link_url: '', color: '#DC3545', start_date: '', end_date: '', is_active: true };
const ROW = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' };
const toDate = (d) => (d ? String(d).slice(0, 10) : '');
const fmt = (d) => (d ? new Date(`${toDate(d)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// What students see right now for this banner.
const liveState = (b) => {
  if (!b.is_active) return ['HIDDEN', 'inactive'];
  const today = new Date().toISOString().slice(0, 10);
  if (b.start_date && toDate(b.start_date) > today) return ['SCHEDULED', 'pending'];
  if (b.end_date && toDate(b.end_date) < today) return ['ENDED', 'inactive'];
  return ['SCROLLING', 'active'];
};

const AdminFlashBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await flashBannerService.getBanners();
      // Newest banners first
      const list = Array.isArray(res) ? res : [];
      setBanners([...list].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    } catch (error) {
      console.error('Error fetching flash banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => { setFormData(EMPTY); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      alert('End date cannot be before the start date.');
      return;
    }
    const payload = {
      ...formData,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };
    setSaving(true);
    try {
      if (editingId) await flashBannerService.updateBanner(editingId, payload);
      else await flashBannerService.createBanner(payload);
      resetForm();
      fetchBanners();
    } catch (error) {
      alert('Error saving flash banner: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setFormData({
      title: b.title || '', content: b.content || '', link_url: b.link_url || '', color: b.color || '#DC3545',
      start_date: toDate(b.start_date), end_date: toDate(b.end_date), is_active: b.is_active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleStatus = async (banner) => {
    try {
      await flashBannerService.updateBanner(banner.id, { is_active: !banner.is_active });
      fetchBanners();
    } catch (error) {
      alert('Error toggling banner status');
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this flash banner?')) return;
    try {
      await flashBannerService.deleteBanner(id);
      if (editingId === id) resetForm();
      fetchBanners();
    } catch (error) {
      alert('Error deleting flash banner');
    }
  };

  const set = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });
  const counts = banners.reduce((acc, b) => { acc[liveState(b)[0]] = (acc[liveState(b)[0]] || 0) + 1; return acc; }, {});

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>Flash Banner (Scrolling Marquee)</h2>
        <div className="admin-stats-bar" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div>Total: <strong>{banners.length}</strong></div>
          <div>Scrolling now: <strong>{counts.SCROLLING || 0}</strong></div>
          <div>Scheduled: <strong>{counts.SCHEDULED || 0}</strong></div>
          <div>Hidden / Ended: <strong>{(counts.HIDDEN || 0) + (counts.ENDED || 0)}</strong></div>
        </div>
      </header>

      <div className="admin-form-container pattern-setup">
        <h3>{editingId ? 'Edit Flash Banner' : 'Create New Scrolling Ticker'}</h3>
        <form onSubmit={handleSubmit} className="admin-grid-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={ROW}>
            <div className="input-group">
              <label>Banner Title (optional)</label>
              <input type="text" maxLength={80} value={formData.title} onChange={set('title')} placeholder="e.g. Monsoon Offer" />
            </div>
            <div className="input-group">
              <label>Link (optional)</label>
              <input type="text" maxLength={300} value={formData.link_url} onChange={set('link_url')} placeholder="/plan-pricing or https://…" />
            </div>
          </div>
          <div className="input-group">
            <label>Ticker Message</label>
            <textarea
              value={formData.content}
              onChange={set('content')}
              required
              rows="3"
              placeholder="e.g. ⭐ IMPORTANT: Server will be down from 12 AM to 1 AM..."
            />
          </div>
          <div style={ROW}>
            <div className="input-group">
              <label>Start Date (optional)</label>
              <input type="date" value={formData.start_date} onChange={set('start_date')} />
            </div>
            <div className="input-group">
              <label>End Date (optional)</label>
              <input type="date" value={formData.end_date} min={formData.start_date || undefined} onChange={set('end_date')} />
            </div>
            <div className="input-group">
              <label>Banner Colour</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                {COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setFormData({ ...formData, color: c })} aria-label={`Colour ${c}`}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: formData.color.toUpperCase() === c ? '3px solid #0f172a' : '2px solid #fff', boxShadow: '0 0 0 1px #cbd5e1' }} />
                ))}
                <input type="color" value={formData.color} onChange={set('color')} aria-label="Custom colour" style={{ width: 34, height: 28, padding: 0, border: 'none', background: 'none' }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Leave the dates empty to show the banner until you hide it. Dates are inclusive.</p>
          <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', width: 'fit-content', fontWeight: 600, fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              style={{ width: 'auto' }}
            />
            {editingId ? 'Active' : 'Set Active Immediately'}
          </label>
          {formData.content.trim() && (
            <div>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Preview</span>
              <div style={{ background: formData.color, color: '#fff', borderRadius: '6px', padding: '8px 12px', fontWeight: 600, fontSize: '0.9rem' }}>
                {formData.title && <strong style={{ marginRight: 8 }}>{formData.title}:</strong>}{formData.content}{formData.link_url && <u style={{ marginLeft: 8 }}>Open →</u>}
              </div>
            </div>
          )}
          <div style={{ gap: '10px', display: 'flex' }}>
            <button type="submit" disabled={saving} className="btn-primary" style={{ backgroundColor: '#eab308', color: '#000' }}>{editingId ? 'Save Changes' : 'Add Flash Banner'}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>

      <h3>Manage Banners</h3>
      {(() => {
        const totalPages = Math.max(1, Math.ceil(banners.length / pageSize));
        const pagedBanners = banners.slice((page - 1) * pageSize, page * pageSize);
        return (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date Added</th>
                  <th>Ticker Content</th>
                  <th>Link</th>
                  <th>Show Window</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="6">Loading...</td></tr> : banners.length === 0 ? <tr><td colSpan="6">No banners created.</td></tr> : pagedBanners.map(b => {
                  const [state, cls] = liveState(b);
                  return (
                    <tr key={b.id}>
                      <td>{new Date(b.created_at).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '400px' }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: b.color || '#DC3545', marginRight: 6 }} />
                        {b.title && <span style={{ fontWeight: 700, color: '#0f172a' }}>{b.title}: </span>}
                        <strong>{b.content}</strong>
                      </td>
                      <td style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{b.link_url || '—'}</td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {b.start_date || b.end_date ? `${fmt(b.start_date) || 'Now'} → ${fmt(b.end_date) || 'No end'}` : 'Always'}
                      </td>
                      <td>
                        <span className={`status-badge ${cls}`}>{state}</span>
                      </td>
                      <td>
                        <button className="btn-action btn-edit" onClick={() => startEdit(b)}>Edit</button>
                        <button className="btn-action btn-edit" onClick={() => toggleStatus(b)}>Toggle</button>
                        <button className="btn-action btn-delete" onClick={() => handleDelete(b.id)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination
              page={page} totalPages={totalPages} totalItems={banners.length}
              pageSize={pageSize} onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }}
            />
          </>
        );
      })()}
    </div>
  );
};

export default AdminFlashBanner;
