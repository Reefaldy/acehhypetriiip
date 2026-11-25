import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import {
  createSeedData,
  hashPassword,
  maskPhone,
  mutateDb,
  normalizePhone,
  readDb,
  sanitizeMediaUrl,
  timingSafeStringEqual,
  verifyPassword,
  type Booking,
  type Destination,
} from './server/store.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_PROOF_CHARS = 3_000_000;

const VALID_BOOKING_STATUSES: ReadonlyArray<Booking['status']> = [
  'Menunggu Pembayaran',
  'Menunggu Verifikasi',
  'Diterima',
  'Ditolak',
];

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function issueToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'admin',
      exp: expiresAt,
      jti: crypto.randomBytes(12).toString('hex'),
    }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresAt };
}

function verifyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  if (!payload || !sig) return false;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    return decoded.sub === 'admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: express.Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = extractBearerToken(req);
  if (!token || !verifyToken(token)) {
    res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' });
    return;
  }
  next();
}

function sanitizeBookingForPublic(b: Booking) {
  return {
    booking_code: b.booking_code,
    destination_id: b.destination_id,
    destination_name: b.destination_name,
    customer_name: b.customer_name,
    whatsapp_masked: maskPhone(b.whatsapp),
    participants: b.participants,
    total_price: b.total_price,
    payment_method: b.payment_method,
    payment_proof: b.payment_proof,
    payment_proof_name: b.payment_proof_name,
    status: b.status,
    created_at: b.created_at,
  };
}

async function createServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '4mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public catalog, gallery, and settings
  app.get('/api/public', (_req, res) => {
    const db = readDb();
    res.json({
      destinations: db.destinations.filter((d) => d.status === 'Aktif'),
      gallery: db.gallery,
      settings: db.settings,
    });
  });

  // Create booking atomically
  app.post('/api/bookings', async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const destinationId = Number(body.destination_id);
      const customerName = String(body.customer_name ?? '').trim();
      const whatsappRaw = String(body.whatsapp ?? '').trim();
      const normalizedWa = normalizePhone(whatsappRaw);
      const participants = Math.floor(Number(body.participants));
      const paymentMethod = body.payment_method === 'QRIS' ? 'QRIS' : 'Transfer Bank';

      if (!Number.isInteger(destinationId) || destinationId <= 0) {
        res.status(400).json({ error: 'Destinasi tidak valid.' });
        return;
      }
      if (customerName.length < 2 || customerName.length > 100) {
        res.status(400).json({ error: 'Nama peserta harus diisi (2–100 karakter).' });
        return;
      }
      if (!/^628\d{8,12}$/.test(normalizedWa)) {
        res.status(400).json({ error: 'Masukkan nomor WhatsApp aktif Indonesia (cth: 0812xxxxxxxx).' });
        return;
      }
      if (!Number.isInteger(participants) || participants < 1 || participants > 50) {
        res.status(400).json({ error: 'Jumlah peserta tidak valid.' });
        return;
      }

      const outcome = await mutateDb((db) => {
        const trip = db.destinations.find((d) => d.id === destinationId && d.status === 'Aktif');
        if (!trip) {
          return { status: 404 as const, error: 'Destinasi tidak ditemukan atau sedang nonaktif.' };
        }
        if (trip.quota < participants) {
          return {
            status: 409 as const,
            error: trip.quota <= 0 ? 'Kuota trip sudah penuh.' : `Kuota tersisa hanya ${trip.quota} peserta.`,
          };
        }

        trip.quota -= participants;
        const dateStamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const code = `AHT${dateStamp}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const booking: Booking = {
          booking_code: code,
          destination_id: trip.id,
          destination_name: trip.name,
          customer_name: customerName,
          whatsapp: whatsappRaw,
          participants,
          total_price: trip.price * participants,
          payment_method: paymentMethod,
          payment_proof: '',
          payment_proof_name: '',
          status: 'Menunggu Pembayaran',
          created_at: new Date().toISOString(),
        };
        db.bookings.unshift(booking);
        return { status: 201 as const, booking };
      });

      if ('error' in outcome) {
        res.status(outcome.status).json({ error: outcome.error });
        return;
      }
      res.status(201).json({ booking: sanitizeBookingForPublic(outcome.booking) });
    } catch {
      res.status(500).json({ error: 'Gagal membuat pemesanan. Silakan coba lagi.' });
    }
  });

  // Fetch booking by code for payment page
  app.get('/api/bookings/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const db = readDb();
    const found = db.bookings.find((b) => b.booking_code.toUpperCase() === code);
    if (!found) {
      res.status(404).json({ error: 'Data pemesanan tidak ditemukan.' });
      return;
    }
    res.json({ booking: sanitizeBookingForPublic(found) });
  });

  // Upload payment proof
  app.post('/api/bookings/:code/proof', async (req, res) => {
    try {
      const code = String(req.params.code || '').trim().toUpperCase();
      const body = req.body as Record<string, unknown>;
      const rawProof = String(body.payment_proof ?? '').trim();
      const proofName = String(body.payment_proof_name ?? 'bukti-transfer.jpg')
        .trim()
        .slice(0, 120);

      if (!rawProof || rawProof.length > MAX_PROOF_CHARS) {
        res.status(400).json({ error: 'Ukuran bukti pembayaran terlalu besar atau kosong.' });
        return;
      }
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(rawProof)) {
        res.status(400).json({ error: 'Format gambar harus JPG, PNG, atau WEBP.' });
        return;
      }

      const outcome = await mutateDb((db) => {
        const booking = db.bookings.find((b) => b.booking_code.toUpperCase() === code);
        if (!booking) {
          return { status: 404 as const, error: 'Pesanan tidak ditemukan.' };
        }
        if (booking.status === 'Diterima') {
          return { status: 409 as const, error: 'Pembayaran untuk pesanan ini sudah diverifikasi.' };
        }
        booking.payment_proof = rawProof;
        booking.payment_proof_name = proofName || 'bukti-pembayaran.jpg';
        booking.status = 'Menunggu Verifikasi';
        return { status: 200 as const, booking };
      });

      if ('error' in outcome) {
        res.status(outcome.status).json({ error: outcome.error });
        return;
      }
      res.json({ booking: sanitizeBookingForPublic(outcome.booking) });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan bukti pembayaran.' });
    }
  });

  // Track order by code + WhatsApp
  app.post('/api/bookings/track', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const code = String(body.booking_code ?? '').trim().toUpperCase();
    const wa = normalizePhone(body.whatsapp);
    if (!code || !wa) {
      res.status(400).json({ error: 'Kode booking dan nomor WhatsApp wajib diisi.' });
      return;
    }
    const db = readDb();
    const found = db.bookings.find(
      (b) => b.booking_code.toUpperCase() === code && normalizePhone(b.whatsapp) === wa,
    );
    if (!found) {
      res.status(404).json({ error: 'Pesanan tidak ditemukan. Periksa kembali kode booking dan nomor WhatsApp.' });
      return;
    }
    res.json({ booking: sanitizeBookingForPublic(found) });
  });

  // Admin auth status
  app.get('/api/admin/auth/status', (req, res) => {
    const db = readDb();
    const envPasscode = getEnvPasscode();
    const envManaged = envPasscode.length > 0;
    const needsSetup = !envManaged && !db.adminAuth;
    const token = extractBearerToken(req);
    const authenticated = Boolean(token && verifyToken(token));
    res.json({ envManaged, needsSetup, authenticated });
  });

  // First-run admin password setup (locked once claimed or when ADMIN_PASSCODE is set)
  app.post('/api/admin/auth/setup', async (req, res) => {
    if (getEnvPasscode().length > 0) {
      res.status(403).json({ error: 'Password admin dikelola melalui konfigurasi lingkungan server.' });
      return;
    }
    const body = req.body as Record<string, unknown>;
    const password = String(body.password ?? '');
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password admin minimal 8 karakter.' });
      return;
    }

    const outcome = await mutateDb((db) => {
      if (db.adminAuth) {
        return { ok: false as const };
      }
      db.adminAuth = hashPassword(password);
      return { ok: true as const };
    });

    if (!outcome.ok) {
      res.status(409).json({ error: 'Akun admin sudah diaktifkan. Silakan login menggunakan password Anda.' });
      return;
    }
    const session = issueToken();
    res.status(201).json(session);
  });

  // Admin login
  app.post('/api/admin/auth/login', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const password = String(body.password ?? '');
    if (!password) {
      res.status(400).json({ error: 'Password admin wajib diisi.' });
      return;
    }

    const envPasscode = getEnvPasscode();
    if (envPasscode.length > 0) {
      if (!timingSafeStringEqual(password, envPasscode)) {
        res.status(401).json({ error: 'Password admin tidak sesuai.' });
        return;
      }
      res.json(issueToken());
      return;
    }

    const db = readDb();
    if (!db.adminAuth) {
      res.status(409).json({ error: 'Admin belum diaktifkan. Buat password admin terlebih dahulu.' });
      return;
    }
    if (!verifyPassword(password, db.adminAuth)) {
      res.status(401).json({ error: 'Password admin tidak sesuai.' });
      return;
    }
    res.json(issueToken());
  });

  // Admin dashboard bootstrap
  app.get('/api/admin/bootstrap', requireAdmin, (_req, res) => {
    const db = readDb();
    res.json({
      destinations: db.destinations,
      bookings: db.bookings,
      gallery: db.gallery,
      settings: db.settings,
      envManaged: getEnvPasscode().length > 0,
    });
  });

  // Admin: create destination
  app.post('/api/admin/destinations', requireAdmin, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const location = String(body.location ?? '').trim();
    const description = String(body.description ?? '').trim();
    const tripDate = String(body.trip_date ?? '').trim();
    const price = Math.max(0, Math.floor(Number(body.price) || 0));
    const quota = Math.max(0, Math.floor(Number(body.quota) || 0));
    const status: Destination['status'] = body.status === 'Draft' ? 'Draft' : 'Aktif';
    const mapQuery = String(body.map_query ?? '').trim() || `${name}, ${location}, Aceh`;
    const image = sanitizeMediaUrl(
      body.image,
      '/src/assets/images/hero_aceh_expedition_1795593548981.jpg',
    );

    if (!name || !location || !tripDate || !description) {
      res.status(400).json({ error: 'Nama, lokasi, tanggal, dan deskripsi wajib diisi.' });
      return;
    }

    const created = await mutateDb((db) => {
      const nextId = db.destinations.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const dest: Destination = {
        id: nextId,
        name,
        location,
        map_query: mapQuery,
        trip_date: tripDate,
        price,
        quota,
        image,
        description,
        status,
      };
      db.destinations.unshift(dest);
      return dest;
    });

    res.status(201).json({ destination: created });
  });

  // Admin: update destination
  app.put('/api/admin/destinations/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const location = String(body.location ?? '').trim();
    const description = String(body.description ?? '').trim();
    const tripDate = String(body.trip_date ?? '').trim();
    const price = Math.max(0, Math.floor(Number(body.price) || 0));
    const quota = Math.max(0, Math.floor(Number(body.quota) || 0));
    const status: Destination['status'] = body.status === 'Draft' ? 'Draft' : 'Aktif';
    const mapQuery = String(body.map_query ?? '').trim() || `${name}, ${location}, Aceh`;

    if (!Number.isInteger(id) || !name || !location || !tripDate || !description) {
      res.status(400).json({ error: 'Data destinasi tidak lengkap.' });
      return;
    }

    const updated = await mutateDb((db) => {
      const target = db.destinations.find((d) => d.id === id);
      if (!target) return null;
      const image = sanitizeMediaUrl(body.image, target.image);
      Object.assign(target, {
        name,
        location,
        map_query: mapQuery,
        trip_date: tripDate,
        price,
        quota,
        status,
        image,
        description,
      });
      return target;
    });

    if (!updated) {
      res.status(404).json({ error: 'Destinasi tidak ditemukan.' });
      return;
    }
    res.json({ destination: updated });
  });

  // Admin: delete destination
  app.delete('/api/admin/destinations/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const removed = await mutateDb((db) => {
      const before = db.destinations.length;
      db.destinations = db.destinations.filter((d) => d.id !== id);
      return db.destinations.length < before;
    });
    if (!removed) {
      res.status(404).json({ error: 'Destinasi tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  // Admin: update booking status (with atomic quota adjustment on rejection)
  app.patch('/api/admin/bookings/:code/status', requireAdmin, async (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const nextStatus = String((req.body as Record<string, unknown>).status ?? '') as Booking['status'];
    if (!VALID_BOOKING_STATUSES.includes(nextStatus)) {
      res.status(400).json({ error: 'Status pemesanan tidak valid.' });
      return;
    }

    const outcome = await mutateDb((db) => {
      const booking = db.bookings.find((b) => b.booking_code.toUpperCase() === code);
      if (!booking) return { status: 404 as const, error: 'Pesanan tidak ditemukan.' };
      const prevStatus = booking.status;
      if (prevStatus !== nextStatus) {
        const trip = db.destinations.find((d) => d.id === booking.destination_id);
        if (trip) {
          if (prevStatus !== 'Ditolak' && nextStatus === 'Ditolak') {
            trip.quota += booking.participants;
          } else if (prevStatus === 'Ditolak' && nextStatus !== 'Ditolak') {
            if (trip.quota < booking.participants) {
              return { status: 409 as const, error: 'Kuota destinasi tidak mencukupi untuk mengaktifkan kembali pesanan ini.' };
            }
            trip.quota -= booking.participants;
          }
        }
        booking.status = nextStatus;
      }
      return { status: 200 as const, booking };
    });

    if ('error' in outcome) {
      res.status(outcome.status).json({ error: outcome.error });
      return;
    }
    res.json({ booking: outcome.booking });
  });

  // Admin: add gallery item
  app.post('/api/admin/gallery', requireAdmin, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const caption = String(body.caption ?? '').trim();
    const image = sanitizeMediaUrl(
      body.image,
      '/src/assets/images/hero_aceh_expedition_1795593548981.jpg',
    );
    if (!caption) {
      res.status(400).json({ error: 'Keterangan foto wajib diisi.' });
      return;
    }
    const created = await mutateDb((db) => {
      const nextId = db.gallery.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const item = { id: nextId, image, caption };
      db.gallery.unshift(item);
      return item;
    });
    res.status(201).json({ item: created });
  });

  // Admin: delete gallery item
  app.delete('/api/admin/gallery/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const removed = await mutateDb((db) => {
      const before = db.gallery.length;
      db.gallery = db.gallery.filter((g) => g.id !== id);
      return db.gallery.length < before;
    });
    if (!removed) {
      res.status(404).json({ error: 'Foto galeri tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  // Admin: update settings (bank, whatsapp, qris, about page)
  app.put('/api/admin/settings', requireAdmin, async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const updated = await mutateDb((db) => {
      db.settings = {
        ...db.settings,
        whatsapp: body.whatsapp !== undefined ? String(body.whatsapp).trim() : db.settings.whatsapp,
        bank: body.bank !== undefined ? String(body.bank).trim() : db.settings.bank,
        account: body.account !== undefined ? String(body.account).trim() : db.settings.account,
        account_name:
          body.account_name !== undefined ? String(body.account_name).trim() : db.settings.account_name,
        qris_nmid: body.qris_nmid !== undefined ? String(body.qris_nmid).trim() : db.settings.qris_nmid,
        about_badge:
          body.about_badge !== undefined ? String(body.about_badge).trim() : db.settings.about_badge,
        about_title:
          body.about_title !== undefined ? String(body.about_title).trim() : db.settings.about_title,
        about_description:
          body.about_description !== undefined
            ? String(body.about_description).trim()
            : db.settings.about_description,
        about_cta_text:
          body.about_cta_text !== undefined ? String(body.about_cta_text).trim() : db.settings.about_cta_text,
        about_image:
          body.about_image !== undefined
            ? sanitizeMediaUrl(body.about_image, db.settings.about_image)
            : db.settings.about_image,
      };
      return db.settings;
    });
    res.json({ settings: updated });
  });

  // Admin: reset catalog & bookings to default seed (preserves adminAuth)
  app.post('/api/admin/reset', requireAdmin, async (_req, res) => {
    const snapshot = await mutateDb((db) => {
      const seed = createSeedData();
      db.destinations = seed.destinations;
      db.gallery = seed.gallery;
      db.bookings = [];
      db.settings = seed.settings;
      return db;
    });
    res.json({
      destinations: snapshot.destinations,
      bookings: snapshot.bookings,
      gallery: snapshot.gallery,
      settings: snapshot.settings,
    });
  });

  // Vite dev middleware or static production build
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AcehHypeTrip server listening on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
