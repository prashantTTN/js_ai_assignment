import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ticketsApi, usersApi } from '../api/client';
import ErrorAlert from '../components/ErrorAlert';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const TERMINAL_STATUSES = ['closed', 'cancelled'];

export default function TicketDetailPage() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [allowedTransitions, setAllowedTransitions] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketRes, usersRes] = await Promise.all([
        ticketsApi.get(id),
        usersApi.list(),
      ]);
      setTicket(ticketRes.data);
      setAllowedTransitions(ticketRes.meta?.allowedTransitions || []);
      setTitle(ticketRes.data.title);
      setDescription(ticketRes.data.description);
      setPriority(ticketRes.data.priority);
      setAssignedTo(ticketRes.data.assignedTo?.id || '');
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await ticketsApi.update(id, {
        title,
        description,
        priority,
        assignedTo: assignedTo || null,
      });
      setTicket((prev) => ({ ...response.data, comments: prev?.comments || [] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    setError('');
    try {
      const response = await ticketsApi.updateStatus(id, status);
      setTicket(response.data);
      setAllowedTransitions(response.meta?.allowedTransitions || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setError('');
    try {
      const response = await ticketsApi.addComment(id, comment.trim());
      setTicket(response.data);
      setComment('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="container">Loading ticket...</div>;
  }

  if (!ticket) {
    return (
      <div className="container">
        <ErrorAlert message={error || 'Ticket not found'} />
        <Link to="/">Back to tickets</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <p><Link to="/">← Back to tickets</Link></p>
      <ErrorAlert message={error} />

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h1 style={{ marginTop: 0 }}>{ticket.title}</h1>
          <div>
            <StatusBadge status={ticket.status} />
            <span style={{ margin: '0 0.35rem' }} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={10}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-priority">Priority</label>
            <select
              id="edit-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="edit-assignedTo">Assigned to</label>
            <select
              id="edit-assignedTo"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem' }}>
          <h3>Change Status</h3>
          <p>Current: <StatusBadge status={ticket.status} /></p>
          <div className="status-actions">
            {allowedTransitions.length === 0 ? (
              <span>
                {TERMINAL_STATUSES.includes(ticket.status)
                  ? `No further changes — this ticket is ${STATUS_LABELS[ticket.status]}.`
                  : 'No status changes available.'}
              </span>
            ) : (
              allowedTransitions.map((status) => (
                <button
                  key={status}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleStatusChange(status)}
                >
                  → {STATUS_LABELS[status] || status}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Comments</h2>
        {ticket.comments?.length ? (
          ticket.comments.map((item) => (
            <div className="comment" key={item.id}>
              <div className="comment-meta">
                {item.createdBy?.name || 'Unknown'} ·{' '}
                {new Date(item.createdAt).toLocaleString()}
              </div>
              <div>{item.message}</div>
            </div>
          ))
        ) : (
          <p>No comments yet.</p>
        )}

        <form onSubmit={handleAddComment} style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label htmlFor="comment">Add comment</label>
            <textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              minLength={1}
            />
          </div>
          <button className="btn" type="submit">Post Comment</button>
        </form>
      </div>
    </div>
  );
}
