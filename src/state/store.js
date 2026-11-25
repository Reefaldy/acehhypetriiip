export const store = {
  destinations: [],
  gallery: [],
  bookings: [],
  settings: {
    whatsapp: '6281200000000',
    bank: 'Bank Syariah Indonesia (BSI)',
    account: '7123456789',
    account_name: 'AcehHypeTrip Open Trip',
    qris_nmid: 'ID1026000888999',
    hero_image: '/src/assets/images/hero_aceh_expedition_1795593548981.jpg',
    about_badge: 'Tentang AcehHypeTrip',
    about_title: 'Menjangkau Spot Alami yang Jarang Dikunjungi.',
    about_description: '',
    about_cta_text: 'Hubungi via WhatsApp',
    about_image: '/src/assets/images/hero_aceh_expedition_1795593548981.jpg',
  },
  filters: {
    query: '',
    location: '',
  },
  adminToken: '',
  adminExpiresAt: 0,
  adminEnvManaged: false,
  adminTab: 'destinations',
  editingDestinationId: null,
};

export function isAdminAuthenticated() {
  return Boolean(store.adminToken && store.adminExpiresAt > Date.now());
}

export function setAdminSession(token, expiresAt) {
  store.adminToken = token || '';
  store.adminExpiresAt = Number(expiresAt) || 0;
}

export function clearAdminSession() {
  store.adminToken = '';
  store.adminExpiresAt = 0;
}
