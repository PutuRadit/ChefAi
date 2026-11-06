# NakEna Frontend

Aplikasi frontend berjalan terpisah dari backend API menggunakan FastAPI sebagai server halaman.

## Struktur

```text
NakEna_Frontend/
├── app/main.py                 # route halaman dan static files
├── templates/nakena/           # HTML per halaman
├── static/
│   ├── css/pages/               # CSS per halaman
│   ├── js/api.js                # integrasi REST API ke backend
│   ├── js/pages/                # JavaScript interaksi per halaman
│   └── assets/                  # gambar, maskot, dan aset visual
├── tests/
├── requirements.txt
└── README.md
```

## Instalasi dan pengujian

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

## Menjalankan frontend (Windows PowerShell)

Pastikan folder `NakEna_Frontend` dan `nakena-backend` berada berdampingan di dalam folder project.
Jalankan backend terlebih dahulu pada port 8000. Kemudian di terminal kedua:

```powershell
cd .\NakEna_Frontend
$env:NAKENA_API_BASE_URL = "http://127.0.0.1:8000"
..\nakena-backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

Buka `http://127.0.0.1:8001/`. Jika menggunakan virtual environment terpisah untuk frontend, ganti path interpreter dengan `.venv` frontend.

## Mengembangkan tampilan

- Struktur halaman: `templates/nakena/<halaman>.html`
- Styling: `static/css/pages/<halaman>.css`
- Interaksi halaman: `static/js/pages/<halaman>.js`
- Konfigurasi Tailwind: `static/js/pages/<halaman>.config.js`
- Komunikasi ke backend: `static/js/api.js`

Frontend memanggil API melalui `NAKENA_API_BASE_URL`. Jangan menaruh API key Gemini atau secret backend di frontend.
