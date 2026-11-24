/**
 * HỆ THỐNG TÂM LINH & LƯU BÚT DÒNG HỌ
 * Tích hợp Bàn Thờ Tổ Tiên, Thắp Hương Trầm, Chuông Đồng Gia Trì (Web Audio API)
 * và Sổ Lưu Bút Tri Ân con cháu.
 */

const IncenseSystem = (function() {
    'use strict';

    let audioCtx = null;

    /**
     * Khởi tạo âm thanh chuông đồng bằng Web Audio API
     * (Không cần tệp âm thanh bên ngoài, hoạt động 100% khi mất mạng)
     */
    function playTempleBell() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!audioCtx) audioCtx = new AudioContext();

            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const now = audioCtx.currentTime;

            // Bộ dao động âm chính (Tần số chuông đồng thanh tịnh 432Hz / 216Hz)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(432, now);
            osc.frequency.exponentialRampToValueAtTime(108, now + 4);

            gain.gain.setValueAtTime(0.8, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 5);

            // Hòa âm phụ tạo độ ngân rền
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(864, now);
            osc2.frequency.exponentialRampToValueAtTime(216, now + 3);
            gain2.gain.setValueAtTime(0.3, now);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 3);

            osc.connect(gain);
            osc2.connect(gain2);
            gain.connect(audioCtx.destination);
            gain2.connect(audioCtx.destination);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + 5);
            osc2.stop(now + 3);
        } catch (e) {
            console.log("Web Audio API không được hỗ trợ hoặc bị chặn:", e);
        }
    }

    /**
     * Thắp hương (Bật hiệu ứng khói hương và phát chuông)
     */
    async function lightIncense(personName, branchName, prayerText) {
        playTempleBell();

        const entry = {
            ten_nguoi_gui: personName || "Con cháu hậu duệ",
            chi_nhanh: branchName || "Toàn tộc",
            loi_chuc: prayerText || "Thành tâm kính bái Tiên Tổ, nguyện cầu dòng họ vạn đại trường tồn, con cháu hiển vinh hiếu thuận.",
            thoi_gian: new Date().toISOString(),
            loai: "Thắp hương & Tri ân"
        };

        if (window.IDBStorage) {
            await window.IDBStorage.addGuestbookEntry(entry);
        }

        return entry;
    }

    /**
     * Lấy toàn bộ danh sách lưu bút
     */
    async function getGuestbookList() {
        if (window.IDBStorage) {
            return await window.IDBStorage.getAllGuestbook();
        }
        return [];
    }

    return {
        playTempleBell,
        lightIncense,
        getGuestbookList
    };
})();

window.IncenseSystem = IncenseSystem;
