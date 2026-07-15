const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      body?.error || `Request failed with status ${response.status}`,
      response.status,
      body?.details
    );
  }

  return body;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  return parseResponse(response);
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/auth/me'),
};

export const usersApi = {
  list: () => apiRequest('/users'),
};

export const ticketsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.status) query.set('status', params.status);
    if (params.priority) query.set('priority', params.priority);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiRequest(`/tickets${qs ? `?${qs}` : ''}`);
  },
  get: (id) => apiRequest(`/tickets/${id}`),
  create: (payload) =>
    apiRequest('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id, payload) =>
    apiRequest(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateStatus: (id, status) =>
    apiRequest(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  addComment: (id, message) =>
    apiRequest(`/tickets/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};
