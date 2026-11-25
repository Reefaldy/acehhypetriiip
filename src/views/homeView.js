import { openImageModal, openMapModal } from '../components/modal.js';
import { store } from '../state/store.js';
import {
  bindImageFallbacks,
  escapeHtml,
  FALLBACK_IMG,
  formatDateId,
  formatRupiah,
  normalizePhone,
  sanitizeImageUrl,
} from '../utils/format.js';

export function renderHomeView(root) {
  const activeTrips = store.destinations.filter((d) => d.status === 'Aktif');
  const locations = [...new Set(activeTrips.map((d) => d.location))].sort();
  const waNumber = normalizePhone(store.settings.whatsapp || '6281200000000');
  const heroImage = sanitizeImageUrl(store.settings.hero_image, FALLBACK_IMG);
  const aboutImage = sanitizeImageUrl(store.settings.about_image, FALLBACK_IMG);

  root.innerHTML = `
    <div class="view-animate">
      <section class="hero-banner" style="background-image: url('${escapeHtml(heroImage)}');">
        <div class="hero-scrim" aria-hidden="true"></div>
        <div class="container hero-content">
          <p class="hero-eyebrow">Eksplorasi Jalur Alam Aceh Besar</p>
          <h1 class="hero-title">Jelajahi Sudut Tersembunyi &amp; Alam Aceh yang Jarang Dijamah.</h1>
          <p class="hero-desc">
            Open trip terarah menuju Lhok Ketapang, Savana Siron, Lhok Mata Ie, Air Terjun Luthu, Air Terjun Selawah Agam, Air Terjun Monceunong, Air Terjun Peuncari Cot, dan Bukit Cot Goh Dua.
          </p>
          <div class="hero-actions">
            <a href="#catalog" class="btn btn--amber btn--lg">Jelajahi Rute Hidden Gem</a>
            <a href="#track" class="btn btn--ghost-light btn--lg">Cek Status Pesanan</a>
          </div>
        </div>
      </section>

      <section id="catalog" class="container section-pad">
        <div class="section-header">
          <h2>Open Trip Rute Tersembunyi</h2>
          <p class="text-muted">
            Pilih jadwal perjalanan yang sesuai, tinjau peta lokasi titik tujuan, dan amankan kuota peserta sebelum penuh.
          </p>
        </div>

        <div class="surface-card filter-bar">
          <div>
            <label for="search-input" class="form-label">Cari Destinasi atau Deskripsi</label>
            <input
              id="search-input"
              class="form-control"
              type="search"
              value="${escapeHtml(store.filters.query)}"
              placeholder="Contoh: Lhok Ketapang, Savana Siron, Luthu..."
            />
          </div>
          <div>
            <label for="location-filter" class="form-label">Filter Lokasi</label>
            <select id="location-filter" class="form-control">
              <option value="">Semua Lokasi (${activeTrips.length})</option>
              ${locations
                .map(
                  (loc) =>
                    `<option value="${escapeHtml(loc)}" ${
                      store.filters.location === loc ? 'selected' : ''
                    }>${escapeHtml(loc)}</option>`,
                )
                .join('')}
            </select>
          </div>
          <div>
            <button id="btn-clear-filter" type="button" class="btn btn--subtle btn--full">
              Reset
            </button>
          </div>
        </div>

        <div id="destinations-grid" class="grid-cards"></div>
      </section>

      <section id="about" class="about-band section-pad">
        <div class="container grid-2-stretch">
          <div class="about-copy">
            <span class="eyebrow-text">${escapeHtml(store.settings.about_badge || 'Tentang AcehHypeTrip')}</span>
            <h2 style="font-size:clamp(1.65rem,3vw,2.35rem);">
              ${escapeHtml(store.settings.about_title)}
            </h2>
            <p class="text-muted" style="line-height:1.72;white-space:pre-line;">
              ${escapeHtml(store.settings.about_description)}
            </p>
            <a
              href="https://wa.me/${escapeHtml(waNumber)}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn--forest"
            >
              ${escapeHtml(store.settings.about_cta_text || 'Hubungi via WhatsApp')}
            </a>
          </div>
          <div class="about-media">
            <img
              src="${escapeHtml(aboutImage)}"
              alt="${escapeHtml(store.settings.about_title)}"
            />
          </div>
        </div>
      </section>

      <section id="gallery" class="container section-pad">
        <div class="section-header">
          <h2>Galeri Perjalanan</h2>
          <p class="text-muted">
            Dokumentasi jalur alam, air terjun, perbukitan, dan pesisir Aceh. Klik foto untuk memperbesar tampilan.
          </p>
        </div>
        <div id="gallery-grid" class="grid-gallery">
          ${
            store.gallery.length
              ? store.gallery
                  .map(
                    (item) => `
                <figure
                  class="surface-card surface-card--interactive gallery-card"
                  tabindex="0"
                  role="button"
                  aria-label="Perbesar foto: ${escapeHtml(item.caption)}"
                  data-img="${escapeHtml(sanitizeImageUrl(item.image, FALLBACK_IMG))}"
                  data-cap="${escapeHtml(item.caption)}"
                >
                  <div class="gallery-card__media">
                    <img
                      src="${escapeHtml(sanitizeImageUrl(item.image, FALLBACK_IMG))}"
                      alt="${escapeHtml(item.caption)}"
                    />
                  </div>
                  <figcaption>${escapeHtml(item.caption)}</figcaption>
                </figure>
              `,
                  )
                  .join('')
              : '<div class="surface-card empty-state" style="grid-column:1/-1;">Belum ada foto dokumentasi pada galeri.</div>'
          }
        </div>
      </section>
    </div>
  `;

  bindImageFallbacks(root);

  const gridEl = root.querySelector('#destinations-grid');
  const searchInput = root.querySelector('#search-input');
  const locationSelect = root.querySelector('#location-filter');
  const resetBtn = root.querySelector('#btn-clear-filter');

  const drawCards = () => {
    const query = store.filters.query.trim().toLowerCase();
    const loc = store.filters.location;
    const filtered = store.destinations.filter(
      (trip) =>
        trip.status === 'Aktif' &&
        (!query ||
          trip.name.toLowerCase().includes(query) ||
          trip.location.toLowerCase().includes(query) ||
          trip.description.toLowerCase().includes(query)) &&
        (!loc || trip.location === loc),
    );

    if (!filtered.length) {
      gridEl.innerHTML =
        '<div class="surface-card empty-state" style="grid-column:1/-1;">Tidak ada destinasi yang sesuai dengan pencarian Anda.</div>';
      return;
    }

    gridEl.innerHTML = filtered
      .map((trip) => {
        const isFull = trip.quota <= 0;
        const imgSrc = sanitizeImageUrl(trip.image, FALLBACK_IMG);
        return `
          <article class="surface-card surface-card--interactive trip-card">
            <div class="trip-card__media">
              <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(trip.name)}" />
              <button
                type="button"
                class="trip-card__map-btn"
                data-map-id="${trip.id}"
              >
                Lihat Peta
              </button>
            </div>
            <div class="trip-card__body">
              <div class="meta-line tabular-nums">
                <span>${escapeHtml(formatDateId(trip.trip_date))}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(trip.location)}</span>
              </div>
              <h3 class="trip-card__title">${escapeHtml(trip.name)}</h3>
              <p class="trip-card__desc">${escapeHtml(trip.description)}</p>
              <div class="trip-card__footer">
                <div>
                  <div class="price-tag tabular-nums">
                    ${escapeHtml(formatRupiah(trip.price))} <span>/ peserta</span>
                  </div>
                  <div class="form-hint tabular-nums">
                    ${
                      isFull
                        ? '<span class="status-label status-label--danger">Kuota Penuh</span>'
                        : `Tersisa <strong>${trip.quota}</strong> kuota`
                    }
                  </div>
                </div>
                ${
                  isFull
                    ? '<button type="button" class="btn btn--subtle btn--sm" disabled>Penuh</button>'
                    : `<a href="#book/${trip.id}" class="btn btn--primary btn--sm">Pesan Trip</a>`
                }
              </div>
            </div>
          </article>
        `;
      })
      .join('');

    bindImageFallbacks(gridEl);

    gridEl.querySelectorAll('[data-map-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const trip = store.destinations.find((d) => d.id === Number(btn.dataset.mapId));
        if (trip) openMapModal(trip);
      });
    });
  };

  drawCards();

  searchInput.addEventListener('input', (event) => {
    store.filters.query = event.target.value;
    drawCards();
  });

  locationSelect.addEventListener('change', (event) => {
    store.filters.location = event.target.value;
    drawCards();
  });

  resetBtn.addEventListener('click', () => {
    store.filters.query = '';
    store.filters.location = '';
    searchInput.value = '';
    locationSelect.value = '';
    drawCards();
  });

  root.querySelectorAll('.gallery-card').forEach((card) => {
    const open = () => openImageModal('Dokumentasi Perjalanan', card.dataset.img, card.dataset.cap);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
}
