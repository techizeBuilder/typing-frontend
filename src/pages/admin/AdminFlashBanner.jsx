import { useState, useEffect } from 'react';
import { flashBannerService } from '../../services/api';
import Pagination from '../../components/Pagination';
import './Admin.css';

const AdminFlashBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ content: '', is_active: true });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const res = await flashBannerService.getBanners();
      setBanners(res);
    } catch (error) {
      console.error('Error fetching flash banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await flashBannerService.createBanner(formData);
      setFormData({ content: '', is_active: true });
      fetchBanners();
    } catch (error) {
      alert('Error creating flash banner!');
    }
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
      fetchBanners();
    } catch (error) {
      alert('Error deleting flash banner');
    }
  };

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>Flash Banner (Scrolling Marquee)</h2>
      </header>

      <div className="admin-form-container pattern-setup">
        <h3>Create New Scrolling Ticker</h3>
        <form onSubmit={handleSubmit} className="admin-grid-form" style={{ gridTemplateColumns: '1fr' }}>
          <div className="input-group">
            <label>Ticker Message</label>
            <textarea 
              value={formData.content} 
              onChange={(e) => setFormData({...formData, content: e.target.value})} 
              required 
              rows="3"
              placeholder="e.g. ⭐ IMPORTANT: Server will be down from 12 AM to 1 AM..."
            />
          </div>
          <div className="input-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              checked={formData.is_active} 
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})} 
              style={{ width: 'auto' }}
            />
            <label style={{ margin: 0 }}>Set Active Immediately</label>
          </div>
          <div className="form-actions-full" style={{ textAlign: 'left' }}>
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#eab308', color: '#000' }}>Add Flash Banner</button>
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
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="4">Loading...</td></tr> : banners.length === 0 ? <tr><td colSpan="4">No banners created.</td></tr> : pagedBanners.map(b => (
                  <tr key={b.id}>
                    <td>{new Date(b.created_at).toLocaleDateString()}</td>
                    <td style={{ maxWidth: '400px' }}><strong>{b.content}</strong></td>
                    <td>
                      <span className={`status-badge ${b.is_active ? 'active' : 'inactive'}`}>
                        {b.is_active ? 'SCROLLING' : 'HIDDEN'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-action btn-edit" onClick={() => toggleStatus(b)}>Toggle</button>
                      <button className="btn-action btn-delete" onClick={() => handleDelete(b.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
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
