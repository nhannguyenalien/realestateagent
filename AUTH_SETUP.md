# Thiết lập đăng nhập Google

1. Chạy `migrations/001_auth.sql` trong Neon SQL Editor.
2. Tạo OAuth 2.0 Client loại **Web application** trong Google Cloud Console.
3. Thêm redirect URI:
   - Local Pages: `http://localhost:8788/api/auth/google/callback/`
   - Production: `https://YOUR_DOMAIN/api/auth/google/callback/`
4. Tạo `.dev.vars` (không commit) với `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`.
5. Chạy `npm run pages:dev` để test cả giao diện và Cloudflare Pages Functions.

Trên Cloudflare Pages, thêm bốn giá trị trên tại **Settings → Variables and Secrets**. Các email trong `ADMIN_EMAILS` (phân cách bằng dấu phẩy) được cấp quyền admin; tài khoản Google khác nhận quyền agent.
