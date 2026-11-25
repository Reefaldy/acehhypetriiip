import { showToast } from '../components/toast.js';
import { api } from '../services/api.js';
import { store } from '../state/store.js';
import {
  bindImageFallbacks,
  compressImageFile,
  escapeHtml,
  formatRupiah,
  getStatusClass,
  sanitizeImageUrl,
} from '../utils/format.js';

export async function renderPaymentView(root, code) {
  root.innerHTML = `<div class="container section-pad narrow-wrap"><div class="surface-card loading-state">Memuat rincian pembayaran...</div></div>`;

  let booking;
  try {
    const res = await api.fetchBooking(code);
    booking = res.booking;
  } catch (err) {
    root.innerHTML = `
      <div class="container section-pad narrow-wrap view-animate">
        <a href="#home" class="back-link">&larr; Kembali ke Beranda</a>
        <div class="surface-card card-pad">
          <h2>Data pemesanan tidak ditemukan</h2>
          <p class="text-muted" style="margin-top:0.5rem;">${escapeHtml(err.message)}</p>
        </div>
      </div>
    `;
    return;
  }

  const methodInstructions =
    booking.payment_method === 'QRIS'
      ? `
        <div class="instruction-list">
          <span class="eyebrow-text">Instruksi Pembayaran QRIS</span>
          <p>Merchant: <strong>QRIS AcehHypeTrip</strong></p>
          <p>NMID: <span class="font-mono">${escapeHtml(store.settings.qris_nmid || 'ID1026000888999')}</span></p>
          <p>Atas Nama: <strong>${escapeHtml(store.settings.account_name)}</strong></p>
        </div>
      `
      : `
        <div class="instruction-list">
          <span class="eyebrow-text">Instruksi Transfer Bank</span>
          <p>Bank Tujuan: <strong>${escapeHtml(store.settings.bank)}</strong></p>
          <p>
            Nomor Rekening:
            <strong class="text-copper font-mono">${escapeHtml(store.settings.account)}</strong>
            <button id="cp-acc" type="button" class="btn btn--outline btn--sm" style="margin-left:0.5rem;">Salin</button>
          </p>
          <p>Atas Nama: <strong>${escapeHtml(store.settings.account_name)}</strong></p>
        </div>
      `;

  const statusCls = getStatusClass(booking.status);
  const safeProof = booking.payment_proof ? sanitizeImageUrl(booking.payment_proof, '') : '';

  root.innerHTML = `
    <div class="container section-pad narrow-wrap view-animate">
      <a href="#home" class="back-link">&larr; Kembali ke Beranda</a>
      <div class="surface-card card-pad form-stack">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;">
          <span class="eyebrow-text">Pembayaran Open Trip</span>
          <span class="status-label ${statusCls}">Status: ${escapeHtml(booking.status)}</span>
        </div>

        <div>
          <h1 style="font-size:1.65rem;">${escapeHtml(booking.destination_name)}</h1>
          <div class="meta-line tabular-nums" style="margin-top:0.35rem;">
            <span>Kode: <strong class="font-mono">${escapeHtml(booking.booking_code)}</strong></span>
            <button id="cp-code" type="button" class="btn btn--outline btn--sm">Salin Kode</button>
          </div>
          <p class="text-muted" style="font-size:0.9rem;margin-top:0.45rem;">
            Peserta: <strong>${escapeHtml(booking.customer_name)}</strong> (${escapeHtml(booking.whatsapp_masked)}) · ${booking.participants} orang
          </p>
        </div>

        <div class="summary-row">
          <span style="font-weight:700;">Total Tagihan</span>
          <span class="text-copper tabular-nums" style="font-size:1.55rem;font-weight:700;">
            ${escapeHtml(formatRupiah(booking.total_price))}
          </span>
        </div>

        ${methodInstructions}

        ${
          safeProof
            ? `
          <div class="alert-banner alert-banner--success form-stack">
            <span>Bukti pembayaran terunggah (${escapeHtml(booking.payment_proof_name || 'bukti.jpg')})</span>
            <img
              src="${escapeHtml(safeProof)}"
              alt="Bukti pembayaran ${escapeHtml(booking.booking_code)}"
              style="max-height:14rem;width:auto;border-radius:0.45rem;object-fit:contain;"
            />
          </div>
        `
            : ''
        }

        ${
          booking.status !== 'Diterima'
            ? `
          <hr class="hairline-divider" />
          <form id="proof-form" class="form-stack">
            <div>
              <label for="p-file" class="form-label">Unggah Bukti Pembayaran (JPG, PNG, WEBP)</label>
              <input id="p-file" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" required />
            </div>
            <div id="p-err" class="alert-banner alert-banner--error hidden" role="alert"></div>
            <button id="p-submit" type="submit" class="btn btn--primary btn--full">
              ${safeProof ? 'Perbarui Bukti Pembayaran' : 'Kirim Bukti Pembayaran'}
            </button>
          </form>
        `
            : '<div class="alert-banner alert-banner--success">Pembayaran Anda telah diverifikasi dan diterima oleh tim AcehHypeTrip.</div>'
        }
      </div>
    </div>
  `;

  bindImageFallbacks(root);

  root.querySelector('#cp-acc')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(store.settings.account);
    showToast('Nomor rekening disalin.');
  });

  root.querySelector('#cp-code')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(booking.booking_code);
    showToast('Kode booking disalin.');
  });

  const proofForm = root.querySelector('#proof-form');
  if (proofForm) {
    proofForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errEl = root.querySelector('#p-err');
      const submitBtn = root.querySelector('#p-submit');
      const file = root.querySelector('#p-file').files[0];

      errEl.classList.add('hidden');
      if (!file) {
        errEl.textContent = 'Pilih file bukti pembayaran terlebih dahulu.';
        errEl.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengunggah Bukti...';

      try {
        const compressedDataUrl = await compressImageFile(file, 960);
        await api.uploadPaymentProof(booking.booking_code, {
          payment_proof: compressedDataUrl,
          payment_proof_name: file.name,
        });
        showToast('Bukti pembayaran berhasil dikirim.');
        await renderPaymentView(root, code);
      } catch (err) {
        errEl.textContent = err.message || 'Gagal mengunggah bukti pembayaran.';
        errEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Bukti Pembayaran';
      }
    });
  }
}
