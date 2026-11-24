@echo off
chcp 65001 >nul
title ĐẨY WEBSITE GIA PHẢ HỌ TRẦN LÊN GITHUB PAGES
color 0A

echo =====================================================================
echo    CÔNG CỤ TỰ ĐỘNG ĐẨY MÃ NGUỒN GIA PHẢ HỌ TRẦN LÊN GITHUB
echo =====================================================================
echo.
echo  Tài khoản: thuan-dtp
echo  Email:     thuantvttp@gmail.com
echo.
echo  CHỌN NƠI BẠN MUỐN ĐẨY LÊN:
echo    [1] Đẩy lên repo: https://github.com/thuan-dtp/thuan-dtp.github.io.git
echo        (Yêu cầu: Bạn đã vào github.com bấm "New" tạo repository thuan-dtp.github.io)
echo.
echo    [2] Đẩy lên repo: https://github.com/thuan-dtp/Gia-pha-ho-tran.git
echo        (Repo này ĐÃ CÓ SẴN trên GitHub của bạn)
echo =====================================================================
set /p choice="Nhập lựa chọn của bạn (1 hoặc 2, mặc định là 1): "

if "%choice%"=="2" (
    set REPO_URL=https://github.com/thuan-dtp/Gia-pha-ho-tran.git
    echo.
    echo -> Đang chuyển cấu hình sang repo: Gia-pha-ho-tran...
) else (
    set REPO_URL=https://github.com/thuan-dtp/thuan-dtp.github.io.git
    echo.
    echo -> Đang cấu hình repo: thuan-dtp.github.io...
)

cd /d "%~dp0"
git remote set-url origin %REPO_URL%

echo.
echo -> Đang tiến hành đẩy toàn bộ mã nguồn lên GitHub...
echo (LƯU Ý: Nếu trình duyệt hiện popup đăng nhập GitHub, hãy bấm "Sign in with your browser" và Authorize)
echo.

git push -u origin main --force

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo  [XUẤT SẮC] ĐÃ ĐẨY THÀNH CÔNG TOÀN BỘ MÃ NGUỒN LÊN GITHUB!
    echo =====================================================================
    if "%choice%"=="2" (
        echo  Địa chỉ website của bạn: https://thuan-dtp.github.io/Gia-pha-ho-tran/
    ) else (
        echo  Địa chỉ website của bạn: https://thuan-dtp.github.io
    )
    echo =====================================================================
) else (
    echo.
    echo [LỖI] Đẩy mã nguồn chưa thành công.
    echo Nguyên nhân có thể do:
    echo  1. Repo chưa được tạo trên github.com (vui lòng vào https://github.com/new để tạo)
    echo  2. Chưa hoàn tất xác thực đăng nhập trong trình duyệt
    echo =====================================================================
)

echo.
pause
