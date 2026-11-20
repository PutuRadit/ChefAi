# Aplikasi Android NakEna

Aplikasi Android ini membuka layanan NakEna yang sudah ada melalui WebView. Aplikasi tidak memiliki database atau backend sendiri; login, scan, resep, dan data tetap memakai server NakEna yang sama.

## Fitur aplikasi

- Membuka halaman login `https://nakena.iet-polinela.my.id/login/` saat aplikasi dijalankan.
- Menyimpan email dan kata sandi secara terenkripsi di perangkat jika opsi "Ingat email & kata sandi" dipilih. Kredensial hanya dikirim ke server saat pengguna menekan tombol masuk.
- Mengharuskan pengguna menekan tombol masuk; kredensial yang terisi tidak membuat aplikasi login otomatis.
- Tidak menampilkan bilah alamat atau tampilan browser.
- Menampilkan ikon dan layar pembuka NakEna.
- Menjaga navigasi pada domain NakEna tetap berada di aplikasi.
- Menyediakan pilihan kamera atau galeri saat situs meminta foto.
- Membuka tautan di luar domain NakEna menggunakan aplikasi yang sesuai di perangkat.
- Menolak koneksi HTTP biasa dan kesalahan sertifikat HTTPS.

## Membuka dan menjalankan

1. Pasang Android Studio versi terbaru.
2. Pastikan Android Studio memiliki JDK 17 dan Android SDK Platform 35.
3. Buka folder `NakEna-Android` melalui **File > Open** di Android Studio.
4. Tunggu proses Gradle Sync selesai dan izinkan Android Studio mengunduh plugin/dependensi Gradle.
5. Hubungkan perangkat Android dengan USB debugging aktif atau buat emulator.
6. Pilih konfigurasi `app`, lalu tekan **Run**.

Perangkat perlu memiliki akses internet dan dapat membuka domain NakEna. Aplikasi dan web tetap menggunakan server serta database NakEna yang sama. Aplikasi memulai dari halaman login, sedangkan tampilan awal web tidak diubah. Setelah pengguna masuk, aplikasi melanjutkan ke fitur NakEna pada domain yang sama.

## Membuat APK

Di Android Studio, pilih **Build > Build Bundle(s) / APK(s) > Build APK(s)**. APK debug tersimpan di:

`app/build/outputs/apk/debug/app-debug.apk`

APK debug cocok untuk uji coba. Distribusi resmi memerlukan APK/AAB release yang ditandatangani dengan kunci rilis. Jangan memasukkan kunci penandatanganan atau password ke Git.

## Identitas aplikasi

- Nama: `NakEna`
- Application ID: `id.my.nakena`
- Versi awal: `1.0.0` (`versionCode` 1)

Application ID menjadi identitas aplikasi di Android dan sebaiknya tidak diubah setelah aplikasi didistribusikan.
