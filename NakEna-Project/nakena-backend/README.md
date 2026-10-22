# NakEna Backend

Backend API FastAPI untuk NakEna (Smart Food Waste Management System). Backend hanya menyediakan
API untuk frontend, database, dan Gemini; halaman dan tampilan dijalankan oleh aplikasi frontend.

Konfigurasi lokal dibaca dari `.env`. Variabel Gemini yang didukung: `GEMINI_API_KEY` dan
`GEMINI_MODEL` (default `gemini-3.8-flash`). Jangan simpan API key asli di `.env.example` atau commit.

## Struktur

```
app/
  main.py              # entry point FastAPI, CORS, router, /health
  core/                # config (.env), database (SQLAlchemy), security (bcrypt + JWT)
  models/              # User, UserPreference, Upload
  schemas/             # request/response Pydantic
  api/deps.py          # get_current_user, require_admin
  api/routes/          # auth.py, users.py, uploads.py
  services/            # images.py (validasi foto), storage.py (penyimpanan file)
tests/                 # pytest
```

## Menjalankan

PostgreSQL dijalankan langsung di komputer; Docker tidak diperlukan. Pastikan layanan PostgreSQL
Windows berjalan dan database `nakena` tersedia, dengan user `nakena` dan password `nakena`
sesuai URL koneksi lokal di `.env`. Jalankan backend dari folder `nakena-backend`.

Di Command Prompt, dari folder `nakena-backend`:

```cmd
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements-dev.txt
if not exist .env copy .env.example .env
notepad .env
uvicorn app.main:app --reload --port 8000
```

Isi `SECRET_KEY` pada `.env` dengan nilai acak minimal 32 karakter sebelum menjalankan server.
Perintah `notepad .env` digunakan untuk memastikan URL PostgreSQL dan pengaturan lokal sesuai.

Backend API: http://localhost:8000/ (metadata JSON, bukan halaman frontend)  
Dokumentasi interaktif API: http://localhost:8000/docs (klik **Authorize**, isi `username` dengan email).
Tes: `pytest`

Jalankan frontend terpisah dari folder `../NakEna_Frontend` pada port `8001`. Pastikan
`CORS_ORIGINS` di `.env` memuat `http://localhost:8001` (sudah tercantum di `.env.example`).
Jika alamat atau port frontend berbeda, tambahkan origin frontend tersebut. Atur
`NAKENA_API_BASE_URL` di proses frontend bila backend tidak berjalan di `http://localhost:8000`.

Login memakai endpoint `POST /auth/login`. Akun harus didaftarkan terlebih dahulu melalui
`POST /auth/register`. Token login disimpan di `sessionStorage` dan terhapus ketika pengguna
memilih Keluar atau sesi tab berakhir.

Upload foto disimpan lewat `/uploads`, tetapi deteksi YOLO belum tersedia sehingga bahan, confidence,
dan bounding box belum dihasilkan otomatis. Pengguna dapat memasukkan bahan secara manual dan meminta
resep melalui endpoint Gemini yang sudah ada. Riwayat resep dan favorit disimpan di database per akun.

## Endpoint

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| POST | `/auth/register` | - | Daftar (email, password min. 8 karakter, full_name) |
| POST | `/auth/login` | - | Login JSON → `access_token` (JWT) |
| POST | `/auth/token` | - | Login form-data, khusus tombol Authorize di Swagger |
| POST | `/recipes/generate` | - | Membuat resep dengan Gemini |
| GET / PATCH | `/users/me` | Bearer | Lihat / ubah profil |
| GET | `/users/me/preferences` | Bearer | Lihat preferensi |
| PUT | `/users/me/preferences` | Bearer | Ganti seluruh preferensi |
| PATCH | `/users/me/preferences` | Bearer | Ubah sebagian preferensi |
| POST | `/uploads` | Bearer | Upload foto bahan (multipart, field `file`) |
| GET | `/uploads`, `/uploads/{id}` | Bearer | Daftar / detail upload milik sendiri |
| DELETE | `/uploads/{id}` | Bearer | Hapus foto sendiri |
| POST / GET | `/recipes/history` | Bearer | Simpan / lihat riwayat resep |
| POST / GET | `/recipes/favorites` | Bearer | Simpan / lihat resep favorit |
| DELETE | `/recipes/favorites/{id}` | Bearer | Hapus resep dari favorit |
| GET | `/health` | - | Cek server |

Contoh:

```bash
curl -X POST localhost:8000/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"budi@example.com","password":"rahasia123","full_name":"Budi"}'

TOKEN=$(curl -s -X POST localhost:8000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"budi@example.com","password":"rahasia123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -X PUT localhost:8000/users/me/preferences -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"diet":"halal","allergies":["kacang","udang"],"staple_ingredients":["garam","minyak"],"default_servings":2}'

curl -X POST localhost:8000/uploads -H "Authorization: Bearer $TOKEN" -F "file=@foto_kulkas.jpg"
```

Frontend: kirim header `Authorization: Bearer <access_token>`. Upload memakai `FormData` dengan field bernama `file`.

## Keputusan desain

- **Preferensi** menyimpan profil tetap (diet, alergi, staple ingredients) dan default untuk popup
  (waktu masak, kesulitan `easy|medium|hard`, porsi, cuisine). Teks dinormalisasi ke huruf kecil dan
  daftar dihapus duplikatnya supaya pencocokan alergi di Recipe Engine konsisten.
- **Upload** memeriksa isi file (bukan hanya header), hanya JPEG/PNG, maksimal `MAX_UPLOAD_SIZE_MB`.
  Foto disimpan ulang tanpa metadata EXIF (lokasi GPS terhapus, orientasi sudah diluruskan).
  `expires_at` diisi sesuai retensi 30 hari di laporan perancangan.
- **Storage** lewat antarmuka `StorageBackend`; sekarang disk lokal, bisa diganti S3/MinIO tanpa mengubah endpoint.
- Upload milik user lain dijawab 404 (bukan 403).
- Tabel dibuat otomatis saat startup (`create_all`); ganti ke Alembic saat skema mulai stabil.
- Untuk produksi di belakang Nginx, set juga `client_max_body_size` sesuai batas upload.

## Belum dikerjakan (di luar todo ini)

Job deteksi YOLO (Celery + Redis), penghapusan otomatis foto yang lewat `expires_at`, refresh token,
dan endpoint admin. Kolom `role`, dependency `require_admin`, dan kolom `status` pada upload sudah disiapkan.
Untuk menjadikan akun admin sementara: `UPDATE users SET role='admin' WHERE email='...';`
