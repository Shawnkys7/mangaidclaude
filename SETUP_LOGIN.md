# Setup Login Google, Login Email, dan Database (Firebase)

1. `npm install` (menambah paket `firebase` dan `nodemailer`)
2. Firebase Console > buat project > tambah Web app > salin config ke `.env` (lihat `.env.example`, bagian NEXT_PUBLIC_FIREBASE_*)
3. Authentication > Sign-in method: aktifkan **Google** dan **Email/Password**
4. Authentication > Settings > Authorized domains: tambahkan domain situs kamu
5. Firestore Database > Create database, lalu tab Rules: tempel isi `firestore.rules` dan Publish
6. Untuk kode verifikasi email: isi SMTP_* dan AUTH_CODE_SECRET di `.env`
   (Gmail: aktifkan 2-Step Verification, buat "App Password", pakai sebagai SMTP_PASS)
7. Restart server (`npm run dev`)

Data yang disimpan di Firestore (`users/{uid}`): riwayat, favorit, total detik membaca, level, exp.
