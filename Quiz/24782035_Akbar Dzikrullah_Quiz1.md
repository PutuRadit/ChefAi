# QUIZ PEMROGRAMAN INTERNET II

Oleh:

NAMA     : AKBAR DZIKRULLAH

NPM      : 24782035

KELAS    : TRI 5B

Dosen Pengampu :

1. Ir. Nurul Qomariyah,  S.Kom., M.Kom.
2. Ir. Dian Ayu Afifah, S,Si., M.Sc

TEKNOLOGI REKAYASA INTERNET
JURUSAN TEKNOLOGI INFORMASI
POLITEKNIK NEGERI LAMPUNG 2026/2027

## Laporan Kuis: Interconnecting between Digital Awareness and Application Design

### Bagian 1. Identitas dan Topik Proyek Aplikasi:

**Nama Aplikasi: ChefAI: Smart Food Waste Management System.**

**Deskripsi Singkat dan Tujuan Utama: ChefAI adalah aplikasi berbasis kecerdasan buatan (AI) yang menggabungkan teknologi visi komputer (YOLOv8) untuk mendeteksi bahan makanan dari foto, dengan Large Language Model (LLM) untuk menghasilkan rekomendasi resep secara otomatis. Tujuan utamanya adalah menyelesaikan masalah kesulitan pengguna dalam menentukan masakan dari bahan yang tersisa di kulkas, sehingga dapat mengurangi potensi limbah makanan (food waste).**

**Target Pengguna Utama: Individu dan rumah tangga yang aktif memasak sendiri, khususnya mahasiswa (anak kos) dan pekerja yang membutuhkan solusi memasak praktis.**

### Bagian 2. Resume Modul Digital Awareness:

Modul 1: There's a whole new world out there

= Dari module 1 ini saya bisa simpulkan bahwa Dunia sekarang sudah serba digital dan bikin banyak urusan sehari-hari jadi jauh lebih praktis. Contoh gampang nya dikehidupan sehari hari  misalnya:kita gak perlu lagi bawa peta kertas atau nyatet semuanya di buku diary karena semua udah pindah ke HP. Tapi, walaupun serba gampang, kita juga harus pinter membagi waktu dan jaga kesehatan biar gak kecanduan natap layar seharian

Modul 2: You'll Need Some Basic Tools

= Pada module 2 ini  Untuk bermain di dunia digital, kita butuh pengetahuan dasar.yang  Pertama paham fungsi Sistem Operasi (OS) yang menjadi "otak" buat menjalankan aplikasi dan HP/laptop kita. Yang Kedua, kita harus tahu cara merapihkan file dan folder biar gak berantakan dan gampang dicari. Yang Terakhir dan gak kalah penting, kita wajib bikin kata sandi yang kuat dan berbeda-beda biar akun gak gampang dibobol orang.

Modul 3: This is how you get around and find what you're looking for

= Menurut saya pada module 3 bisa saya rangkum dan jelaskan bahwa Browser berfungsi sebagai jembatan utama kita untuk mengakses berbagai layanan di internet."Supaya gak nyasar dan bisa kita bisa mendapatkan info yang akurat dan jelas, kita perlu tahu trik mencari file di komputer sendiri maupun mencari artikel di Google. Selain itu, kita harus sadar hak cipta: kita harus tau tuh dan bisa membedakan mana karya orang yang dilindungi (copyright) jadi gak boleh asal comot, dan mana aset gratisan/domain publik (public domain) yang bebas dipakai.

Modul 4: It just keeps getting better

= Pada module 4 ini bisa saya resume bahwa Teknologi berkembang itu semakin cepat, apalagi sekarang ada AI yang bikin kerjaan itu semakin instana atau mudah. Tapi semakin canggih teknologinya, etika kita di internet (netiquette) juga harus dijaga. Kita tetap harus sopan waktu mengetik komentar, menghargai sesama pengguna, dan bertanggung jawab atas apa yang kita bagikan di dunia maya.

Modul 5: Even Though It's Digital, It is Real, With Real Consequences

= Pada module 5 ini bisa saya resume bahwa Semua yang kita ketik  dan lakukan di internet itu bakal meiningalkan jejak digital yang susah dihilangkan. Makanya, data pribadi sensitif (seperti NIK, nomor HP, atau alamat) wajib dijaga ketat biar kita tidak terkena penipuan atau pembajakan akun. Selain itu  Kita juga harus bijak dalam menyikapi komentar negatif atau perundungan di dunia maya, serta menghindari penggunaan barang atau aplikasi bajakan.

Modul 6: Learn About Anything and Everything.

= jadi disini resumenya pada module 6 ini Penting buat mempunyai kemampuan troubleshooting mandiri saat ada masalah teknis kecil, misalnya pas Wi-Fi mendadak mati atau aplikasi nge-hang. Di samping itu, karena teknologi berubah terus, kita harus sadar kalau bakal selalu ada hal baru yang belum kita kuasai, jadi rasa ingin tahu dan semangat belajar hal baru itu wajib dijaga.

### Bagian 3. Hubungan dan Implementasi pada Topik Proyek:

1.Bagaimana rancangan aplikasi dapat mempermudah tugas sehari-hari pengguna? Apa proses “analog/tradisional” dari topik proyekmu yang berhasil disederhanakan menjadi digital.

= ChefAI berhasil mendigitalisasi proses tradisional yang dulunya melelahkan, yaitu Ketika ada suatu kegiatan mengecek isi kulkas satu per satu, menebak menu makanan, dan mencari resep secara manual di buku atau internet. Nah Melalui aplikasi ini, alur tersebut dipangkas menjadi lebih praktis: pengguna cukup mengambil foto bahan makanan, sistem YOLOv8 akan mendeteksinya secara otomatis, dan LLM langsung merumuskan rekomendasi resep yang relevan dalam hitungan detik.

2.Jika aplikasimu memiliki fitur penyimpanan file atau pendaftaran akun, bagaimana kamu merancang struktur penyimpanan file yang intuitif bagi pengguna awam? Bagaimana kamu membantu pengguna membuat kata sandi yang aman?

= Sistem penyimpanan data pada ChefAI dirancang terpusat menggunakan basis data relasional PostgreSQL di sisi backend, sehingga pengguna awam tidak perlu dipusingkan dengan manajemen file lokal yang rumit. Untuk aspek keamanan akun, aplikasi menggunakan protokol autentikasi berbasis token (JWT). Selain itu, pada saat proses pendaftaran akun, sistem dilengkapi dengan indikator kekuatan kata sandi (password strength indicator) secara real-time untuk memandu pengguna membuat kombinasi sandi yang kuat (mengandung huruf, angka, dan karakter khusus) guna mencegah risiko pembajakan akun.

3.Bagaimana kamu mendesain fitur pencarian (search bar) di dalam aplikasi agar pengguna dapat mencari informasi dengan mudah? Selain itu, sebutkan asset eksternal yang digunakan dalam aplikasi (library, API, gambar, icon). Apakah asset-aset tersebut berlisensi open-source, public domain, atau memiliki hak cipta khusus yang wajib dicantumkan?

= Fitur pencarian di ChefAI tidak terbatas pada pencarian teks konvensional, melainkan menggunakan pendekatan visual (computer vision) di mana hasil bidikan kamera langsung dihubungkan dengan Recipe Engine. Terkait aset eksternal, proyek ini memanfaatkan dataset gambar bahan makanan dari Roboflow/Kaggle untuk melatih model YOLO, serta menggunakan layanan API dari Gemini/OpenAI. Jadi Seluruh aset dan dataset publik tersebut digunakan dengan tetap memperhatikan ketentuan lisensi open-source serta mematuhi batasan privasi dan aturan penggunaan dari pihak penyedia API.

4.Jika aplikasimu memiliki fitur interaksi social, bagaimana kamu mencegah pelanggaran etika digital di dalamnya? Jika aplikasi menggunakan fitur pintar berbasis AI, bagaimana kamu memastikan AI tersebut bekerja secara etis dan bertanggung jawab bagi pengguna?

= Untuk menjaga etika interaksi di dalam platform, fitur Recipe Review dirancang dengan filter konten guna mencegah penyalahgunaan kata-kata kasar. Dari sisi tanggung jawab AI, ChefAI menerapkan prinsip Human-in-the-Loop; yang artinya AI tidak akan langsung memutuskan resep secara mutlak, melainkan dia akan meminta pengguna untuk memeriksa dan mengonfirmasi hasil deteksi terlebih dahulu. Selain itu, backend juga akan melakukan validasi berlapis untuk memastikan resep yang dihasilkan LLM tidak mengandung allergen/alergi yang membahayakan kesehatan pengguna.

5.Data pribadi sensitive (PII) apa saja yang dikumpulkan oleh aplikasimu? Bagaimana cara kamu melindungi data tersebut agar tidak bocor atau disalahgunakan? Bagaimana aplikasi meminimalkan Risiko pengguna menjadi korban penipuan siber di platform mu?

= Data pribadi sensitif (Personally Identifiable Information / PII) yang dikumpulkan meliputi profil pengguna, preferensi diet, riwayat alergi, serta foto bahan makanan yang diunggah. Seluruh data ini dilindungi secara ketat dengan menyembunyikan logika sistem dan API Key di sisi backend FastAPI, sehingga aman dari intipan pihak luar. Khusus untuk Foto yang diunggah pengguna hanya disimpan selama maksimal 30 hari di object storage sebelum dihapus otomatis, demi menjaga kebersihan jejak digital serta menghindari potensi penyalahgunaan data.

6.Ketika aplikasi mengalami masalah teknis (misalnya kehilangan koneksi internet atau kegagalan memuat data), bagaimana aplikasi mengomunikasikannya kepada pengguna? Tuliskan contoh rancangan pesan error ramah pengguna yang memandu pengguna melakukan troubleshooting mandiri secara mudah.

= Ketika terjadi gangguan teknis seperti model YOLO gagal mengenali objek karena foto terlalu gelap atau terjadi timeout pada jaringan LLM sistem dirancang untuk menghentikan proses secara aman alih-alih membiarkan aplikasi loading tanpa henti. Aplikasi kemudian akan menampilkan pesan kesalahan yang komunikatif dan memandu pengguna melakukan troubleshooting mandiri.
Contoh pesan error: "Maaf, bahan makanan di foto kurang terlihat jelas. Yuk, coba foto ulang di tempat yang lebih terang agar ChefAI bisa melihatnya!" atau "Koneksi ke dapur ChefAI sedang terputus, silakan periksa kembali jaringan internetmu dan coba beberapa saat lagi ya.
