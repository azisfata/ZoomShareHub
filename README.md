# ZoomShareHub

Aplikasi manajemen akun Zoom berbasis web yang memungkinkan pengguna untuk meminjam akun Zoom dengan fitur manajemen pengguna dan booking yang mudah digunakan.

## Fitur Utama
- ✅ Autentikasi pengguna dengan sistem role (admin/user)
- ✅ Manajemen akun Zoom
- ✅ Sistem booking/peminjaman akun
- ✅ Multi-login (satu akun bisa login di beberapa perangkat)
- ✅ Real-time updates menggunakan WebSocket
- ✅ Dashboard admin untuk manajemen pengguna dan akun

## Teknologi
- **Frontend**: React.js + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: MySQL
- **Autentikasi**: JWT + Session
- **Styling**: Tailwind CSS + Shadcn UI

## Prasyarat
- Node.js (versi 18+)
- npm (versi 9+)
- MySQL Server
- Git

## Instalasi

### 1. Clone Repository
```bash
git clone https://github.com/azisfata/ZoomShareHub.git
cd ZoomShareHub
```

### 2. Install Dependencies
```bash
# Install dependencies utama
npm install

# Masuk ke direktori client dan install dependencies frontend
cd client
npm install
cd ..
```

### 3. Setup Database
1. Buat database MySQL baru
2. Import skema database dari file `database/schema.sql`

### 4. Konfigurasi Environment
Buat file `.env` di root direktori dengan konten:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=zoomsharehub
DB_PORT=3306

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Session
SESSION_SECRET=your_session_secret
```

### 5. Menjalankan Aplikasi

#### Mode Development
```bash
# Jalankan backend
export NODE_ENV=development
npm run dev

# Di terminal terpisah, jalankan frontend
cd client
npm run dev
```

#### Mode Produksi
```bash
# Build aplikasi
npm run build

# Jalankan aplikasi
npm start
```

Aplikasi akan berjalan di:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Struktur Proyek
```
ZoomShareHub/
├── client/                 # Frontend React
├── server/                 # Backend Node.js
│   ├── controllers/       # Controller untuk route
│   ├── middleware/        # Middleware
│   ├── models/            # Model database
│   ├── routes/            # Route definitions
│   └── utils/             # Utility functions
├── database/              # Skema dan migrasi database
└── shared/                # Kode yang dibagi antara frontend dan backend
```

## Kontribusi
1. Fork repository
2. Buat branch fitur (`git checkout -b fitur/namafitur`)
3. Commit perubahan (`git commit -am 'Menambahkan fitur baru'`)
4. Push ke branch (`git push origin fitur/namafitur`)
5. Buat Pull Request

## Lisensi
MIT © 2025 ZoomShareHub Team
