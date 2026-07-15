import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ErrorAlert from '../components/ErrorAlert';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'];
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical'];

export default function TicketListPage() {
  const { user, logout } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef(null);
  const loadingRef = useRef(false);

  const hasMore = tickets.length < total;

  const fetchPage = useCallback(async (pageNum, append) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const response = await ticketsApi.list({
        q: query || undefined,
        status: status || undefined,
        priority: priority || undefined,
        page: pageNum,
        limit: PAGE_SIZE,
      });
      setTotal(response.meta?.total ?? response.data.length);
      setTickets((prev) => (append ? [...prev, ...response.data] : response.data));
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [query, status, priority]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPage(1, false);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPage]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore || loading || loadingMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPage(page + 1, true);
        }
      },
      { rootMargin: '120px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchPage, hasMore, loading, loadingMore, page]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>Tickets</h1>
          <p>Signed in as {user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn" to="/tickets/new">New Ticket</Link>
          <button className="btn btn-secondary" type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search by keyword..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tickets"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option || 'all-status'} value={option}>
              {option ? option.replace('_', ' ') : 'All statuses'}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filter by priority"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option || 'all-priority'} value={option}>
              {option ? option : 'All priorities'}
            </option>
          ))}
        </select>
      </div>

      <ErrorAlert message={error} />

      {loading ? (
        <p>Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <p>No tickets found.</p>
      ) : (
        <>
          {tickets.map((ticket) => (
            <div className="card" key={ticket.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.5rem' }}>
                    <Link to={`/tickets/${ticket.id}`}>{ticket.title}</Link>
                  </h2>
                  <p style={{ margin: 0, color: '#64748b' }}>
                    {ticket.description.slice(0, 120)}
                    {ticket.description.length > 120 ? '...' : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><StatusBadge status={ticket.status} /></div>
                  <div style={{ marginTop: '0.35rem' }}><PriorityBadge priority={ticket.priority} /></div>
                </div>
              </div>
            </div>
          ))}
          {hasMore && (
            <div ref={loadMoreRef} style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
              {loadingMore ? 'Loading more tickets...' : 'Scroll for more'}
            </div>
          )}
          {!hasMore && tickets.length > 0 && (
            <p style={{ textAlign: 'center', color: '#64748b' }}>All tickets loaded ({total})</p>
          )}
        </>
      )}
    </div>
  );
}
