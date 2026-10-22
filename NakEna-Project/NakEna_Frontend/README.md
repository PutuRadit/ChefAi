# NakEna Frontend

Frontend FastAPI untuk NakEna. Tampilan berada di `templates/nakena`; API, database, dan integrasi
Gemini disediakan oleh service `nakena-backend`.

## Instalasi

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Buka `http://127.0.0.1:8001/`. Backend harus berjalan di `http://localhost:8000` dan
`CORS_ORIGINS` pada konfigurasi backend harus memuat `http://localhost:8001`.

Untuk alamat backend berbeda, atur `NAKENA_API_BASE_URL` sebelum menjalankan frontend:

```powershell
$env:NAKENA_API_BASE_URL = "http://localhost:8000"
uvicorn app.main:app --reload --port 8001
```

## Route halaman

- `/` landing page
- `/login/` login
- `/register/` register
- `/scan/` scan bahan
- `/scan/result/` hasil analisis
- `/recipes/` rekomendasi resep
- `/recipes/1/` detail resep
- `/recipes/1/guided-cooking/` guided cooking
- `/history/` riwayat
- `/favorites/` favorit
- `/profile/` profil
- `/admin-dashboard/` admin dashboard

Catatan: desain Stitch memakai Tailwind CDN dan beberapa gambar URL eksternal, sehingga tampilan lengkap memerlukan internet. Upload foto sudah tersambung ke backend; deteksi bahan otomatis dengan YOLO belum tersedia.
