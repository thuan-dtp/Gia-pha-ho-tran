@echo off
chcp 65001 > nul
title GIA PHẢ ĐẠI TỘC HỌ TRẦN VIỆT NAM — TINH HOA TRUYỀN THỪA & KẾT NỐI CÁC CHI PHÁI

echo =========================================================================================
echo          GIA PHẢ ĐẠI TỘC HỌ TRẦN VIỆT NAM — TINH HOA TRUYỀN THỪA & KẾT NỐI CÁC CHI PHÁI
echo          TRẦN TỘC GIA PHẢ ĐA CHI NHÁNH TOÀN QUỐC — VẠN THẾ LƯU PHƯƠNG
echo =========================================================================================
echo.
echo [1] Mở ứng dụng ngay lập tức (Trực tiếp bằng trình duyệt - Xem & Quản lý đầy đủ)
echo [2] Khởi động Máy chủ Offline (http://localhost:8080 - Kích hoạt đầy đủ PWA Offline)
echo [3] Mở trang Quản trị gia phả (admin.html - Dành cho Trưởng Chi và Ban Trị Sự)
echo.
set /p choice="Nhập lựa chọn của bạn [1, 2 hoặc 3] (Mặc định: 1): "

if "%choice%"=="2" goto run_server
if "%choice%"=="3" goto run_admin
goto run_direct

:run_direct
echo.
echo Đang mở Gia Phả Đại Tộc Họ Trần Việt Nam trên trình duyệt mặc định...
start "" "index.html"
exit

:run_admin
echo.
echo Đang mở Bảng Quản trị Gia phả (admin.html)...
start "" "admin.html"
exit

:run_server
echo.
echo Đang khởi chạy máy chủ cục bộ tại http://localhost:8080 ...
echo Nhấn Ctrl + C để dừng máy chủ khi không sử dụng.
echo.
start "" "http://localhost:8080"
powershell -NoProfile -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host 'Máy chủ cục bộ đã sẵn sàng tại http://localhost:8080'; while ($listener.IsListening) { $context = $listener.GetContext(); $req = $context.Request; $res = $context.Response; $path = '.' + $req.RawUrl.Split('?')[0]; if ($path -eq './') { $path = './index.html' }; if (Test-Path $path) { $bytes = [System.IO.File]::ReadAllBytes($path); $ext = [System.IO.Path]::GetExtension($path); switch ($ext) { '.html' { $res.ContentType = 'text/html; charset=utf-8' } '.js' { $res.ContentType = 'application/javascript; charset=utf-8' } '.css' { $res.ContentType = 'text/css; charset=utf-8' } '.json' { $res.ContentType = 'application/json' } '.svg' { $res.ContentType = 'image/svg+xml' } '.png' { $res.ContentType = 'image/png' } default { $res.ContentType = 'application/octet-stream' } }; $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length) } else { $res.StatusCode = 404 }; $res.OutputStream.Close() }"
pause
