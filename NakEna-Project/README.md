# NakEna Project

Project ini dipisahkan menjadi dua aplikasi yang berjalan sebagai service berbeda.

- `NakEna_Frontend` — HTML, CSS, JavaScript, halaman, dan aset visual (port 8001).
- `nakena-backend` — REST API, autentikasi, database, YOLO, dan Gemini (port 8000).

## Menjalankan

Ikuti `nakena-backend/README.md` untuk menyiapkan backend dan `.env`. Jalankan backend pada port 8000. Setelah itu, jalankan frontend pada port 8001 mengikuti `NakEna_Frontend/README.md`.

Frontend mengirim request ke backend melalui `NAKENA_API_BASE_URL`. Kedua service harus berjalan bersamaan agar fitur login, scan, deteksi, dan resep dapat digunakan.

## Catatan

Arsip ini sengaja tidak menyertakan `.env`, database lokal, virtual environment, cache, atau file upload. Buat `.env` dari `.env.example` dan isi secret sendiri.

## Ringkasan perubahan struktur

- Semua halaman HTML aktif hanya berada di `NakEna_Frontend/templates/nakena/`.
- CSS, JavaScript per halaman, konfigurasi Tailwind, dan aset visual berada di `NakEna_Frontend/static/`.
- Integrasi REST API berada di `NakEna_Frontend/static/js/api.js` dan menggunakan `NAKENA_API_BASE_URL`.
- Backend tidak lagi menyajikan halaman HTML atau aset frontend; backend hanya menyediakan endpoint JSON.
- Salinan template lama, file frontend backend yang duplikat, dan penanda konflik Git sudah dibersihkan.
