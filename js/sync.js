/**
 * HỆ THỐNG ĐỒNG BỘ TRỰC TUYẾN & NGOẠI TUYẾN (SYNC ENGINE)
 * Hỗ trợ kéo dữ liệu từ Google Sheets công khai (CSV/JSON),
 * GitHub Raw URL hoặc nhập/xuất sao lưu JSON cục bộ.
 */

const SyncEngine = (function() {
    'use strict';

    /**
     * Kiểm tra trạng thái mạng hiện tại
     */
    function isOnline() {
        return navigator.onLine;
    }

    /**
     * Kéo dữ liệu từ Google Sheets (dạng liên kết CSV công khai)
     * Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv
     */
    async function syncFromGoogleSheetsCSV(csvUrl) {
        if (!isOnline()) {
            throw new Error("Không có kết nối mạng Internet. Vui lòng kết nối mạng để đồng bộ từ Google Sheets.");
        }

        try {
            const response = await fetch(csvUrl, { cache: "no-cache" });
            if (!response.ok) {
                throw new Error(`Lỗi kết nối tới Google Sheets (${response.status} ${response.statusText})`);
            }
            const csvText = await response.text();

            // Dùng SheetJS để phân tích CSV
            if (!window.XLSX) {
                throw new Error("Chưa tải được thư viện SheetJS (xlsx.full.min.js).");
            }

            const workbook = XLSX.read(csvText, { type: "string" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet);

            // Chuyển đổi dữ liệu chuẩn hóa
            const members = rawRows.map(row => ({
                id: String(row.ID || row.id || "").trim(),
                parent_id: row.Parent_ID || row.parent_id ? String(row.Parent_ID || row.parent_id).trim() : null,
                doi_thu: parseInt(row.Doi_Thu || row.doi_thu || 1, 10),
                chi_nhanh: String(row.Chi_Nhanh || row.chi_nhanh || "Trục chính").trim(),
                ho_ten: String(row.Ho_Ten || row.ho_ten || "").trim(),
                ten_hieu: String(row.Ten_Hieu || row.ten_hieu || "").trim(),
                gioi_tinh: String(row.Gioi_Tinh || row.gioi_tinh || "Nam").trim(),
                ngay_sinh: String(row.Ngay_Sinh || row.ngay_sinh || "").trim(),
                con_song: String(row.Con_Song || row.con_song).toLowerCase() === "true" || row.Con_Song === 1 || row.Con_Song === "Còn sống",
                ngay_mat_am: String(row.Ngay_Mat_Am || row.ngay_mat_am || "").trim(),
                ngay_mat_duong: String(row.Ngay_Mat_Duong || row.ngay_mat_duong || "").trim(),
                vo_chong: String(row.Vo_Chong || row.vo_chong || "").trim(),
                mo_phan: String(row.Mo_Phan || row.mo_phan || "").trim(),
                tieu_su: String(row.Tieu_Su || row.tieu_su || "").trim(),
                cong_duc: String(row.Cong_Duc || row.cong_duc || "").trim(),
                danh_hieu: String(row.Danh_Hieu || row.danh_hieu || "").trim(),
                so_vang: String(row.So_Vang || row.so_vang).toLowerCase() === "true" || row.So_Vang === 1
            }));

            // Kiểm tra tính toàn vẹn
            const validation = window.familyDataManager.validateIntegrity(members);
            if (!validation.isValid) {
                throw new Error("Dữ liệu từ Google Sheets có lỗi: " + validation.errors.join("; "));
            }

            // Lưu vào IndexedDB
            if (window.IDBStorage) {
                await window.IDBStorage.saveAllMembers(members);
                // Lưu lại URL Google Sheets để lần sau tự đồng bộ
                await window.IDBStorage.setSetting("google_sheets_url", csvUrl);
                await window.IDBStorage.setSetting("last_sync_time", new Date().toISOString());
            }

            return {
                success: true,
                count: members.length,
                warnings: validation.warnings
            };
        } catch (e) {
            console.error("Lỗi đồng bộ Google Sheets:", e);
            throw e;
        }
    }

    /**
     * Xuất toàn bộ dữ liệu ra tệp JSON sao lưu
     */
    function exportBackupJSON() {
        const members = window.familyDataManager.getAllMembers();
        const dataStr = JSON.stringify({
            app: "GIA_PHA_HO_TRAN",
            export_date: new Date().toISOString(),
            total_members: members.length,
            members: members
        }, null, 2);

        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Gia_Pha_Ho_Tran_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Nhập tệp JSON sao lưu
     */
    async function importBackupJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    const members = parsed.members || (Array.isArray(parsed) ? parsed : null);
                    if (!members || !Array.isArray(members)) {
                        throw new Error("Định dạng tệp JSON không hợp lệ.");
                    }

                    const validation = window.familyDataManager.validateIntegrity(members);
                    if (!validation.isValid) {
                        throw new Error("Lỗi dữ liệu: " + validation.errors.join("; "));
                    }

                    if (window.IDBStorage) {
                        await window.IDBStorage.saveAllMembers(members);
                    }

                    resolve({ count: members.length, warnings: validation.warnings });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error("Không thể đọc tệp sao lưu."));
            reader.readAsText(file);
        });
    }

    return {
        isOnline,
        syncFromGoogleSheetsCSV,
        exportBackupJSON,
        importBackupJSON
    };
})();

window.SyncEngine = SyncEngine;
