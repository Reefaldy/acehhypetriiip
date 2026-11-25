import { clearAdminSession, store } from '../state/store.js';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.auth && store.adminToken) {
    headers.Authorization = `Bearer ${store.adminToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && options.auth) {
      clearAdminSession();
    }
    const err = new Error((data && data.error) || `Permintaan gagal (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  fetchPublicData() {
    return request('/api/public');
  },
  createBooking(payload) {
    return request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  fetchBooking(code) {
    return request(`/api/bookings/${encodeURIComponent(code)}`);
  },
  uploadPaymentProof(code, payload) {
    return request(`/api/bookings/${encodeURIComponent(code)}/proof`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  trackBooking(payload) {
    return request('/api/bookings/track', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  fetchAdminAuthStatus() {
    return request('/api/admin/auth/status', { auth: Boolean(store.adminToken) });
  },
  setupAdminPassword(password) {
    return request('/api/admin/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  loginAdmin(password) {
    return request('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  fetchAdminBootstrap() {
    return request('/api/admin/bootstrap', { auth: true });
  },
  createDestination(payload) {
    return request('/api/admin/destinations', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
  },
  updateDestination(id, payload) {
    return request(`/api/admin/destinations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(payload),
    });
  },
  deleteDestination(id) {
    return request(`/api/admin/destinations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    });
  },
  updateBookingStatus(code, status) {
    return request(`/api/admin/bookings/${encodeURIComponent(code)}/status`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify({ status }),
    });
  },
  addGalleryItem(payload) {
    return request('/api/admin/gallery', {
      method: 'POST',
      auth: true,
      body: JSON.stringify(payload),
    });
  },
  deleteGalleryItem(id) {
    return request(`/api/admin/gallery/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      auth: true,
    });
  },
  updateSettings(payload) {
    return request('/api/admin/settings', {
      method: 'PUT',
      auth: true,
      body: JSON.stringify(payload),
    });
  },
  resetAllData() {
    return request('/api/admin/reset', {
      method: 'POST',
      auth: true,
    });
  },
};
