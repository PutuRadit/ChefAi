# Quiz Digital Awareness - ChefAi

## Bagian 1. Identitas dan Topik Proyek Aplikasi

### Nama Aplikasi
**ChefAI: Smart Food Waste Management System**

### Deskripsi Singkat dan Tujuan Utama Aplikasi
ChefAI merupakan aplikasi berbasis Artificial Intelligence (AI) yang membantu pengguna menentukan masakan berdasarkan bahan makanan yang tersedia. Pengguna dapat mengunggah foto bahan makanan, kemudian sistem menggunakan Computer Vision dengan YOLO untuk mendeteksi bahan yang terdapat pada gambar.

Hasil deteksi tersebut kemudian diproses bersama preferensi pengguna, seperti jenis diet atau alergi, menggunakan Large Language Model (LLM). LLM akan mencocokkan bahan yang tersedia dengan kemungkinan masakan dan menghasilkan rekomendasi resep beserta langkah-langkah memasaknya.

ChefAI dibuat untuk membantu mengatasi dua permasalahan utama, yaitu kebingungan dalam menentukan menu masakan dari bahan yang tersedia dan penumpukan food waste rumah tangga akibat bahan makanan yang tidak digunakan atau terlupakan.

### Target Pengguna Utama
Target utama ChefAI adalah masyarakat atau pengguna rumah tangga yang sering memiliki bahan makanan di kulkas tetapi mengalami kesulitan dalam menentukan menu masakan. Aplikasi ini juga dapat digunakan oleh mahasiswa atau individu yang ingin mencari ide masakan secara praktis berdasarkan bahan yang mereka miliki.

## Bagian 2. Resume Modul Digital Awareness

### 1. Modul 1: There's a whole new world out there!
Modul ini membahas bagaimana teknologi dapat membantu mempermudah berbagai pekerjaan sehari-hari. Banyak kegiatan yang sebelumnya dilakukan secara manual atau analog sekarang sudah dapat dilakukan secara digital sehingga menjadi lebih cepat dan praktis.

### 2. Modul 2: You'll Need Some Basic Tools
Modul ini membahas dasar-dasar penggunaan perangkat dan sistem operasi, termasuk cara mengelola file dan folder. Selain itu, kita juga perlu memahami pentingnya membuat kata sandi yang kuat untuk menjaga keamanan akun dan data.

### 3. Modul 3: This is how you get around and find what you're looking for
Modul ini membahas cara menggunakan browser dan bagaimana mencari informasi dengan baik, baik dari file maupun melalui web. Modul ini juga menjelaskan perbedaan antara copyright dan public domain, sehingga kita tahu bagaimana menggunakan suatu informasi atau aset secara tepat.

### 4. Modul 4: It just keeps getting better
Modul ini membahas perkembangan AI yang semakin banyak digunakan dalam berbagai bidang dan bagaimana teknologi tersebut memberikan dampak bagi kehidupan manusia. Selain itu, kita juga perlu memahami netiquette atau etika dalam berinternet serta bertanggung jawab dalam menggunakan teknologi digital.

### 5. Modul 5: Even Though It’s Digital, It is Real, With Real Consequences
Modul ini menjelaskan bahwa data digital tetap memiliki risiko dan dampak nyata. Karena itu, data pribadi atau PII harus dijaga dengan baik. Modul ini juga membahas jejak digital, cara menghadapi komunikasi negatif, serta pentingnya menghindari penipuan, fraud, dan pembajakan.

### 6. Modul 6: Learn About Anything and Everything
Modul ini membahas cara dasar dalam menghadapi dan menyelesaikan masalah teknis atau troubleshooting. Selain itu, kita juga perlu mengetahui kemampuan digital apa yang masih kurang agar dapat terus belajar dan meningkatkan keterampilan yang dibutuhkan.

## Bagian 3. Hubungan dan Implementasi pada Topik Proyek

### 1. Bagaimana rancangan aplikasi dapat mempermudah tugas sehari-hari pengguna?
ChefAI mempermudah pengguna dalam menentukan menu masakan dari bahan yang sudah tersedia. Sebelumnya, pengguna harus melihat isi kulkas, mengingat bahan yang tersedia, kemudian mencari resep satu per satu di internet. Proses tersebut dibuat menjadi digital dengan cara pengguna cukup mengunggah foto bahan makanan. Sistem kemudian menggunakan AI untuk mendeteksi bahan tersebut dan memberikan rekomendasi masakan beserta resepnya.

### 2. Jika aplikasi memiliki fitur penyimpanan file atau pendaftaran akun, bagaimana kamu merancang struktur penyimpanan yang intuitif bagi pengguna awam? Bagaimana kamu membantu pengguna membuat kata sandi yang aman?
Pada ChefAI, data pengguna seperti akun, preferensi, riwayat resep, dan hasil deteksi bahan akan disimpan secara terstruktur di database sehingga pengguna tidak perlu mengatur file secara manual. Untuk foto bahan, penyimpanan juga dapat dikelompokkan berdasarkan pengguna atau riwayat penggunaan agar mudah dikelola.

Pada saat membuat akun, pengguna dapat diberikan informasi mengenai syarat password, seperti menggunakan kombinasi huruf besar, huruf kecil, angka, dan karakter khusus. Password juga tidak disimpan dalam bentuk teks biasa, tetapi diamankan menggunakan proses hashing.

### 3. Bagaimana kamu mendesain fitur pencarian (search bar) di dalam aplikasi agar pengguna dapat mencari informasi dengan mudah? Selain itu, sebutkan aset eksternal yang digunakan dalam aplikasi. Apakah aset-aset tersebut berlisensi open-source, public domain, atau memiliki hak cipta khusus?
Fitur pencarian pada ChefAI dapat digunakan untuk mencari resep atau riwayat resep berdasarkan nama masakan maupun bahan makanan. Pencarian dibuat sederhana dengan menggunakan kata kunci sehingga pengguna tidak perlu memasukkan kalimat yang terlalu panjang.

Dalam pengembangan ChefAI, aset eksternal yang digunakan dapat berupa dataset bahan makanan dari Roboflow, library pemrograman, serta aset visual seperti icon atau gambar. Penggunaan setiap aset perlu diperiksa lisensinya terlebih dahulu. Jika menggunakan aset open-source, penggunaannya harus mengikuti ketentuan lisensi, sedangkan aset yang memiliki hak cipta tidak boleh digunakan sembarangan tanpa izin.

### 4. Jika aplikasi memiliki fitur interaksi sosial, bagaimana kamu mencegah pelanggaran etika digital di dalamnya? Jika aplikasi menggunakan fitur pintar berbasis AI, bagaimana memastikan AI tersebut bekerja secara etis dan bertanggung jawab bagi pengguna?
Jika ChefAI nantinya memiliki fitur interaksi sosial, pengguna perlu mengikuti aturan penggunaan seperti tidak melakukan penghinaan, menyebarkan spam, atau membagikan konten yang merugikan pengguna lain. Sistem juga dapat menyediakan fitur pelaporan jika terdapat konten atau perilaku yang tidak sesuai.

Untuk fitur AI, ChefAI menggunakan YOLO untuk mendeteksi bahan dan LLM untuk menghasilkan rekomendasi resep. Hasil AI tetap perlu dianggap sebagai rekomendasi dan pengguna diberikan kesempatan untuk memeriksa atau mengoreksi hasil deteksi sebelum resep dibuat. Informasi seperti alergi juga harus diperhatikan agar AI tidak memberikan rekomendasi yang bertentangan dengan kondisi yang dimasukkan pengguna.

### 5. Data pribadi (PII) apa saja yang mungkin dikumpulkan oleh aplikasi? Bagaimana cara kamu melindungi data tersebut agar tidak bocor atau disalahgunakan? Bagaimana aplikasi meminimalkan risiko pengguna menjadi korban penipuan siber di platformmu?
ChefAI dapat mengumpulkan beberapa data seperti nama, email, password, preferensi makanan, dan foto bahan makanan. Data tersebut harus disimpan dengan aman dan hanya digunakan untuk kebutuhan fitur aplikasi.

Password pengguna harus disimpan dalam bentuk hash, sedangkan informasi sensitif seperti API key tidak boleh ditampilkan di frontend atau dimasukkan ke repository publik. Aplikasi juga perlu membatasi akses terhadap data pengguna sesuai kebutuhan. Untuk mengurangi risiko penipuan, aplikasi dapat memberikan informasi kepada pengguna agar tidak membagikan password atau data sensitif serta menggunakan koneksi dan autentikasi yang aman.

### 6. Ketika aplikasi mengalami masalah teknis, bagaimana aplikasi mengomunikasikannya kepada pengguna? Tuliskan contoh rancangan pesan error ramah pengguna yang memandu pengguna melakukan troubleshooting mandiri secara mudah.
ChefAI sebaiknya tidak menampilkan pesan error teknis yang sulit dipahami pengguna. Jika terjadi masalah, aplikasi memberikan informasi mengenai masalah yang terjadi dan langkah sederhana yang dapat dilakukan.

Contohnya ketika foto gagal diproses:

**“Foto tidak dapat diproses.”**  
Pastikan foto memiliki pencahayaan yang cukup dan bahan makanan terlihat jelas. Silakan coba unggah foto kembali.

Jika koneksi ke layanan AI bermasalah:

**“Maaf, rekomendasi resep belum dapat dibuat.”**  
Periksa koneksi internet Anda dan coba beberapa saat lagi.

Dengan pesan seperti ini, pengguna dapat memahami masalah dan mencoba menyelesaikannya sendiri tanpa harus mengetahui proses teknis yang terjadi di dalam sistem.
