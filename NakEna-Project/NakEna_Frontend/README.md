# NakEna Frontend

Frontend FastAPI untuk alur scan bahan, konfirmasi, rekomendasi resep, detail, guided cooking, riwayat, favorit, dan profil. Tampilan mengikuti 11 frame ekspor Figma, dengan fungsi dan revisi sebelumnya tetap dipakai.

## Menjalankan

Jalankan backend pada port 8000. Pada terminal kedua:

```powershell
cd .\NakEna_Frontend
$env:NAKENA_API_BASE_URL = "http://127.0.0.1:8000"
..\nakena-backend\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001
```

Jika frontend memakai virtual environment sendiri, gunakan interpreter `.venv` frontend. Buka http://127.0.0.1:8001/.

## Struktur

- `templates/nakena/`: HTML per halaman.
- `static/css/nakena.css`: warna, tipografi, komponen dan layout responsif bersama.
- `static/css/pages/`: penyesuaian halaman; guided cooking tetap memiliki controller dan styles sendiri.
- `static/css/recipe_images.css`: foto, atribusi Unsplash, skeleton dan tipografi resep.
- `static/js/app_ui.js`: password visibility, pilihan form, input kamera, drag-and-drop dan unggah foto.
- `static/js/api.js`: komunikasi backend, status akun, deteksi, resep, riwayat, favorit dan preferensi.
- `static/js/pages/guided_cooking.js`: langkah memasak, checklist, timer dan pembacaan suara.
- `static/assets/`: maskot dan aset lokal.

## Perilaku data

Guest dapat scan dan memasak tanpa akun. Foto, hasil deteksi dan resepnya hanya berada pada sesi tab. Guest tidak membuat riwayat/favorit di backend.

Header menampilkan Masuk/Daftar sampai akun terverifikasi. Setelah login, header memakai inisial nama akun. Sesi 401 kembali ke status Guest.

Kartu rekomendasi muncul setelah gambar selesai dimuat/decode atau placeholder lokal siap. Foto resep berasal dari integrasi Unsplash backend, disertai atribusi. Tidak ada foto, rating atau statistik contoh yang diisi sebagai data pengguna.

Resep dihasilkan Gemini, dan bagian bahan/langkah/waktu/tips diurai bersama untuk detail dan guided cooking. Permintaan ulang mempertahankan data diet, alergi dan porsi pada resep dari sesi tersebut. Preferensi akun yang tersimpan diterapkan sebagai pilihan awal pada konfirmasi; perubahan manual pengguna didahulukan.

Favorit, riwayat, nama akun dan preferensi membaca/menulis endpoint backend yang tersedia. Pengaturan tanpa endpoint, statistik contoh dan panel simulator dihapus dari halaman desain. Dashboard admin di luar 11 frame tidak termasuk pembaruan desain.

## Pengujian

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

API key Gemini/Unsplash tetap hanya berada pada `.env` backend.
