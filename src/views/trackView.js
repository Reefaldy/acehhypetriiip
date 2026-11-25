import { api } from '../services/api.js';
import { escapeHtml, formatRupiah, getStatusClass } from '../utils/format.js';

export function renderTrackView(root) {
  root.innerHTML = `
    <div class="container section-pad narrow-wrap view-animate">
      <a href="#home" class="back-link">&larr; Kembali ke Beranda</a>
      <div class="surface-card card-pad form-stack">
        <div>
          <span class="eyebrow-text">Lacak Pemesanan</span>
          <h1 style="font-size:1.7rem;margin-top:0.25rem;">Cek Status Pesanan Saya</h1>
          <p class="text-muted" style="font-size:0.9rem;margin-top:0.35rem;">
            Masukkan Kode Booking dan Nomor WhatsApp yang Anda gunakan saat mendaftar open trip.
          </p>
        </div>

        <form id="track-form" class="form-stack">
          <div>
            <label for="t-code" class="form-label">Kode Booking</label>
            <input
              id="t-code"
              class="form-control font-mono"
              type="text"
              required
              placeholder="Contoh: AHT261125AB12CD"
            />
          </div>
          <div>
            <label for="t-wa" class="form-label">Nomor WhatsApp</label>
            <input
              id="t-wa"
              class="form-control"
              type="tel"
              required
              placeholder="0812xxxxxxxx"
            />
          </div>
          <div id="t-err" class="alert-banner alert-banner--error hidden" role="alert"></div>
          <button id="t-submit" type="submit" class="btn btn--forest btn--full">
            Cari Pesanan
          </button>
        </form>

        <div id="t-res" class="hidden" style="padding-top:1rem;border-top:1px solid var(--color-border);"></div>
      </div>
    </div>
  `;

  const form = root.querySelector('#track-form');
  const errEl = root.querySelector('#t-err');
  const resEl = root.querySelector('#t-res');
  const submitBtn = root.querySelector('#t-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errEl.classList.add('hidden');
    resEl.classList.add('hidden');

    const bookingCode = root.querySelector('#t-code').value.trim().toUpperCase();
    const whatsapp = root.querySelector('#t-wa').value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mencari Pesanan...';

    try {
      const data = await api.trackBooking({ booking_code: bookingCode, whatsapp });
      const found = data.booking;
      const statusCls = getStatusClass(found.status);

      resEl.innerHTML = `
        <div class="form-stack">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
            <strong class="font-mono" style="font-size:1rem;">${escapeHtml(found.booking_code)}</strong>
            <span class="status-label ${statusCls}">Status: ${escapeHtml(found.status)}</span>
          </div>
          <div class="meta-line tabular-nums">
            <span>Destinasi: <strong>${escapeHtml(found.destination_name)}</strong></span>
            <span aria-hidden="true">·</span>
            <span>${found.participants} peserta</span>
            <span aria-hidden="true">·</span>
            <span class="text-copper">${escapeHtml(formatRupiah(found.total_price))}</span>
          </div>
          <div>
            <a href="#payment/${escapeHtml(found.booking_code)}" class="btn btn--primary btn--sm">
              Buka Rincian Pembayaran
            </a>
          </div>
        </div>
      `;
      resEl.classList.remove('hidden');
    } catch (err) {
      errEl.textContent = err.message || 'Pesanan tidak ditemukan.';
      errEl.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Cari Pesanan';
    }
  });
}
