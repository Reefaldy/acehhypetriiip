import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface Destination {
  id: number;
  name: string;
  location: string;
  map_query: string;
  trip_date: string;
  price: number;
  quota: number;
  image: string;
  description: string;
  status: 'Aktif' | 'Draft';
}

export interface GalleryItem {
  id: number;
  image: string;
  caption: string;
}

export interface Booking {
  booking_code: string;
  destination_id: number;
  destination_name: string;
  customer_name: string;
  whatsapp: string;
  participants: number;
  total_price: number;
  payment_method: 'Transfer Bank' | 'QRIS';
  payment_proof: string;
  payment_proof_name: string;
  status: 'Menunggu Pembayaran' | 'Menunggu Verifikasi' | 'Diterima' | 'Ditolak';
  created_at: string;
}

export interface SiteSettings {
  whatsapp: string;
  bank: string;
  account: string;
  account_name: string;
  qris_nmid: string;
  hero_image: string;
  about_badge: string;
  about_title: string;
  about_description: string;
  about_cta_text: string;
  about_image: string;
}

export interface AdminAuthRecord {
  salt: string;
  hash: string;
  created_at: string;
}

export interface DatabaseSchema {
  destinations: Destination[];
  gallery: GalleryItem[];
  bookings: Booking[];
  settings: SiteSettings;
  adminAuth: AdminAuthRecord | null;
}

const HERO_IMAGE = '/src/assets/images/hero_aceh_expedition_1795593548981.jpg';
const IMG_LHOK_KETAPANG = '/src/assets/images/dest_lhok_ketapang_1795593549717.jpg';
const IMG_SAVANA_SIRON = '/src/assets/images/dest_savana_siron_1795593550094.jpg';
const IMG_LHOK_MATA_IE = '/src/assets/images/dest_lhok_mata_ie_1795593551094.jpg';
const IMG_LUTHU = '/src/assets/images/dest_air_terjun_luthu_1795593551428.jpg';
const IMG_SELAWAH = '/src/assets/images/dest_selawah_agam_1795593551517.jpg';
const IMG_PEUNCARI = '/src/assets/images/dest_peuncari_cot_1795593552551.jpg';
const IMG_COT_GOH_DUA = '/src/assets/images/dest_cot_goh_dua_1795593553377.jpg';

export function createSeedData(): Omit<DatabaseSchema, 'adminAuth'> {
  return {
    destinations: [
      {
        id: 1,
        name: 'Lhok Ketapang',
        location: 'Ujong Pancu, Aceh Besar',
        map_query: 'Pantai Lhok Keutapang Ujong Pancu Aceh Besar',
        trip_date: '2026-12-06',
        price: 165000,
        quota: 18,
        image: IMG_LHOK_KETAPANG,
        description:
          'Eksplorasi sudut pesisir tersembunyi Lhok Ketapang dengan suasana tenang, angin laut segar, dan garis pantai alami.',
        status: 'Aktif',
      },
      {
        id: 2,
        name: 'Savana Siron',
        location: 'Kuta Cot Glie, Aceh Besar',
        map_query: 'Bukit Savana Siron Krueng Kuta Cot Glie Aceh Besar',
        trip_date: '2026-12-13',
        price: 145000,
        quota: 22,
        image: IMG_SAVANA_SIRON,
        description:
          'Hamparan padang savana hijau berbukit di Aceh Besar yang cocok untuk wisata alam santai dan dokumentasi perjalanan.',
        status: 'Aktif',
      },
      {
        id: 3,
        name: 'Lhok Mata Ie',
        location: 'Peukan Bada, Aceh Besar',
        map_query: 'Pantai Lhok Mata Ie Ujong Pancu Aceh Besar',
        trip_date: '2026-12-20',
        price: 155000,
        quota: 20,
        image: IMG_LHOK_MATA_IE,
        description:
          'Teluk kecil tersembunyi di balik tebing dan perbukitan Aceh Besar dengan panorama laut lepas dan suasana damai.',
        status: 'Aktif',
      },
      {
        id: 4,
        name: 'Air Terjun Luthu',
        location: 'Suka Makmur, Aceh Besar',
        map_query: 'Wisata Air Terjun Luthu Suka Makmur Aceh Besar',
        trip_date: '2026-12-27',
        price: 235000,
        quota: 14,
        image: IMG_LUTHU,
        description:
          'Menyusuri jalur alam dataran tinggi menuju Air Terjun Luthu yang berudara sejuk dan jauh dari keramaian.',
        status: 'Aktif',
      },
      {
        id: 5,
        name: 'Air Terjun Selawah Agam',
        location: 'Seulawah, Aceh Besar',
        map_query: 'Gunung Seulawah Agam Aceh Besar',
        trip_date: '2027-01-03',
        price: 195000,
        quota: 16,
        image: IMG_SELAWAH,
        description:
          'Petualangan menyegarkan di kawasan kaki Gunung Seulawah Agam dengan aliran air jernih dan hutan asri.',
        status: 'Aktif',
      },
      {
        id: 6,
        name: 'Air Terjun Monceunong',
        location: 'Indrapuri, Aceh Besar',
        map_query: 'Air Terjun Mon Ceunong Aneuk Glee Indrapuri Aceh Besar',
        trip_date: '2027-01-10',
        price: 175000,
        quota: 16,
        image: IMG_PEUNCARI,
        description:
          'Rute tersembunyi menuju Air Terjun Monceunong dengan rimbun pepohonan asri dan suasana alam yang masih alami.',
        status: 'Aktif',
      },
      {
        id: 7,
        name: 'Air Terjun Peuncari Cot',
        location: 'Kota Jantho, Aceh Besar',
        map_query: 'Air Terjun Peucari Kota Jantho Aceh Besar',
        trip_date: '2027-01-17',
        price: 180000,
        quota: 16,
        image: IMG_LUTHU,
        description:
          'Trip jalur bukit dan hutan menuju Air Terjun Peuncari Cot bagi pencinta eksplorasi alam yang jarang dikunjungi.',
        status: 'Aktif',
      },
      {
        id: 8,
        name: 'Bukit Cot Goh Dua',
        location: 'Aceh Besar',
        map_query: 'Bukit Cot Goh Dua Aceh Besar',
        trip_date: '2027-01-24',
        price: 150000,
        quota: 20,
        image: IMG_COT_GOH_DUA,
        description:
          'Menikmati panorama perbukitan dan lanskap terbuka dari Bukit Cot Goh Dua saat pagi atau sore hari.',
        status: 'Aktif',
      },
    ],
    gallery: [
      { id: 1, image: IMG_LHOK_KETAPANG, caption: 'Suasana pesisir Lhok Ketapang' },
      { id: 2, image: IMG_SAVANA_SIRON, caption: 'Padang Savana Siron Aceh Besar' },
      { id: 3, image: IMG_LHOK_MATA_IE, caption: 'Teluk tenang Lhok Mata Ie' },
      { id: 4, image: IMG_LUTHU, caption: 'Aliran Air Terjun Luthu' },
      { id: 5, image: IMG_SELAWAH, caption: 'Kawasan sejuk Selawah Agam' },
      { id: 6, image: IMG_COT_GOH_DUA, caption: 'Panorama Bukit Cot Goh Dua' },
    ],
    bookings: [],
    settings: {
      whatsapp: '6281200000000',
      bank: 'Bank Syariah Indonesia (BSI)',
      account: '7123456789',
      account_name: 'AcehHypeTrip Open Trip',
      qris_nmid: 'ID1026000888999',
      hero_image: HERO_IMAGE,
      about_badge: 'Tentang AcehHypeTrip',
      about_title: 'Menjangkau Spot Alami yang Jarang Dikunjungi.',
      about_description:
        'Dari pesisir tenang Lhok Ketapang dan Lhok Mata Ie, luasnya Savana Siron dan Bukit Cot Goh Dua, hingga segarnya Air Terjun Luthu, Selawah Agam, Monceunong, dan Peuncari Cot—kami kemas dalam perjalanan terarah dan berkesan.',
      about_cta_text: 'Hubungi via WhatsApp',
      about_image: HERO_IMAGE,
    },
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let writeQueue: Promise<unknown> = Promise.resolve();

function ensureDbFile(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial: DatabaseSchema = {
      ...createSeedData(),
      adminAuth: null,
    };
    const tmpPath = `${DB_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(initial, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    const seed = createSeedData();
    return {
      destinations: Array.isArray(parsed.destinations) ? parsed.destinations : seed.destinations,
      gallery: Array.isArray(parsed.gallery) ? parsed.gallery : seed.gallery,
      bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
      settings: { ...seed.settings, ...(parsed.settings || {}) },
      adminAuth: parsed.adminAuth && typeof parsed.adminAuth.hash === 'string' ? parsed.adminAuth : null,
    };
  } catch {
    const fallback: DatabaseSchema = {
      ...createSeedData(),
      adminAuth: null,
    };
    return fallback;
  }
}

export function readDb(): DatabaseSchema {
  return ensureDbFile();
}

export function mutateDb<T>(mutator: (db: DatabaseSchema) => T | Promise<T>): Promise<T> {
  const next = writeQueue.then(async () => {
    const db = ensureDbFile();
    const result = await mutator(db);
    const tmpPath = `${DB_PATH}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmpPath, DB_PATH);
    return result;
  });
  writeQueue = next.catch(() => undefined);
  return next;
}

export function sanitizeMediaUrl(url: unknown, fallback = ''): string {
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

export function normalizePhone(phone: unknown): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  return digits;
}

export function maskPhone(phone: string): string {
  const clean = String(phone ?? '').trim();
  if (clean.length <= 6) return '••••••';
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}

export function hashPassword(password: string, salt?: string): AdminAuthRecord {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return {
    salt: usedSalt,
    hash,
    created_at: new Date().toISOString(),
  };
}

export function verifyPassword(password: string, record: AdminAuthRecord): boolean {
  const derived = crypto.scryptSync(password, record.salt, 64);
  const stored = Buffer.from(record.hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
