export const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#112a1f"/>
      <path d="M0 440 L210 260 L380 390 L560 210 L800 420 L800 600 L0 600 Z" fill="#1b4131"/>
      <circle cx="580" cy="150" r="46" fill="#c88a1e" opacity="0.85"/>
      <text x="400" y="540" fill="#f6f7f5" font-family="sans-serif" font-size="20" font-weight="600" text-anchor="middle">AcehHypeTrip — Jalur Alam Aceh</text>
    </svg>
  `);

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatRupiah(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

export function formatDateId(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr || '-';
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.startsWith('0') ? '62' + digits.slice(1) : digits;
}

export function sanitizeImageUrl(url, fallback = FALLBACK_IMG) {
  const raw = String(url ?? '').trim();
  if (!raw) return fallback;
  if (raw.startsWith('/src/assets/')) return raw;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(raw)) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function bindImageFallbacks(container) {
  container.querySelectorAll('img').forEach((img) => {
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.addEventListener(
      'error',
      () => {
        if (img.src !== FALLBACK_IMG) {
          img.src = FALLBACK_IMG;
        }
      },
      { once: true },
    );
  });
}

export function compressImageFile(file, maxWidth = 960) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      reject(new Error('Format gambar harus JPG, PNG, atau WEBP.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('File gambar tidak valid.'));
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function getStatusClass(status) {
  switch (status) {
    case 'Diterima':
    case 'Aktif':
      return 'status-label--ok';
    case 'Menunggu Verifikasi':
      return 'status-label--warn';
    case 'Ditolak':
      return 'status-label--danger';
    default:
      return 'status-label--muted';
  }
}
