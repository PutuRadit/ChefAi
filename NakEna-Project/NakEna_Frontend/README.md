# NakEna Frontend

Frontend FastAPI untuk halaman NakEna. API, database, dan Gemini dijalankan oleh
`nakena-backend` secara terpisah.

## Lokasi file

- `templates/nakena/`: HTML halaman.
- `static/assets/`: gambar dan aset desain.
- `app/main.py`: route halaman dan mount aset frontend serta skrip integrasi backend.
- `../nakena-backend/app/web/static/frontend.js`: interaksi halaman dan pemanggil API.

## Menjalankan di Windows PowerShell

Dari root `NakEna-Project`, jalankan backend di terminal pertama:

```powershell
cd ".\nakena-backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Di terminal kedua, mulai lagi dari root `NakEna-Project` lalu jalankan frontend:

```powershell
cd ".\NakEna_Frontend"
$env:NAKENA_API_BASE_URL = "http://127.0.0.1:8000"
..\nakena-backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

Buka `http://127.0.0.1:8001/`. Pastikan `CORS_ORIGINS` di `nakena-backend/.env`
memuat origin frontend `http://127.0.0.1:8001` dan `http://localhost:8001`.
