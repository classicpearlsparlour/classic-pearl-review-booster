const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const api = {
  createBusiness: (payload) =>
    request('/api/businesses', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  listBusinesses: () => request('/api/businesses'),
  getBusiness: (id) => request(`/api/businesses/${id}`),
  getQr: (id) => request(`/api/businesses/${id}/qr`),
  trackScan: (businessId) =>
    request('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ businessId })
    }),
  getSuggestions: (payload) =>
    request('/api/reviews/suggestions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  trackGoogleClick: (payload) =>
    request('/api/reviews/google-click', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  createComplaint: (payload) =>
    request('/api/complaints', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  listComplaints: (businessId) => request(`/api/complaints?businessId=${businessId}`),
  updateComplaint: (id, status) =>
    request(`/api/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  getAnalytics: (businessId) => request(`/api/analytics/${businessId}`)
};
