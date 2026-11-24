$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "    HỆ THỐNG TỰ ĐỘNG ĐẨY MÃ NGUỒN GIA PHẢ LÊN GITHUB PAGES" -ForegroundColor Yellow
Write-Host "    Tài khoản: thuan-dtp" -ForegroundColor White
Write-Host "    Repository: https://github.com/thuan-dtp/Gia-pha-ho-tran.git" -ForegroundColor White
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "-> Đang kết nối và đẩy mã nguồn lên GitHub..." -ForegroundColor Green
Write-Host "(Nếu trình duyệt hiện cửa sổ GitHub, vui lòng bấm 'Authorize' để xác nhận)" -ForegroundColor Gray
Write-Host ""

Set-Location -Path $PSScriptRoot
git remote set-url origin https://github.com/thuan-dtp/Gia-pha-ho-tran.git
git push -u origin main --force

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "=========================================================================" -ForegroundColor Green
    Write-Host "  [XUẤT SẮC] ĐÃ ĐẨY THÀNH CÔNG 100% MÃ NGUỒN LÊN GITHUB PAGES!" -ForegroundColor Green
    Write-Host "  Địa chỉ website của bạn: https://thuan-dtp.github.io/Gia-pha-ho-tran/" -ForegroundColor Yellow
    Write-Host "=========================================================================" -ForegroundColor Green
} else {
    Write-Host "=========================================================================" -ForegroundColor Red
    Write-Host "  [CHƯA HOÀN TẤT] Lệnh đẩy chưa thành công do chưa xác thực tài khoản." -ForegroundColor Red
    Write-Host "  Vui lòng đảm bảo bạn đã bấm xác nhận đăng nhập trên trình duyệt." -ForegroundColor Red
    Write-Host "=========================================================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "Nhấn phím bất kỳ để đóng cửa sổ..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
