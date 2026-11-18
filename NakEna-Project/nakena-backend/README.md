# NakEna Backend API

Backend ini hanya menangani REST API, autentikasi, database, upload gambar, deteksi YOLO, dan generasi resep Gemini. HTML, CSS, dan JavaScript website berada di folder terpisah `../NakEna_Frontend`.

## Struktur

```text
nakena-backend/
├── app/
│   ├── api/routes/       # auth, users, uploads, recipes
│   ├── core/             # config, database, security
│   ├── models/           # model SQLAlchemy
│   ├── schemas/          # request/response Pydantic
│   ├── services/         # YOLO, Gemini, image validation, storage
│   └── main.py           # API entry point (JSON only)
├── models/chefai_best_latest.pt # bobot YOLO terbaru
├── storage/              # lokasi file upload runtime
├── tests/
├── .env.example
└── requirements.txt
```

## Menyiapkan backend (Windows PowerShell)

```powershell
cd .\nakena-backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
notepad .env
```

Isi `SECRET_KEY` dengan string acak minimal 32 karakter dan `GEMINI_API_KEY` dengan API key milikmu. Konfigurasi lokal contoh memakai SQLite (`sqlite:///./nakena.db`). Model YOLO terbaru harus tersedia di `models/chefai_best_latest.pt`.

Untuk membuat akun admin saat backend mulai, isi `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env`. Password admin mengikuti kebijakan yang sama seperti registrasi: 8–64 karakter, memiliki huruf besar, huruf kecil, angka, dan tidak sama dengan email atau nama akun. Kosongkan keduanya jika tidak ingin menjalankan seeder admin.

Jalankan server:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API: `http://127.0.0.1:8000`  
Dokumentasi: `http://127.0.0.1:8000/docs`  
Health check: `http://127.0.0.1:8000/health`

## Menjalankan frontend

Buka terminal kedua dari root project:

```powershell
cd .\NakEna_Frontend
$env:NAKENA_API_BASE_URL = "http://127.0.0.1:8000"
..\nakena-backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

Frontend: `http://127.0.0.1:8001`. `CORS_ORIGINS` pada `.env` backend harus memuat `http://localhost:8001` dan `http://127.0.0.1:8001`. Keduanya sudah dicantumkan pada `.env.example`.

## Catatan keamanan

- File `.env` tidak disertakan dalam arsip dan tidak boleh di-commit.
- Jangan membagikan API key Gemini atau `SECRET_KEY`. Jika key pernah terbagikan, rotasi/ganti key tersebut.
- Database lokal `nakena.db`, virtual environment, cache, dan foto upload tidak disertakan.
- File `models/chefai_best_latest.pt` digunakan backend untuk deteksi YOLO terbaru; model sebelumnya tetap dipertahankan sebagai cadangan.

## Endpoint utama

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/auth/register` | Registrasi pengguna |
| POST | `/auth/login` | Login dan penerbitan JWT |
| GET | `/admin/dashboard` | Statistik pengguna/resep/scan, distribusi rating, serta review dan aktivitas terbaru (khusus admin) |
| GET | `/admin/uploads/{upload_id}/image` | Pratinjau gambar scan (khusus admin) |
| GET | `/admin/users` | Daftar user (khusus admin; mendukung limit dan offset) |
| DELETE | `/admin/users/{user_id}` | Hapus user beserta resep, preferensi, dan file upload (khusus admin) |
| GET/PATCH | `/users/me` | Baca/perbarui profil |
| GET/PUT/PATCH | `/users/me/preferences` | Preferensi pengguna |
| POST | `/uploads` | Upload foto akun (tersimpan di storage dan database) |
| POST | `/uploads/guest/detect` | Endpoint kompatibilitas untuk User; Guest ditolak dengan 401 (tidak dipakai frontend) |
| POST | `/uploads/{id}/detect` | Deteksi bahan dengan YOLO |
| GET/DELETE | `/uploads` dan `/uploads/{id}` | Daftar/detail/hapus upload |
| POST | `/recipes/generate` | Generate resep dengan Gemini; default tiga opsi, maksimal lima opsi dengan `count`, serta `exclude_titles` untuk menghindari judul yang sudah ditampilkan |
| GET/POST | `/recipes/history` | Riwayat resep |
| POST | `/recipes/history/{id}/review` | Simpan atau perbarui rating dan komentar pada resep milik pengguna |
| GET/POST/DELETE | `/recipes/favorites` | Resep favorit |
| GET | `/recipes/image` | Foto makanan Pixabay untuk pengguna yang login |

## Hak akses

- Guest hanya dapat melihat Beranda, Login, dan Register. Semua endpoint yang memproses gambar, resep, riwayat, favorit, preferensi, atau data admin memerlukan autentikasi dan mengembalikan `401 Unauthorized` untuk Guest.
- User dapat menggunakan fitur memasak dan preferensi. Endpoint admin mengembalikan `403 Forbidden`.
- Admin hanya menggunakan Beranda dan dashboard admin di frontend. API menolak akses Admin ke fitur memasak/preferensi dengan `403 Forbidden`; API admin hanya dapat digunakan oleh Admin.
- Registrasi publik selalu membuat `role="user"`. Jangan memberi kredensial admin lewat registrasi; gunakan seeder `.env`.
- Password disimpan sebagai bcrypt hash dengan SHA-256 prehash untuk menerima hingga 64 karakter Unicode meskipun bcrypt membatasi input 72 byte. Verifikasi tetap mendukung hash bcrypt lama.

Foto resep dicari dari kategori `food` Pixabay dengan tipe `photo` dan SafeSearch aktif. Hasilnya diunduh dan disajikan dari cache lokal backend; hasil pencarian (termasuk hasil kosong) disimpan setidaknya 24 jam sesuai ketentuan Pixabay. Atur `PIXABAY_API_KEY` di `.env`.
