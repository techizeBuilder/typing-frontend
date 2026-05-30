import { useState, useEffect } from 'react';
import api from '../../services/api';
import Pagination from '../../components/Pagination';
import './Admin.css';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await api.get('/messages');
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/messages', formData);
      setFormData({ title: '', content: '' });
      fetchMessages();
    } catch (error) {
      alert('Error sending message!');
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/messages/${id}`);
      fetchMessages();
    } catch (error) {
      alert('Error deleting message');
    }
  };

  return (
    <div className="admin-card">
      <header className="admin-header">
        <h2>Message Center (Broadcast to Students)</h2>
      </header>

      <div className="admin-form-container pattern-setup">
        <h3>Compose New Broadcast</h3>
        <form onSubmit={handleSubmit} className="admin-grid-form" style={{ gridTemplateColumns: '1fr' }}>
          <div className="input-group">
            <label>Message Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})} 
              required 
              placeholder="e.g. Server Maintenance or Exam Result Update" 
            />
          </div>
          <div className="input-group">
            <label>Message Content</label>
            <textarea 
              value={formData.content} 
              onChange={(e) => setFormData({...formData, content: e.target.value})} 
              required 
              rows="4"
              placeholder="Enter detailed instructions for students here..."
            />
          </div>
          <div className="form-actions-full" style={{ textAlign: 'left' }}>
            <button type="submit" className="btn-primary" style={{ backgroundColor: '#f97316' }}>Send Broadcast Message</button>
          </div>
        </form>
      </div>

      <h3>Past Broadcasts</h3>
      {(() => {
        const totalPages = Math.max(1, Math.ceil(messages.length / pageSize));
        const pagedMessages = messages.slice((page - 1) * pageSize, page * pageSize);
        return (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Content Snippet</th>
                  <th>Target</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan="5">Loading...</td></tr> : messages.length === 0 ? <tr><td colSpan="5">No messages sent yet.</td></tr> : pagedMessages.map(msg => (
                  <tr key={msg.id}>
                    <td>{new Date(msg.created_at).toLocaleDateString()}</td>
                    <td><strong>{msg.title}</strong></td>
                    <td className="text-preview">{msg.content.substring(0, 50)}...</td>
                    <td><span className="badge-control">{msg.target_audience}</span></td>
                    <td>
                      <button className="btn-action btn-delete" onClick={() => handleDelete(msg.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page} totalPages={totalPages} totalItems={messages.length}
              pageSize={pageSize} onPageChange={setPage} onPageSizeChange={p => { setPageSize(p); setPage(1); }}
            />
          </>
        );
      })()}
    </div>
  );
};

export default AdminMessages;
