# Quiz Digital Awareness – ChefAI

**Nama:** Putu Radit Ardika  
**NPM:** 24782059

## Bagian 1. Identitas dan Topik Proyek Aplikasi

### Nama Aplikasi
ChefAI: Smart Food Waste Management System

### Deskripsi Singkat dan Tujuan Utama Aplikasi
ChefAi adalah aplikasi berbasis kecerdasan buatan yang dibuat supaya pengguna bisa menggunakan bahanm makanan di rumah tanpa terbuang sia sia. Chef ai ini memakai teknologi computer vision lewat YOLOV8 untuk menemukan bahan makanan lewat foto yang didapatkan dari dataset. kemudian ChefAi memakai LLM untuk memberi rekomendasi resep sesuai bahan yang ada dan selera pengguna. tujuan dari chef ai ini adalah untuk mengurangi sisa makanan, memudahkan user mmemilih menu, dan membuat ide masak jadi lebih praktis dan cepat.

### Target Pengguna Utama
Target utama chef ai adalah orang yang sering memasak sendiri dirumah, seperti mahasiswa, anak kos, dan pekerja. mereka butuh solusi cepat agar bisa menentukan masakan hanya dengan bahan yang tersedia. ada juga admin yang bertugas memantau performa sistem dan kualitas rekomendasi yang dihasilkan.

## Bagian 2. Resume Modul Digital Awareness

### Modul 1: There’s a Whole New World Out There!
Di modul 1 ini dijelaskan bahwa teknologi digital itu banyak banget membantu aktivitas sehari hari jadi lebih mudah dan cepat. dulu beberapa hal seperti urusan perbankan, belajar, mencari informasi, atau membeli kebutuhan harus dilakukan langsung, tapi sekarang sebagian besar sudah bisa lewat internet. di modul ini juga saya mendapatkan informasi bahwa perkembangan web dari yang awalnya sederhana menjadi Web 2.0 yang lebih interaktif, lalu ada IoT yang membuat perangkat sehari-hari bisa terhubung ke internet. dan juga dari modul ini saya juga paham kalau teknologi digital memang sangat membantu, tapi tetap harus digunakan dengan bijak karena ada risiko seperti privasi, keamanan data, dan kesenjangan akses digital

### Modul 2: You’ll Need Some Basic Tools
Modul ini menjelaskan dasar penggunaan perangkat digital, seperti fungsi operating system, aplikasi, perangkat input dan perangkat output, serta cara perangkat terhubung lewat USB, HDMI, atau bluetooth. file dan folder juga harus diatur dan diberi nama yang jelas supaya mudah ditemukan kembali. keamanan perangkat juga penting, terutama ketika mmebuat password kuat dengan kombinasi huruf, angka, dan simbol, serta menghindari pola atau informasi pribadi yang mudah ditebak

### Modul 3: This is how you get around and find what you’re looking for
Di modul 3 kita belajar cara mencari informasi dengan lebih efektif, baik di file maupun di internet. kalau untuk pencarian di web, kita bisa menggunakan kata kunci yang lebih spesifik, tanda kutip, tanda minus, site:, dan juga filetype: supaya hasilnya lebih sesuai dengan yang dicari. lalu di modul ini juga dijelaskan kalau hasil pencarian tidak semuanya bisa langsung dipercaya, jadi perlu dicek lagi sumber, URL, relevansi, dan keamanannya. selain itu, dinmodul ini juga membahas pentingnya mencatat sumber informasi dengan benar serta memahami aturan penggunaan karya digital seperti copyright, creative commons, public domain, fair use, dan open-source supaya tidak asal memakai karya milik orang lain.

### Modul 4: It just keeps getting better
Pada modul 4 ini membahas tentang perkembangan AI yang sekarang banyak digunakan untuk membantu berbagai pekerjaan, tetapi hasilnya tetap dipengaruhi oleh data, cara sistem dibuat, dan tujuan penggunaannya sehingga harus digunakan secara bertanggung jawab. selain itu, modul ini juga membahas netiquette, seperti menghormati orang lain, berpikir sebelum posting, menjaga privasi, serta menggunakan teknologi secara seimbang agar tidak menimbulkan kecanduan digital, penyebaran informasi salah, atau masalah dari jejak digital.

### Modul 5: Even Though It’s Digital, It is Real, With Real Consequences
Di modul 5 kita bisa tau kalau aktivitas di internet bisa membentuk digital persona dan meninggalkan jejak yang bisa bertahan lama, jadi kita harus lebih hati hati saat membagikan informasi. data pribadi atau PII seperti nama, alamat, email, nomor telepon, dan tanggal lahir juga perlu dijaga karena bisa disalahgunakan untuk penipuan atau pencurian identitas. selain itu, saya juga belajar cara menghadapi komunikasi negatif dan cyberbullying dengan tidak langsung membalas, menyimpan bukti, memblokir, atau melaporkannya. lalu di modul ini juga membahas berbagai risiko di internet seperti phishing, penipuan, dan pembajakan digital, sehingga kita perlu menggunakan password yang kuat, mengatur privasi, dan lebih waspada terhadap informasi atau tautan yang mencurigakan.

### Modul 6: Learn About Anything and Everything
Di modul 6 kita belajar cara melakukan troubleshooting dasar saat perangkat mengalami masalah, misalnya mengecek daya, kabel, penyimpanan, koneksi Wi-Fi, update aplikasi, sampai mencoba restart perangkat. kalau masalah belum selesai, kita bisa mencari bantuan lewat menu support, forum, atau orang yang lebih paham. Modul ini juga membahas cara menutup skills gap dengan terus belajar melalui online course, youtube, MOOC, e-book, webinar, dan forum komunitas. jadi, kalau ada kemampuan digital yang masih kurang, kita bisa mencari sumber belajar yang sesuai dan mempelajarinya secara mandiri.

## Bagian 3. Hubungan dan Implementasi pada Topik Proyek

### 1. Bagaimana rancangan aplikasi dapat mempermudah tugas sehari-hari pengguna? Apa proses “analog/tradisional” dari topik proyekmu yang berhasil disederhanakan menjadi digital.
Kalau biasanya kita harus cek bahan satu-satu terus cari resep sendiri di internet, di ChefAI pengguna cukup foto atau upload bahan makanan yang ada. nanti sistemnya bakal bantu ngenalin bahannya lewat YOLOV8, terus LLM bakal memberikan rekomendasi resep yang sesuai sama bahan dan preferensi pengguna. jadi proses yang tadinya lumayan ribet dan makan waktu bisa jadi lebih cepat dan praktis.

### 2. Jika aplikasimu memiliki fitur penyimpanan file atau pendaftaran akun, bagaimana kamu merancang struktur penyimpanan file yang intuitif bagi pengguna awam? Bagaimana kamu membantu pengguna membuat kata sandi yang aman?
Untuk di ChefAI ini, saya akan membuat penyimpanan datanya sesimpel mungkin supaya pengguna tidak perlu ngatur file sendiri. foto bahan yang di upload akan disimpan otomatis oleh sistem, lalu hasil resep, riwayat, dan resep favorit juga langsung tersusun di akun pengguna. jadi nanti penggunanya cukup buka menu history atau favorite tanpa harus mikirin folder atau lokasi file. nah kalau untuk password, saat daftar akun saya akan kasih aturan supaya password cukup panjang, pakai kombinasi huruf besar, huruf kecil, angka, dan simbol, serta menghindari nama, tanggal lahir, atau pola yang gampang ditebak. dan juga bisa ditambah indikator kekuatan password supaya pengguna tahu apakah password yang dibuat sudah aman atau belum.

### 3. Bagaimana kamu mendesain fitur pencarian (search bar) di dalam aplikasi agar pengguna dapat mencari informasi dengan mudah? Selain itu, sebutkan asset eksternal yang digunakan dalam aplikasi (library, API, gambar, icon). Apakah asset-aset tersebut berlisensi open-source, public domain, atau memiliki hak cipta khusus yang wajib dicantumkan?
Nah kalau untuk fitur pencarian, saya akan mebuat search bar yang simpel supaya pengguna bisa mencari resep atau bahan dengan kata kunci yang mereka inginkan tanpa harus buka menu satu satu. kemudian hasil pencarian juga bisa dibuat langsung menampilkan resep atau bahan yang paling sesuai. dan unntuk aset eksternal, di ChefAI ada beberapa teknologi dan layanan seperti YOLO dari Ultralytics, Gemini/OpenAI API, dataset dari roboflow, danjuga framework seperti React dan FastAPI. untuk lisensinya, beberapa teknologi yang digunakan di project ini memang bersifat open source, sedangkan API, dataset, gambar, dan icon punya aturan penggunaan yang bisa berbeda beda. Karena itu, jadi sebelum dipakai, lisensi dari setiap aset tetap perlu dicek terlebih dahulu.

### 4. Jika aplikasimu memiliki fitur interaksi social, bagaimana kamu mencegah pelanggaran etika digital di dalamnya? Jika aplikasi menggunakan fitur pintar berbasis AI, bagaimana kamu memastikan AI tersebut bekerja secara etis dan bertanggung jawab bagi pengguna?
Di ChefAI ada fitur review dan komentar resep yang nantinya bisa menjadi tempat interaksi antar pengguna kalau ulasan dibuat publik. supaya tetap aman, saya akan menerapkan aturan komentar, filter konten yang tidak pantas, dan fitur report supaya pengguna tidak bebas menyebarkan komentar negatif atau merugikan orang lain. untuk fitur AI, hasil deteksi bahan dari YOLO tetap harus dikonfrmasi dulu oleh pengguna sebelum dipakai untuk membuat resep. Rekomendasi dari LLM juga dicek lagi karena hasil AI tidak selalu benar.jJadi AI di ChefAI dipakai sebagai alat bantu, bukan sesuatu yang langsung dipercaya sepenuhnya tanpa pengecekan

### 5. Data pribadi sensitive (PII) apa saja yang dikumpulkan oleh aplikasimu? Bagaimana cara kamu melindungi data tersebut agar tidak bocor atau disalahgunakan? Bagaimana aplikasi meminimalkan Risiko pengguna menjadi korban penipuan siber di platform mu?
Di ChefAI, data pribadi yang dikumpulkan utamanya berupa data profil seperti preferensi diet dan alergi, foto bahan makanan yang di-upload, serta riwayat resep dan aktivitas pengguna. foto pengguna hanya disimpan sementara dan akan dihapus paling lambat setelah 30 hari. lalu untuk keamanan, data dikirim lewat HTTPS, akses ke database dan API dibatasi lewat backend, dan data sensitif tidak langsung ditampilkan ke sisi pengguna. untuk mengurangi risiko penipuan, aplikasi sebaiknya tidak meminta data yang tidak perlu, memberi peringatan bila ada aktivitas atau tautan mencurigakan, serta memastikan pengguna hanya berinteraksi lewat fitur resmi yang ada di ChefAI.

### 6. Ketika aplikasi mengalami masalah teknis (misalnya kehilangan koneksi internet atau kegagalan memuat data), bagaimana aplikasi mengomunikasikannya kepada pengguna? Tuliskan contoh rancangan pesan error ramah pengguna yang memandu pengguna melakukan troubleshooting mandiri secara mudah.
Kalau ChefAI mengalami masalah, aplikasi harus kasih pesan error yang jelas supaya pengguna tahu apa yang terjadi dan apa yang harus dilakukan. misalnya kalau internet terputus, foto gagal diproses, bahan tidak terdeteksi, atau resep gagal dibuat, pengguna jangan cuma dikasih loading terus-menerus. pesannya bisa keluarb seperti “koneksi internet terputus, coba cek wifi atau data seluler kamu lalu tekan coba lagi”, “baahan belum berhasil terdeteksi. coba ambil foto lagi dengan pencahayaan yang lebih jelas”, atau “resep gagal dibuat, silakan coba beberapa saat lagi” jadi pengguna bisa langsung tahu masalahnya dan mencoba langkah sederhana sendiri sebelum meminta bantuan.
