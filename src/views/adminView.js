import { openImageModal, openMapModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { api } from '../services/api.js';
import { clearAdminSession, isAdminAuthenticated, store } from '../state/store.js';
import {
  bindImageFallbacks,
  compressImageFile,
  escapeHtml,
  FALLBACK_IMG,
  formatDateId,
  formatRupiah,
  getStatusClass,
  sanitizeImageUrl,
} from '../utils/format.js';

export async function renderAdminView(root) {
  if (!isAdminAuthenticated()) {
    window.location.hash = '#admin-login';
    return;
  }

  root.innerHTML = `<div class="container section-pad-sm"><div class="surface-card loading-state">Memuat data pengelola...</div></div>`;

  try {
    const data = await api.fetchAdminBootstrap();
    store.destinations = data.destinations;
    store.bookings = data.bookings;
    store.gallery = data.gallery;
    store.settings = data.settings;
    store.adminEnvManaged = Boolean(data.envManaged);
  } catch (err) {
    if (err.status === 401) {
      clearAdminSession();
      window.location.hash = '#admin-login';
      return;
    }
    root.innerHTML = `
      <div class="container section-pad-sm">
        <div class="alert-banner alert-banner--error">${escapeHtml(err.message)}</div>
      </div>
    `;
    return;
  }

  paintAdminDashboard(root);
}

function paintAdminDashboard(root) {
  const pendingCount = store.bookings.filter((b) => b.status === 'Menunggu Verifikasi').length;
  const editItem = store.editingDestinationId
    ? store.destinations.find((d) => d.id === store.editingDestinationId)
    : null;

  const tabLabels = {
    destinations: 'Destinasi',
    bookings: 'Pemesanan',
    gallery: 'Galeri',
    about: 'Tentang Kami',
    settings: 'Pengaturan',
  };

  let resetConfirmPending = false;

  root.innerHTML = `
    <div class="container section-pad-sm view-animate">
      <div class="admin-header">
        <div>
          <span class="eyebrow-text">Panel Pengelola</span>
          <h1 style="font-size:1.85rem;margin-top:0.2rem;">Dashboard Admin AcehHypeTrip</h1>
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button id="adm-reset" type="button" class="btn btn--outline btn--sm">Reset Data Awal</button>
          <button id="adm-logout" type="button" class="btn btn--forest btn--sm">Keluar</button>
        </div>
      </div>

      <div class="grid-stats">
        <div class="surface-card kpi-card">
          <span class="form-hint" style="margin:0;">Total Destinasi</span>
          <strong class="kpi-value tabular-nums">${store.destinations.length}</strong>
        </div>
        <div class="surface-card kpi-card">
          <span class="form-hint" style="margin:0;">Total Pemesanan</span>
          <strong class="kpi-value tabular-nums">${store.bookings.length}</strong>
        </div>
        <div class="surface-card kpi-card">
          <span class="form-hint" style="margin:0;">Menunggu Verifikasi</span>
          <strong class="kpi-value tabular-nums text-copper">${pendingCount}</strong>
        </div>
        <div class="surface-card kpi-card">
          <span class="form-hint" style="margin:0;">Foto Galeri</span>
          <strong class="kpi-value tabular-nums">${store.gallery.length}</strong>
        </div>
      </div>

      <div class="admin-tabs" role="tablist" aria-label="Kategori pengelolaan">
        ${Object.entries(tabLabels)
          .map(
            ([key, label]) => `
          <button
            type="button"
            role="tab"
            aria-selected="${store.adminTab === key}"
            data-tab="${key}"
            class="tab-btn ${store.adminTab === key ? 'is-active' : ''}"
          >${escapeHtml(label)}</button>
        `,
          )
          .join('')}
      </div>

      <div id="adm-body"></div>
    </div>
  `;

  root.querySelector('#adm-logout').addEventListener('click', () => {
    clearAdminSession();
    showToast('Anda telah keluar dari panel admin.');
    window.location.hash = '#home';
  });

  const resetBtn = root.querySelector('#adm-reset');
  resetBtn.addEventListener('click', async () => {
    if (!resetConfirmPending) {
      resetConfirmPending = true;
      resetBtn.classList.remove('btn--outline');
      resetBtn.classList.add('btn--danger');
      resetBtn.textContent = 'Klik lagi untuk konfirmasi reset';
      window.setTimeout(() => {
        if (resetConfirmPending) {
          resetConfirmPending = false;
          resetBtn.classList.remove('btn--danger');
          resetBtn.classList.add('btn--outline');
          resetBtn.textContent = 'Reset Data Awal';
        }
      }, 4000);
      return;
    }

    resetConfirmPending = false;
    resetBtn.disabled = true;
    resetBtn.textContent = 'Mereset...';
    try {
      const fresh = await api.resetAllData();
      store.destinations = fresh.destinations;
      store.bookings = fresh.bookings;
      store.gallery = fresh.gallery;
      store.settings = fresh.settings;
      store.editingDestinationId = null;
      showToast('Data aplikasi berhasil dikembalikan ke setelan awal.');
      paintAdminDashboard(root);
    } catch (err) {
      showToast(err.message || 'Gagal mereset data.', 'error');
      resetBtn.disabled = false;
      resetBtn.textContent = 'Reset Data Awal';
    }
  });

  root.querySelectorAll('.admin-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.adminTab = btn.dataset.tab;
      paintAdminDashboard(root);
    });
  });

  const body = root.querySelector('#adm-body');

  if (store.adminTab === 'destinations') {
    renderDestinationsTab(root, body, editItem);
  } else if (store.adminTab === 'bookings') {
    renderBookingsTab(root, body);
  } else if (store.adminTab === 'gallery') {
    renderGalleryTab(root, body);
  } else if (store.adminTab === 'about') {
    renderAboutTab(root, body);
  } else {
    renderSettingsTab(body);
  }
}

function renderDestinationsTab(root, body, editItem) {
  body.innerHTML = `
    <div class="form-stack">
      <div class="surface-card card-pad">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;margin-bottom:1.1rem;flex-wrap:wrap;">
          <h2 style="font-size:1.25rem;">
            ${editItem ? `Edit Destinasi: ${escapeHtml(editItem.name)}` : 'Tambah Destinasi Open Trip'}
          </h2>
          ${
            editItem
              ? '<button id="cancel-ed" type="button" class="btn btn--subtle btn--sm">Batal Edit</button>'
              : ''
          }
        </div>
        <form id="d-form" class="form-grid-3">
          <div>
            <label for="d-name" class="form-label">Nama Destinasi</label>
            <input id="d-name" class="form-control" required value="${escapeHtml(editItem?.name || '')}" />
          </div>
          <div>
            <label for="d-loc" class="form-label">Lokasi</label>
            <input id="d-loc" class="form-control" required value="${escapeHtml(editItem?.location || '')}" />
          </div>
          <div>
            <label for="d-map" class="form-label">Titik Maps / Koordinat</label>
            <input id="d-map" class="form-control" value="${escapeHtml(editItem?.map_query || '')}" placeholder="Nama lokasi atau lat,lng" />
          </div>
          <div>
            <label for="d-date" class="form-label">Tanggal Trip</label>
            <input id="d-date" class="form-control tabular-nums" type="date" required value="${escapeHtml(editItem?.trip_date || '2026-12-28')}" />
          </div>
          <div>
            <label for="d-price" class="form-label">Harga (IDR)</label>
            <input id="d-price" class="form-control tabular-nums" type="number" min="0" required value="${editItem?.price ?? 175000}" />
          </div>
          <div>
            <label for="d-quota" class="form-label">Kuota Peserta</label>
            <input id="d-quota" class="form-control tabular-nums" type="number" min="0" required value="${editItem?.quota ?? 16}" />
          </div>
          <div>
            <label for="d-status" class="form-label">Status Publikasi</label>
            <select id="d-status" class="form-control">
              <option value="Aktif" ${editItem?.status !== 'Draft' ? 'selected' : ''}>Aktif</option>
              <option value="Draft" ${editItem?.status === 'Draft' ? 'selected' : ''}>Draft</option>
            </select>
          </div>
          <div>
            <label for="d-url" class="form-label">URL Foto (Opsional)</label>
            <input id="d-url" class="form-control" type="url" value="${escapeHtml(editItem?.image?.startsWith('http') ? editItem.image : '')}" placeholder="https://..." />
          </div>
          <div>
            <label for="d-file" class="form-label">Atau Unggah Foto Lokal</label>
            <input id="d-file" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>
          <div style="grid-column:1/-1;">
            <label for="d-desc" class="form-label">Deskripsi Singkat</label>
            <input id="d-desc" class="form-control" required value="${escapeHtml(editItem?.description || '')}" />
          </div>
          <div style="grid-column:1/-1;">
            <button id="d-submit" type="submit" class="btn btn--primary">
              ${editItem ? 'Simpan Perubahan' : 'Tambah Destinasi'}
            </button>
          </div>
        </form>
      </div>

      <div class="surface-card table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Destinasi</th>
              <th>Lokasi</th>
              <th>Tanggal</th>
              <th>Harga</th>
              <th>Kuota</th>
              <th>Peta</th>
              <th>Status</th>
              <th style="text-align:right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${
              store.destinations.length
                ? store.destinations
                    .map(
                      (d) => `
                <tr>
                  <td><strong>${escapeHtml(d.name)}</strong></td>
                  <td>${escapeHtml(d.location)}</td>
                  <td class="tabular-nums">${escapeHtml(formatDateId(d.trip_date))}</td>
                  <td class="text-copper tabular-nums">${escapeHtml(formatRupiah(d.price))}</td>
                  <td class="tabular-nums">${d.quota}</td>
                  <td><button type="button" data-adm-map="${d.id}" class="btn btn--outline btn--sm">Peta</button></td>
                  <td><span class="status-label ${getStatusClass(d.status)}">${escapeHtml(d.status)}</span></td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button type="button" data-ed="${d.id}" class="btn btn--outline btn--sm">Edit</button>
                    <button type="button" data-dl="${d.id}" class="btn btn--danger btn--sm">Hapus</button>
                  </td>
                </tr>
              `,
                    )
                    .join('')
                : '<tr><td colspan="8" class="empty-state">Belum ada destinasi.</td></tr>'
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  body.querySelector('#cancel-ed')?.addEventListener('click', () => {
    store.editingDestinationId = null;
    paintAdminDashboard(root);
  });

  body.querySelector('#d-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = body.querySelector('#d-submit');
    submitBtn.disabled = true;

    try {
      const name = body.querySelector('#d-name').value.trim();
      const location = body.querySelector('#d-loc').value.trim();
      const mapQuery = body.querySelector('#d-map').value.trim() || `${name}, ${location}, Aceh`;
      const file = body.querySelector('#d-file').files[0];
      const urlVal = body.querySelector('#d-url').value.trim();
      const image = file
        ? await compressImageFile(file, 960)
        : urlVal || editItem?.image || '/src/assets/images/hero_aceh_expedition_1795593548981.jpg';

      const payload = {
        name,
        location,
        map_query: mapQuery,
        trip_date: body.querySelector('#d-date').value,
        price: Number(body.querySelector('#d-price').value) || 0,
        quota: Number(body.querySelector('#d-quota').value) || 0,
        status: body.querySelector('#d-status').value,
        image,
        description: body.querySelector('#d-desc').value.trim(),
      };

      if (editItem) {
        const res = await api.updateDestination(editItem.id, payload);
        const idx = store.destinations.findIndex((d) => d.id === editItem.id);
        if (idx !== -1) store.destinations[idx] = res.destination;
        showToast('Destinasi berhasil diperbarui.');
      } else {
        const res = await api.createDestination(payload);
        store.destinations.unshift(res.destination);
        showToast('Destinasi baru ditambahkan.');
      }

      store.editingDestinationId = null;
      paintAdminDashboard(root);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan destinasi.', 'error');
      submitBtn.disabled = false;
    }
  });

  body.querySelectorAll('[data-adm-map]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const trip = store.destinations.find((d) => d.id === Number(btn.dataset.admMap));
      if (trip) openMapModal(trip);
    });
  });

  body.querySelectorAll('[data-ed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      store.editingDestinationId = Number(btn.dataset.ed);
      paintAdminDashboard(root);
    });
  });

  body.querySelectorAll('[data-dl]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.dl);
      btn.disabled = true;
      try {
        await api.deleteDestination(id);
        store.destinations = store.destinations.filter((d) => d.id !== id);
        showToast('Destinasi dihapus.');
        paintAdminDashboard(root);
      } catch (err) {
        showToast(err.message || 'Gagal menghapus destinasi.', 'error');
        btn.disabled = false;
      }
    });
  });
}

function renderBookingsTab(root, body) {
  const statuses = ['Menunggu Pembayaran', 'Menunggu Verifikasi', 'Diterima', 'Ditolak'];

  body.innerHTML = `
    <div class="surface-card table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Kode Booking</th>
            <th>Peserta</th>
            <th>Destinasi</th>
            <th>Total</th>
            <th>Bukti Transfer</th>
            <th>Status Verifikasi</th>
          </tr>
        </thead>
        <tbody>
          ${
            store.bookings.length
              ? store.bookings
                  .map(
                    (b) => `
              <tr>
                <td class="font-mono"><strong>${escapeHtml(b.booking_code)}</strong></td>
                <td>
                  <strong>${escapeHtml(b.customer_name)}</strong><br />
                  <span class="text-muted tabular-nums" style="font-size:0.8rem;">${escapeHtml(b.whatsapp)}</span>
                </td>
                <td class="tabular-nums">${escapeHtml(b.destination_name)} (${b.participants} org)</td>
                <td class="text-copper tabular-nums"><strong>${escapeHtml(formatRupiah(b.total_price))}</strong></td>
                <td>
                  ${
                    b.payment_proof
                      ? `<button type="button" data-pf="${escapeHtml(b.booking_code)}" class="btn btn--outline btn--sm">Lihat Bukti</button>`
                      : '<span class="text-muted">Belum diunggah</span>'
                  }
                </td>
                <td>
                  <select data-st="${escapeHtml(b.booking_code)}" class="form-control" style="min-width:11rem;">
                    ${statuses
                      .map((s) => `<option value="${escapeHtml(s)}" ${b.status === s ? 'selected' : ''}>${escapeHtml(s)}</option>`)
                      .join('')}
                  </select>
                </td>
              </tr>
            `,
                  )
                  .join('')
              : '<tr><td colspan="6" class="empty-state">Belum ada pemesanan masuk.</td></tr>'
          }
        </tbody>
      </table>
    </div>
  `;

  body.querySelectorAll('[data-pf]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const booking = store.bookings.find((b) => b.booking_code === btn.dataset.pf);
      if (booking) {
        openImageModal(`Bukti Pembayaran ${booking.booking_code}`, booking.payment_proof);
      }
    });
  });

  body.querySelectorAll('[data-st]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const code = sel.dataset.st;
      const nextStatus = sel.value;
      sel.disabled = true;
      try {
        const res = await api.updateBookingStatus(code, nextStatus);
        const idx = store.bookings.findIndex((b) => b.booking_code === code);
        if (idx !== -1) store.bookings[idx] = res.booking;
        // Refresh bootstrap so restored/deducted quotas stay synced
        const fresh = await api.fetchAdminBootstrap();
        store.destinations = fresh.destinations;
        store.bookings = fresh.bookings;
        showToast('Status pemesanan diperbarui.');
        paintAdminDashboard(root);
      } catch (err) {
        showToast(err.message || 'Gagal memperbarui status.', 'error');
        paintAdminDashboard(root);
      }
    });
  });
}

function renderGalleryTab(root, body) {
  body.innerHTML = `
    <div class="form-stack">
      <div class="surface-card card-pad">
        <form id="g-form" class="form-grid-3" style="align-items:end;">
          <div>
            <label for="g-url" class="form-label">URL Foto (Opsional)</label>
            <input id="g-url" class="form-control" type="url" placeholder="https://..." />
          </div>
          <div>
            <label for="g-file" class="form-label">Atau Unggah Foto Lokal</label>
            <input id="g-file" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>
          <div>
            <label for="g-cap" class="form-label">Keterangan Foto</label>
            <input id="g-cap" class="form-control" required placeholder="Contoh: Panorama Savana Siron" />
          </div>
          <div style="grid-column:1/-1;">
            <button id="g-submit" type="submit" class="btn btn--primary">Tambah Foto Galeri</button>
          </div>
        </form>
      </div>

      <div class="grid-cards">
        ${store.gallery
          .map(
            (g) => `
          <div class="surface-card" style="overflow:hidden;">
            <div style="aspect-ratio:4/3;background:#112a1f;">
              <img src="${escapeHtml(sanitizeImageUrl(g.image, FALLBACK_IMG))}" alt="${escapeHtml(g.caption)}" style="width:100%;height:100%;object-fit:cover;" />
            </div>
            <div style="padding:1rem;display:flex;justify-content:space-between;align-items:center;gap:0.75rem;">
              <strong style="font-size:0.88rem;">${escapeHtml(g.caption)}</strong>
              <button type="button" data-dg="${g.id}" class="btn btn--danger btn--sm">Hapus</button>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
  `;

  bindImageFallbacks(body);

  body.querySelector('#g-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = body.querySelector('#g-submit');
    submitBtn.disabled = true;

    try {
      const file = body.querySelector('#g-file').files[0];
      const urlVal = body.querySelector('#g-url').value.trim();
      const image = file
        ? await compressImageFile(file, 960)
        : urlVal || '/src/assets/images/hero_aceh_expedition_1795593548981.jpg';
      const caption = body.querySelector('#g-cap').value.trim();

      const res = await api.addGalleryItem({ image, caption });
      store.gallery.unshift(res.item);
      showToast('Foto galeri ditambahkan.');
      paintAdminDashboard(root);
    } catch (err) {
      showToast(err.message || 'Gagal menambah foto galeri.', 'error');
      submitBtn.disabled = false;
    }
  });

  body.querySelectorAll('[data-dg]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.dg);
      btn.disabled = true;
      try {
        await api.deleteGalleryItem(id);
        store.gallery = store.gallery.filter((g) => g.id !== id);
        showToast('Foto galeri dihapus.');
        paintAdminDashboard(root);
      } catch (err) {
        showToast(err.message || 'Gagal menghapus foto.', 'error');
        btn.disabled = false;
      }
    });
  });
}

function renderAboutTab(root, body) {
  const curImg = sanitizeImageUrl(store.settings.about_image, FALLBACK_IMG);
  body.innerHTML = `
    <div class="surface-card card-pad" style="max-width:48rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.15rem;">
        <div>
          <h2 style="font-size:1.3rem;">Edit Konten Tentang Kami</h2>
          <p class="form-hint">Perubahan langsung tampil di bagian Tentang Kami pada halaman utama.</p>
        </div>
        <a href="#about" class="btn btn--outline btn--sm">Lihat di Beranda</a>
      </div>

      <form id="about-edit-form" class="form-stack">
        <div class="form-grid-2">
          <div>
            <label for="ab-badge" class="form-label">Label Bagian</label>
            <input id="ab-badge" class="form-control" type="text" required value="${escapeHtml(store.settings.about_badge || '')}" />
          </div>
          <div>
            <label for="ab-cta" class="form-label">Teks Tombol CTA</label>
            <input id="ab-cta" class="form-control" type="text" required value="${escapeHtml(store.settings.about_cta_text || '')}" />
          </div>
        </div>
        <div>
          <label for="ab-title" class="form-label">Judul Tentang Kami</label>
          <input id="ab-title" class="form-control" type="text" required value="${escapeHtml(store.settings.about_title || '')}" />
        </div>
        <div>
          <label for="ab-desc" class="form-label">Deskripsi Tentang Kami</label>
          <textarea id="ab-desc" class="form-control" required>${escapeHtml(store.settings.about_description || '')}</textarea>
        </div>
        <div class="form-grid-2">
          <div>
            <label for="ab-url" class="form-label">URL Foto (Opsional)</label>
            <input id="ab-url" class="form-control" type="url" value="${escapeHtml(store.settings.about_image?.startsWith('http') ? store.settings.about_image : '')}" placeholder="https://..." />
          </div>
          <div>
            <label for="ab-file" class="form-label">Atau Unggah Foto Baru</label>
            <input id="ab-file" class="form-control" type="file" accept="image/jpeg,image/png,image/webp" />
          </div>
        </div>
        <div>
          <span class="form-label">Foto Saat Ini</span>
          <img
            src="${escapeHtml(curImg)}"
            alt="Pratinjau Tentang Kami"
            style="width:100%;max-height:14rem;object-fit:cover;border-radius:0.5rem;border:1px solid var(--color-border);"
          />
        </div>
        <div>
          <button id="ab-submit" type="submit" class="btn btn--primary">Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;

  bindImageFallbacks(body);

  body.querySelector('#about-edit-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = body.querySelector('#ab-submit');
    submitBtn.disabled = true;

    try {
      const file = body.querySelector('#ab-file').files[0];
      const urlVal = body.querySelector('#ab-url').value.trim();
      const aboutImage = file ? await compressImageFile(file, 1000) : urlVal || store.settings.about_image;

      const res = await api.updateSettings({
        about_badge: body.querySelector('#ab-badge').value.trim(),
        about_title: body.querySelector('#ab-title').value.trim(),
        about_description: body.querySelector('#ab-desc').value.trim(),
        about_cta_text: body.querySelector('#ab-cta').value.trim(),
        about_image: aboutImage,
      });
      store.settings = res.settings;
      showToast('Konten Tentang Kami berhasil diperbarui.');
      paintAdminDashboard(root);
    } catch (err) {
      showToast(err.message || 'Gagal memperbarui konten.', 'error');
      submitBtn.disabled = false;
    }
  });
}

function renderSettingsTab(body) {
  body.innerHTML = `
    <div class="surface-card card-pad" style="max-width:44rem;">
      <h2 style="font-size:1.3rem;margin-bottom:1rem;">Pengaturan Kontak &amp; Rekening Pembayaran</h2>
      <form id="s-form" class="form-stack">
        <div class="form-grid-2">
          <div>
            <label for="s-wa" class="form-label">Nomor WhatsApp Admin</label>
            <input id="s-wa" class="form-control tabular-nums" required value="${escapeHtml(store.settings.whatsapp)}" />
          </div>
          <div>
            <label for="s-bk" class="form-label">Nama Bank</label>
            <input id="s-bk" class="form-control" required value="${escapeHtml(store.settings.bank)}" />
          </div>
          <div>
            <label for="s-ac" class="form-label">Nomor Rekening</label>
            <input id="s-ac" class="form-control font-mono" required value="${escapeHtml(store.settings.account)}" />
          </div>
          <div>
            <label for="s-an" class="form-label">Atas Nama Rekening</label>
            <input id="s-an" class="form-control" required value="${escapeHtml(store.settings.account_name)}" />
          </div>
          <div>
            <label for="s-qris" class="form-label">NMID QRIS</label>
            <input id="s-qris" class="form-control font-mono" value="${escapeHtml(store.settings.qris_nmid || '')}" />
          </div>
        </div>
        <div>
          <button id="s-submit" type="submit" class="btn btn--forest">Simpan Pengaturan</button>
        </div>
      </form>
    </div>
  `;

  body.querySelector('#s-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = body.querySelector('#s-submit');
    submitBtn.disabled = true;

    try {
      const res = await api.updateSettings({
        whatsapp: body.querySelector('#s-wa').value.trim(),
        bank: body.querySelector('#s-bk').value.trim(),
        account: body.querySelector('#s-ac').value.trim(),
        account_name: body.querySelector('#s-an').value.trim(),
        qris_nmid: body.querySelector('#s-qris').value.trim(),
      });
      store.settings = res.settings;
      showToast('Pengaturan pembayaran dan kontak disimpan.');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
