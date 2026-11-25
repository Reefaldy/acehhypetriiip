import { openMapModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { api } from '../services/api.js';
import { store } from '../state/store.js';
import { escapeHtml, formatDateId, formatRupiah, normalizePhone } from '../utils/format.js';

export function renderBookView(root, id) {
  const trip = store.destinations.find((d) => d.id === Number(id) && d.status === 'Aktif');
  if (!trip || trip.quota <= 0) {
    root.innerHTML = `
      <div class="container section-pad narrow-wrap view-animate">
        <a href="#home" class="back-link">&larr; Kembali ke Daftar Destinasi</a>
        <div class="surface-card card-pad">
          <h2>Destinasi tidak tersedia atau kuota sudah penuh.</h2>
          <p class="text-muted" style="margin-top:0.5rem;">
            Silakan pilih destinasi open trip lainnya pada halaman utama.
          </p>
        </div>
      </div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="container section-pad narrow-wrap view-animate">
      <a href="#home" class="back-link">&larr; Kembali ke Daftar Destinasi</a>
      <div class="surface-card card-pad form-stack">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
          <span class="eyebrow-text">Formulir Pemesanan Trip</span>
          <button id="book-map-btn" type="button" class="btn btn--outline btn--sm">
            Cek Peta Lokasi
          </button>
        </div>

        <div>
          <h1 style="font-size:1.75rem;">${escapeHtml(trip.name)}</h1>
          <div class="meta-line tabular-nums" style="margin-top:0.35rem;">
            <span>${escapeHtml(trip.location)}</span>
            <span aria-hidden="true">·</span>
            <span>${escapeHtml(formatDateId(trip.trip_date))}</span>
            <span aria-hidden="true">·</span>
            <span class="text-copper">${escapeHtml(formatRupiah(trip.price))} / peserta</span>
          </div>
        </div>

        <hr class="hairline-divider" />

        <form id="book-form" class="form-stack" novalidate>
          <div>
            <label for="b-name" class="form-label">Nama Lengkap Peserta Utama</label>
            <input
              id="b-name"
              class="form-control"
              type="text"
              required
              minlength="2"
              maxlength="100"
              placeholder="Contoh: Cut Meutia"
            />
          </div>

          <div>
            <label for="b-wa" class="form-label">Nomor WhatsApp Aktif</label>
            <input
              id="b-wa"
              class="form-control"
              type="tel"
              required
              placeholder="0812xxxxxxxx"
            />
            <p class="form-hint">Digunakan untuk konfirmasi jadwal dan pelacakan pesanan.</p>
          </div>

          <div class="form-grid-2">
            <div>
              <label for="b-pax" class="form-label">Jumlah Peserta</label>
              <input
                id="b-pax"
                class="form-control tabular-nums"
                type="number"
                min="1"
                max="${trip.quota}"
                value="1"
                required
              />
              <p class="form-hint tabular-nums">Kuota tersedia: ${trip.quota} peserta</p>
            </div>
            <div>
              <label for="b-method" class="form-label">Metode Pembayaran</label>
              <select id="b-method" class="form-control">
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>

          <div class="summary-row">
            <span style="font-weight:700;">Total Estimasi Pembayaran</span>
            <span id="b-total" class="text-copper tabular-nums" style="font-size:1.35rem;font-weight:700;">
              ${escapeHtml(formatRupiah(trip.price))}
            </span>
          </div>

          <div id="b-err" class="alert-banner alert-banner--error hidden" role="alert"></div>

          <button id="b-submit" type="submit" class="btn btn--primary btn--lg btn--full">
            Buat Pesanan &amp; Lanjut Bayar
          </button>
        </form>
      </div>
    </div>
  `;

  root.querySelector('#book-map-btn').addEventListener('click', () => openMapModal(trip));

  const paxEl = root.querySelector('#b-pax');
  const totalEl = root.querySelector('#b-total');
  const errEl = root.querySelector('#b-err');
  const submitBtn = root.querySelector('#b-submit');

  paxEl.addEventListener('input', () => {
    const val = Math.min(trip.quota, Math.max(1, parseInt(paxEl.value, 10) || 1));
    paxEl.value = String(val);
    totalEl.textContent = formatRupiah(val * trip.price);
  });

  root.querySelector('#book-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    errEl.classList.add('hidden');

    const name = root.querySelector('#b-name').value.trim();
    const wa = root.querySelector('#b-wa').value.trim();
    const pax = Math.floor(Number(paxEl.value) || 1);
    const method = root.querySelector('#b-method').value;

    if (name.length < 2) {
      errEl.textContent = 'Nama peserta minimal 2 karakter.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!/^628\d{8,12}$/.test(normalizePhone(wa))) {
      errEl.textContent = 'Masukkan nomor WhatsApp aktif Indonesia (cth: 0812xxxxxxxx).';
      errEl.classList.remove('hidden');
      return;
    }
    if (pax < 1 || pax > trip.quota) {
      errEl.textContent = `Jumlah peserta harus antara 1 sampai ${trip.quota}.`;
      errEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses Pemesanan...';

    try {
      const res = await api.createBooking({
        destination_id: trip.id,
        customer_name: name,
        whatsapp: wa,
        participants: pax,
        payment_method: method,
      });
      trip.quota = Math.max(0, trip.quota - pax);
      showToast(`Kode booking ${res.booking.booking_code} berhasil dibuat.`);
      window.location.hash = `#payment/${res.booking.booking_code}`;
    } catch (err) {
      errEl.textContent = err.message || 'Gagal membuat pemesanan.';
      errEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Buat Pesanan & Lanjut Bayar';
    }
  });
}
