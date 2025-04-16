# ZoomShareHub

Aplikasi berbasis Node.js + TypeScript untuk berbagi file dan integrasi Zoom, menggunakan PostgreSQL sebagai database utama.

---

## Prasyarat
- Node.js (disarankan versi terbaru LTS)
- npm
- PostgreSQL (pastikan sudah berjalan di komputer lokal)

## Langkah Instalasi dan Menjalankan Aplikasi

### 1. Clone Repository
```
git clone <URL_REPOSITORY>
cd ZoomShareHub
```

### 2. Install Dependency
```
npm install
npm install --save-dev tsx
npm install pg drizzle-orm
```

### 3. Setup Database PostgreSQL
- Pastikan PostgreSQL berjalan di komputer lokal.
- Buat database dengan nama `zoomshare_db` (jika belum ada):
  ```
  createdb -U postgres zoomshare_db
  ```
- Default user: `postgres`, password: `admin` (ubah sesuai konfigurasi lokal Anda)

### 4. Konfigurasi Environment Variable
Anda dapat menjalankan aplikasi dengan perintah berikut agar environment variable `DATABASE_URL` ter-set:
```
$env:DATABASE_URL='postgresql://postgres:admin@localhost:5432/zoomshare_db'; npm run dev
```
Atau buat file `.env` berisi:
```
DATABASE_URL=postgresql://postgres:admin@localhost:5432/zoomshare_db
```

### 5. Jalankan Aplikasi
```
npm run dev
```
Aplikasi akan berjalan di: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## Catatan Perubahan Penting
- **Driver database**: Menggunakan `pg` dan `drizzle-orm/node-postgres` untuk koneksi ke PostgreSQL lokal.
- **Server listen**: Menggunakan `server.listen(port, "127.0.0.1", ...)` agar kompatibel dengan Windows.
- **Dependency**: Pastikan `tsx`, `pg`, dan `drizzle-orm` sudah terinstall.

---

## Troubleshooting
- Jika gagal konek ke database, pastikan PostgreSQL berjalan dan database `zoomshare_db` sudah dibuat.
- Jika port 5000 sudah dipakai, ubah port di file `server/index.ts`.
- Jika ada error module, pastikan semua dependency sudah terinstall.

---

## Lisensi
MIT
