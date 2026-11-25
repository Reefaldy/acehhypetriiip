import { isAdminAuthenticated } from '../state/store.js';

export function initHeader() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('primary-nav');
  if (!menuBtn || !nav) return;

  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });
}

export function syncHeaderState(activeRoute) {
  const nav = document.getElementById('primary-nav');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const adminAction = document.getElementById('header-admin-action');

  if (nav) {
    nav.classList.remove('is-open');
    nav.querySelectorAll('.nav-link').forEach((link) => {
      const target = link.dataset.route;
      link.classList.toggle('is-active', target === activeRoute);
    });
  }
  if (menuBtn) {
    menuBtn.setAttribute('aria-expanded', 'false');
  }
  if (adminAction) {
    adminAction.textContent = isAdminAuthenticated() ? 'Dashboard Admin' : 'Portal Admin';
  }
}
