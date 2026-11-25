import { showToast } from '../components/toast.js';
import { api } from '../services/api.js';
import { isAdminAuthenticated, setAdminSession } from '../state/store.js';
import { escapeHtml } from '../utils/format.js';

export async function renderAdminLoginView(root) {
  if (isAdminAuthenticated()) {
    window.location.hash = '#admin';
    return;
  }

  root.innerHTML = `<div class="container section-pad narrow-wrap-sm"><div class="surface-card loading-state">Memeriksa status akses admin...</div></div>`;

  let status;
  try {
    status = await api.fetchAdminAuthStatus();
  } catch (err) {
    root.innerHTML = `
      <div class="container section-pad narrow-wrap-sm view-animate">
        <a href="#home" class="back-link">&larr; Kembali ke Beranda</a>
        <div class="surface-card card-pad">
          <div class="alert-banner alert-banner--error">${escapeHtml(err.message)}</div>
        </div>
      </div>
    `;
    return;
  }

  if (status.needsSetup) {
    root.innerHTML = `
      <div class="container section-pad narrow-wrap-sm view-animate">
        <a href="#home" class="back-link">&larr; Kembali ke Beranda</a>
        <div class="surface-card card-pad form-stack">
          <div>
            <span class="eyebrow-text">Aktivasi Awal Pengelola</span>
            <h1 style="font-size:1.65rem;margin-top:0.25rem;">Buat Password Admin</h1>
            <p class="text-muted" style="font-size:0.88rem;margin-top:0.35rem;">
              Belum ada password admin yang terdaftar pada server. Tetapkan password pengelola pertama untuk mengamankan portal ini.
            </p>
          </div>
          <form id="admin-setup-form" class="form-stack">
            <div>
              <label for="s-pass" class="form-label">Password Admin Baru (Minimal 8 Karakter)</label>
              <input id="s-pass" class="form-control" type="password" required minlength="8" autocomplete="new-password" placeholder="Masukkan password baru" />
            </div>
            <div>
              <label for="s-confirm" class="form-label">Konfirmasi Password</label>
              <input id="s-confirm" class="form-control" type="password" required minlength="8" autocomplete="new-password" placeholder="Ulangi password baru" />
            </div>
            <div id="s-err" class="alert-banner alert-banner--error hidden" role="alert"></div>
            <button id="s-submit" type="submit" class="btn btn--forest btn--lg btn--full">
              Simpan Password &amp; Masuk
            </button>
          </form>
        </div>
      </div>
    `;

    root.querySelector('#admin-setup-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errEl = root.querySelector('#s-err');
      const submitBtn = root.querySelector('#s-submit');
      const pass = root.querySelector('#s-pass').value;
      const confirm = root.querySelector('#s-confirm').value;

      errEl.classList.add('hidden');
      if (pass.length < 8) {
        errEl.textContent = 'Password minimal 8 karakter.';
        errEl.classList.remove('hidden');
        return;
      }
      if (pass !== confirm) {
        errEl.textContent = 'Konfirmasi password tidak cocok.';
        errEl.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengaktifkan Akun Admin...';
      try {
        const res = await api.setupAdminPassword(pass);
        setAdminSession(res.token, res.expiresAt);
        showToast('Password admin berhasil dibuat.');
        window.location.hash = '#admin';
      } catch (err) {
        errEl.textContent = err.message || 'Gagal mengaktifkan akun admin.';
        errEl.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Simpan Password & Masuk';
      }
    });
    return;
  }

  root.innerHTML = `
    <div class="container section-pad narrow-wrap-sm view-animate">
      <a href="#home" class="back-link">&larr; Kembali ke Beranda</a>
      <div class="surface-card card-pad form-stack">
        <div>
          <span class="eyebrow-text">Akses Pengelola</span>
          <h1 style="font-size:1.65rem;margin-top:0.25rem;">Login Dashboard Admin</h1>
          <p class="text-muted" style="font-size:0.88rem;margin-top:0.35rem;">
            Halaman ini khusus untuk pengelola AcehHypeTrip guna memverifikasi pembayaran dan mengelola jadwal trip.
          </p>
        </div>
        <form id="login-form" class="form-stack">
          <div>
            <label for="l-pass" class="form-label">Password Admin</label>
            <input
              id="l-pass"
              class="form-control"
              type="password"
              required
              autocomplete="current-password"
              placeholder="Masukkan password admin"
            />
          </div>
          <div id="l-err" class="alert-banner alert-banner--error hidden" role="alert"></div>
          <button id="l-submit" type="submit" class="btn btn--forest btn--lg btn--full">
            Masuk ke Dashboard Admin
          </button>
        </form>
      </div>
    </div>
  `;

  root.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const errEl = root.querySelector('#l-err');
    const submitBtn = root.querySelector('#l-submit');
    const password = root.querySelector('#l-pass').value;

    errEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memverifikasi...';

    try {
      const res = await api.loginAdmin(password);
      setAdminSession(res.token, res.expiresAt);
      showToast('Berhasil masuk ke portal admin.');
      window.location.hash = '#admin';
    } catch (err) {
      errEl.textContent = err.message || 'Password admin tidak sesuai.';
      errEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk ke Dashboard Admin';
    }
  });
}
