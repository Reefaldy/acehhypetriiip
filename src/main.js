import { initHeader, syncHeaderState } from './components/header.js';
import { initModal } from './components/modal.js';
import { api } from './services/api.js';
import { isAdminAuthenticated, store } from './state/store.js';
import { escapeHtml } from './utils/format.js';
import { renderAdminLoginView } from './views/adminLoginView.js';
import { renderAdminView } from './views/adminView.js';
import { renderBookView } from './views/bookView.js';
import { renderHomeView } from './views/homeView.js';
import { renderPaymentView } from './views/paymentView.js';
import { renderTrackView } from './views/trackView.js';

let publicLoaded = false;

async function ensurePublicData(force = false) {
  if (publicLoaded && !force) return;
  const data = await api.fetchPublicData();
  store.destinations = data.destinations;
  store.gallery = data.gallery;
  store.settings = data.settings;
  publicLoaded = true;
}

async function route() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const hash = window.location.hash.replace(/^#/, '') || 'home';
  const [routeName, param] = hash.split('/');
  syncHeaderState(routeName);

  try {
    if (routeName === 'book' && param) {
      await ensurePublicData();
      renderBookView(main, param);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (routeName === 'payment' && param) {
      await ensurePublicData();
      await renderPaymentView(main, param);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (routeName === 'track') {
      renderTrackView(main);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (routeName === 'admin') {
      await renderAdminView(main);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (routeName === 'admin-login') {
      if (isAdminAuthenticated()) {
        window.location.hash = '#admin';
        return;
      }
      await renderAdminLoginView(main);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Public home or section scroll (#home, #catalog, #gallery, #about)
    await ensurePublicData(true);
    renderHomeView(main);

    if (routeName === 'catalog' || routeName === 'gallery' || routeName === 'about') {
      window.setTimeout(() => {
        document.getElementById(routeName)?.scrollIntoView({ behavior: 'smooth' });
      }, 40);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    main.innerHTML = `
      <div class="container section-pad narrow-wrap">
        <div class="surface-card card-pad">
          <h2>Terjadi gangguan saat memuat halaman</h2>
          <p class="text-muted" style="margin-top:0.5rem;">${escapeHtml(err.message || 'Silakan muat ulang halaman.')}</p>
          <button id="retry-route" type="button" class="btn btn--forest" style="margin-top:1rem;">Muat Ulang</button>
        </div>
      </div>
    `;
    main.querySelector('#retry-route')?.addEventListener('click', () => route());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initModal();
  window.addEventListener('hashchange', route);
  route();
});
