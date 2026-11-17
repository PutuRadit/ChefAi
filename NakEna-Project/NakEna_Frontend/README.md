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
- `static/css/recipe_images.css`: foto, atribusi Pixabay, skeleton dan tipografi resep.
- `static/js/app_ui.js`: password visibility, pilihan form, input kamera, drag-and-drop dan unggah foto.
- `static/js/api.js`: komunikasi backend, status akun, deteksi, resep, riwayat, favorit dan preferensi.
- `static/js/pages/guided_cooking.js`: langkah memasak, checklist, timer dan pembacaan suara.
- `static/assets/`: maskot dan aset lokal.

## Perilaku data

Guest hanya dapat membuka Beranda, Masuk, dan Daftar. Aksi Scan Bahan, Resep, Riwayat, Favorit, atau Preferensi menampilkan peringatan dan meminta login; halaman lain ditolak oleh route guard. API backend tetap menjadi pengaman utama dan mengembalikan 401 untuk permintaan tanpa token.

Header menampilkan Masuk/Daftar sampai akun terverifikasi. User melihat navigasi fitur memasak dan Preferensi; Admin hanya melihat navigasi Admin Dashboard. Akun User yang membuka dashboard Admin dan Admin yang mencoba membuka fitur memasak menerima peringatan lalu diarahkan ke Beranda. Sesi 401 kembali ke status Guest.

Pada halaman Scan, tombol Ambil foto membuka pratinjau kamera langsung (izin kamera browser diperlukan), lalu pengguna dapat mengambil foto manual, meninjau/mengganti foto, dan menekan Scan Bahan untuk mendeteksi bahan. Jika terdeteksi lebih dari tiga jenis bahan, dialog memberi peringatan bahwa hasil mungkin kurang akurat dan menawarkan pilihan lanjut atau scan ulang; hasil deteksi tidak dibatasi. Jika tidak ada bahan terdeteksi, halaman hasil menjelaskan bahwa foto mungkin bukan makanan atau kurang jelas, menyediakan tombol foto ulang, dan tidak mengizinkan pembuatan resep dari hasil kosong. Jika kamera browser tidak tersedia, browser memakai input kamera perangkat; Unggah dari galeri tetap tersedia terpisah. Kamera browser memerlukan `localhost` atau koneksi HTTPS. Menu Resep disembunyikan pada halaman Scan agar alur dimulai dari foto dan deteksi bahan.

Kartu rekomendasi muncul setelah gambar selesai dimuat/decode atau placeholder lokal siap. Foto makanan resep berasal dari Pixabay melalui backend, disimpan pada cache lokal, dan ditampilkan dengan atribusi Pixabay. Tidak ada foto, rating atau statistik contoh yang diisi sebagai data pengguna.

Resep dihasilkan Gemini, dan bagian bahan/langkah/waktu/tips diurai bersama untuk detail dan guided cooking. Permintaan ulang mempertahankan data diet, alergi dan porsi pada resep dari sesi tersebut. Preferensi akun yang tersimpan diterapkan sebagai pilihan awal pada konfirmasi; perubahan manual pengguna didahulukan.

Preferensi memasak dan konfirmasi bahan menyediakan pilihan pola diet serta alergi yang dihindari. Waktu, porsi, jenis masakan, dan bahan dapur tetap dapat disesuaikan; pilihan tingkat kesulitan telah dihapus dari formulir konfirmasi. Pilihan diet umum mencakup halal, vegetarian/vegan, bebas gluten/laktosa, pescatarian, dan pola rendah gula/garam/karbohidrat/lemak. Opsi alergi mencakup kacang tanah/pohon, seafood, udang/kerang/ikan, susu/telur, kedelai, gandum, dan wijen.

Favorit, riwayat, nama akun dan preferensi membaca/menulis endpoint backend yang tersedia. Pengaturan tanpa endpoint, statistik contoh dan panel simulator dihapus dari halaman desain. Dashboard admin di luar 11 frame tidak termasuk pembaruan desain.

Dashboard admin menampilkan daftar akun terdaftar dengan pagination. Admin dapat menghapus akun pengguna biasa; akun admin dan akun yang sedang dipakai tidak dapat dihapus dari halaman tersebut. Akun admin dibuat melalui `ADMIN_EMAIL` dan `ADMIN_PASSWORD` pada `.env` backend.

## Pengujian

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```

API key Gemini/Pixabay tetap hanya berada pada `.env` backend.
