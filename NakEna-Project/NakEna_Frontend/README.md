# NakEna FastAPI Ready

Template hasil Google Stitch yang sudah disiapkan untuk dilayani memakai FastAPI. Tidak menggunakan Django.

## Instalasi

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Buka `http://127.0.0.1:8000/`.

## Jika digabung ke project FastAPI yang sudah ada

1. Salin `templates/nakena` ke folder `templates/nakena` project kamu.
2. Salin gambar/aset ke folder `static/`.
3. Ambil route dari `app/main.py` dan gabungkan ke `main.py` atau router project kamu.
4. Jangan menimpa endpoint `/recipes/generate` milik project kamu.
5. Ganti fungsi `analyze_scan()` dengan proses YOLOv8 yang sudah kamu buat.

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

Catatan: desain Stitch memakai Tailwind CDN dan beberapa gambar URL eksternal, sehingga tampilan lengkap memerlukan internet. Endpoint upload masih berupa placeholder dan siap diganti dengan YOLOv8.
