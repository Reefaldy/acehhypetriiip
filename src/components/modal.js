import { bindImageFallbacks, escapeHtml, FALLBACK_IMG, sanitizeImageUrl } from '../utils/format.js';

export function initModal() {
  const dialog = document.getElementById('app-modal');
  const closeBtn = document.getElementById('app-modal-close');
  if (!dialog || !closeBtn) return;

  closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}

export function openImageModal(title, src, caption = '') {
  const dialog = document.getElementById('app-modal');
  const titleEl = document.getElementById('app-modal-title');
  const bodyEl = document.getElementById('app-modal-body');
  if (!dialog || !titleEl || !bodyEl) return;

  const safeSrc = sanitizeImageUrl(src, FALLBACK_IMG);
  titleEl.textContent = title;
  bodyEl.innerHTML = `
    <img
      src="${escapeHtml(safeSrc)}"
      alt="${escapeHtml(title)}"
      style="width:100%;max-height:70vh;object-fit:contain;border-radius:0.5rem;background:#112a1f;"
    />
    ${caption ? `<p class="form-hint" style="margin-top:0.85rem;font-size:0.88rem;">${escapeHtml(caption)}</p>` : ''}
  `;
  bindImageFallbacks(bodyEl);
  dialog.showModal();
}

export function openMapModal(trip) {
  const dialog = document.getElementById('app-modal');
  const titleEl = document.getElementById('app-modal-title');
  const bodyEl = document.getElementById('app-modal-body');
  if (!dialog || !titleEl || !bodyEl) return;

  const queryText = trip.map_query || `${trip.name}, ${trip.location}, Aceh`;
  const encodedQuery = encodeURIComponent(queryText);
  const embedUrl = `https://maps.google.com/maps?q=${encodedQuery}&z=13&output=embed`;
  const directUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  titleEl.textContent = `Peta Lokasi — ${trip.name}`;
  bodyEl.innerHTML = `
    <p class="text-muted" style="font-size:0.88rem;">Lokasi: <strong>${escapeHtml(trip.location)}</strong></p>
    <div class="map-frame-wrap">
      <iframe
        title="Peta ${escapeHtml(trip.name)}"
        src="${embedUrl}"
        width="100%"
        height="340"
        style="border:0;display:block;"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      ></iframe>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
      <span class="form-hint" style="margin:0;">Titik pencarian: ${escapeHtml(queryText)}</span>
      <a href="${directUrl}" target="_blank" rel="noopener noreferrer" class="btn btn--primary btn--sm">
        Buka Rute di Google Maps
      </a>
    </div>
  `;
  dialog.showModal();
}
