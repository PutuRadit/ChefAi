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
├── models/chefai_best.pt # bobot YOLO
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

Isi `SECRET_KEY` dengan string acak minimal 32 karakter dan `GEMINI_API_KEY` dengan API key milikmu. Konfigurasi lokal contoh memakai SQLite (`sqlite:///./nakena.db`). Model YOLO harus tersedia di `models/chefai_best.pt`.

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
- File `models/chefai_best.pt` dipertahankan karena dibutuhkan backend untuk deteksi YOLO.

## Endpoint utama

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/auth/register` | Registrasi pengguna |
| POST | `/auth/login` | Login dan penerbitan JWT |
| GET/PATCH | `/users/me` | Baca/perbarui profil |
| GET/PUT/PATCH | `/users/me/preferences` | Preferensi pengguna |
| POST | `/uploads` | Upload foto |
| POST | `/uploads/{id}/detect` | Deteksi bahan dengan YOLO |
| GET/DELETE | `/uploads` dan `/uploads/{id}` | Daftar/detail/hapus upload |
| POST | `/recipes/generate` | Generate tiga opsi resep dengan Gemini |
| GET/POST | `/recipes/history` | Riwayat resep |
| GET/POST/DELETE | `/recipes/favorites` | Resep favorit |
