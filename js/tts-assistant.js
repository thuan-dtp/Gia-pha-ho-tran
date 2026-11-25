/**
 * TRỢ LÝ GIỌNG ĐỌC TIẾNG VIỆT (TEXT-TO-SPEECH) CHO NGƯỜI CAO TUỔI
 * Sử dụng Web Speech API chuẩn HTML5, hoạt động 100% offline,
 * hỗ trợ phân đoạn văn bản thông minh (chunking) chống ngắt quãng trên Chrome/Edge/Safari,
 * điều chỉnh tốc độ đọc Chậm / Vừa / Nhanh và thanh điều khiển nổi tinh tế.
 */

class TTSAssistant {
    constructor() {
        this.synth = window.speechSynthesis || null;
        this.utterance = null;
        this.voice = null;
        this.rate = 0.95; // Mặc định tốc độ khoan thai, rõ tiếng cho các cụ cao niên
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTitle = "";
        this.currentChunks = [];
        this.chunkIndex = 0;
        this.floatingBarEl = null;

        this.initVoice();
        if (this.synth) {
            // Lắng nghe sự kiện nạp danh sách giọng đọc của trình duyệt
            this.synth.onvoiceschanged = () => this.initVoice();
            if (typeof this.synth.addEventListener === 'function') {
                this.synth.addEventListener('voiceschanged', () => this.initVoice());
            }
            // Quét định kỳ để bắt ngay giọng Nữ Tiếng Việt Online (HoaiMy / Google Tiếng Việt / Linh) khi trình duyệt nạp bất đồng bộ
            let tries = 0;
            const timer = setInterval(() => {
                tries++;
                this.initVoice();
                const hasPreferredFemale = this.voice && /hoaimy|hoài my|google|linh/i.test(this.voice.name || '');
                if (hasPreferredFemale || tries >= 16) {
                    clearInterval(timer);
                }
            }, 250);
        }
    }

    /**
     * Lọc và ưu tiên chọn giọng Nữ Tiếng Việt Nam (vi-VN) tự nhiên chuẩn nhất
     * Loại trừ hoàn toàn giọng tiếng Anh mặc định
     */
    getVietnameseVoice() {
        if (!this.synth) return null;
        const voices = this.synth.getVoices() || [];
        if (!voices || voices.length === 0) return null;

        // Chỉ giữ các giọng Tiếng Việt thực sự (loại trừ hoàn toàn en-US / en-GB / David / Zira / Mark)
        const viVoices = voices.filter(v => {
            const langNorm = (v.lang || '').toLowerCase().replace('_', '-');
            const name = (v.name || '').toLowerCase();
            if (langNorm.startsWith('en-') || /david|zira|mark|hazel|george|susan/.test(name)) {
                return false;
            }
            return (
                langNorm === 'vi-vn' ||
                langNorm === 'vi' ||
                langNorm.startsWith('vi-') ||
                name.includes('tiếng việt') ||
                name.includes('tieng viet') ||
                name.includes('vietnamese') ||
                name.includes('hoaimy') ||
                name.includes('hoài my')
            );
        });

        if (viVoices.length === 0) {
            return null;
        }

        // 1. Ưu tiên cao nhất: Giọng Nữ Tiếng Việt tự nhiên (Microsoft HoaiMy, Google Tiếng Việt, Linh)
        const hoaiMyOnline = viVoices.find(v => /hoaimy|hoài my/i.test(v.name || '') && /online|natural/i.test(v.name || ''));
        if (hoaiMyOnline) return hoaiMyOnline;

        const femalePriority = [
            'hoaimy',
            'hoài my',
            'google tiếng việt',
            'google vietnamese',
            'linh'
        ];

        for (const kw of femalePriority) {
            const found = viVoices.find(v => (v.name || '').toLowerCase().includes(kw));
            if (found) return found;
        }

        // 2. Ưu tiên giọng Nữ chuẩn mang mã vi-VN
        const femaleViVn = viVoices.find(v => {
            const name = (v.name || '').toLowerCase();
            return name.includes('female') || name.includes('nữ') || name.includes('google');
        });
        if (femaleViVn) return femaleViVn;

        // 3. Giọng chuẩn vi-VN tự nhiên của hệ thống
        const standardViVn = viVoices.find(v => {
            const stripped = (v.name || '').replace(/việt\s*nam|viet\s*nam|vietnamese/gi, ' ');
            return !/\bmale\b|\ban\b/i.test(stripped);
        });
        if (standardViVn) return standardViVn;

        // 4. Dự phòng giọng vi-VN có trên trình duyệt
        return viVoices[0];
    }

    initVoice() {
        if (!this.synth) return;
        const viVoice = this.getVietnameseVoice();
        if (viVoice) {
            this.voice = viVoice;
        } else {
            this.voice = null;
        }
    }

    /**
     * Tách văn bản thành các câu ngắn để Web Speech API đọc mượt mà không bị timeout
     */
    splitIntoSentences(text) {
        if (!text) return [];
        // Xóa mã HTML nếu có
        const clean = text.replace(/<[^>]*>/g, " ")
                          .replace(/\s+/g, " ")
                          .trim();
        // Tách câu theo dấu chấm, chấm phẩy, hai chấm, chấm than, hỏi chấm, xuống dòng
        const rawSentences = clean.split(/(?<=[.!?:;\n])\s+/);
        const result = [];
        let buffer = "";

        for (let s of rawSentences) {
            s = s.trim();
            if (!s) continue;
            if ((buffer + " " + s).length < 160) {
                buffer = buffer ? buffer + " " + s : s;
            } else {
                if (buffer) result.push(buffer);
                buffer = s;
            }
        }
        if (buffer) result.push(buffer);
        return result.length ? result : [clean];
    }

    /**
     * Bắt đầu đọc bài văn tế / phả ký / tiểu sử
     */
    speak(title, fullText) {
        if (!this.synth) {
            alert("Trình duyệt thiết bị của quý vị chưa tích hợp bộ đọc tiếng Việt Web Speech. Vui lòng thử trên trình duyệt Google Chrome, Edge hoặc Cốc Cốc.");
            return;
        }

        // Dừng câu đọc trước nếu đang chạy
        this.stop(false);

        this.currentTitle = title || "Đang đọc gia phả...";
        this.currentChunks = this.splitIntoSentences(fullText);
        this.chunkIndex = 0;

        if (this.currentChunks.length === 0) return;

        this.isPlaying = true;
        this.isPaused = false;
        this.showFloatingBar();

        const startSpeaking = () => {
            if (!this.isPlaying) return;
            const viVoice = this.getVietnameseVoice();
            this.voice = viVoice || null;
            this.speakNextChunk();
        };

        // Chờ ngắn tối đa 600ms nếu trình duyệt vừa mở trang đang nạp giọng Nữ Tiếng Việt bất đồng bộ
        const currentVi = this.getVietnameseVoice();
        const hasNaturalFemale = currentVi && /hoaimy|hoài my|google|linh/i.test(currentVi.name || '');
        if (!hasNaturalFemale) {
            let waited = 0;
            const waitVoices = setInterval(() => {
                waited += 50;
                const v = this.getVietnameseVoice();
                if ((v && /hoaimy|hoài my|google|linh/i.test(v.name || '')) || waited >= 600) {
                    clearInterval(waitVoices);
                    startSpeaking();
                }
            }, 50);
        } else {
            startSpeaking();
        }
    }

    speakNextChunk() {
        if (!this.isPlaying || this.chunkIndex >= this.currentChunks.length) {
            this.isPlaying = false;
            this.isPaused = false;
            this.hideFloatingBar();
            return;
        }

        const sentence = this.currentChunks[this.chunkIndex];
        const utter = new SpeechSynthesisUtterance(sentence);

        // Khóa cứng ngôn ngữ vi-VN và pitch = 1.0 trên mọi đoạn đọc (kể cả khi trình duyệt dùng giọng mặc định)
        utter.lang = 'vi-VN';
        utter.rate = this.rate;
        utter.pitch = 1.0;

        const currentViVoice = this.getVietnameseVoice() || this.voice;
        if (currentViVoice) {
            this.voice = currentViVoice;
            utter.voice = currentViVoice;
        }

        utter.onend = () => {
            if (this.isPlaying && !this.isPaused) {
                this.chunkIndex++;
                this.speakNextChunk();
            }
        };

        utter.onerror = (e) => {
            const errType = e && e.error ? String(e.error).toLowerCase() : '';
            if (errType === 'canceled' || errType === 'interrupted') return;
            if (this.isPlaying && !this.isPaused) {
                this.chunkIndex++;
                this.speakNextChunk();
            }
        };

        this.utterance = utter;
        this.synth.speak(utter);
        this.updateBarUI();
    }

    pause() {
        if (!this.synth || !this.isPlaying || this.isPaused) return;
        this.synth.pause();
        this.isPaused = true;
        this.updateBarUI();
    }

    resume() {
        if (!this.synth || !this.isPlaying || !this.isPaused) return;
        this.synth.resume();
        this.isPaused = false;
        this.updateBarUI();
    }

    stop(hideBar = true) {
        if (!this.synth) return;
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.chunkIndex = 0;
        this.currentChunks = [];
        if (hideBar) {
            this.hideFloatingBar();
        }
    }

    setRate(newRate) {
        this.rate = newRate;
        if (this.isPlaying) {
            // Khởi động lại chunk hiện tại với tốc độ mới
            this.synth.cancel();
            this.speakNextChunk();
        } else {
            this.updateBarUI();
        }
    }

    /**
     * Tạo hoặc hiển thị thanh điều khiển nổi (Floating Speech Bar)
     */
    showFloatingBar() {
        let bar = document.getElementById("tts-floating-bar");
        if (!bar) {
            bar = document.createElement("div");
            bar.id = "tts-floating-bar";
            bar.className = "tts-floating-bar";
            document.body.appendChild(bar);
        }

        bar.innerHTML = `
            <div class="tts-bar-content">
                <div class="tts-pulse-icon">
                    <span class="tts-wave"></span>
                    <span class="tts-wave"></span>
                    <span class="tts-wave"></span>
                    <span class="tts-speaker">🔊</span>
                </div>
                <div class="tts-info">
                    <div class="tts-title-label">TRỢ LÝ GIỌNG ĐỌC GIA PHẢ</div>
                    <div class="tts-current-text" id="tts-bar-title">${this.currentTitle}</div>
                </div>
                <div class="tts-controls">
                    <button class="tts-btn-act" id="tts-btn-toggle" title="Tạm dừng / Tiếp tục">
                        ${this.isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
                    </button>
                    <button class="tts-btn-act" id="tts-btn-stop" title="Dừng đọc">
                        ⏹️ Dừng
                    </button>
                    <div class="tts-rate-selector">
                        <span class="tts-rate-label">Tốc độ:</span>
                        <button class="tts-btn-rate ${this.rate <= 0.8 ? 'active' : ''}" data-rate="0.75" title="Đọc chậm cho người cao tuổi">Chậm</button>
                        <button class="tts-btn-rate ${this.rate > 0.8 && this.rate < 1.15 ? 'active' : ''}" data-rate="0.95" title="Đọc vừa chuẩn">Vừa</button>
                        <button class="tts-btn-rate ${this.rate >= 1.15 ? 'active' : ''}" data-rate="1.2" title="Đọc nhanh">Nhanh</button>
                    </div>
                    <button class="tts-btn-close" id="tts-btn-close" title="Đóng thanh giọng đọc">✕</button>
                </div>
            </div>
        `;

        // Gắn sự kiện các nút
        const btnToggle = bar.querySelector("#tts-btn-toggle");
        if (btnToggle) {
            btnToggle.onclick = () => {
                if (this.isPaused) this.resume();
                else this.pause();
            };
        }

        const btnStop = bar.querySelector("#tts-btn-stop");
        if (btnStop) {
            btnStop.onclick = () => this.stop(true);
        }

        const btnClose = bar.querySelector("#tts-btn-close");
        if (btnClose) {
            btnClose.onclick = () => this.stop(true);
        }

        const rateBtns = bar.querySelectorAll(".tts-btn-rate");
        rateBtns.forEach(btn => {
            btn.onclick = (e) => {
                const r = parseFloat(e.target.dataset.rate);
                this.setRate(r);
                rateBtns.forEach(b => b.classList.remove("active"));
                e.target.classList.add("active");
            };
        });

        bar.style.display = "flex";
        this.floatingBarEl = bar;
    }

    updateBarUI() {
        const bar = document.getElementById("tts-floating-bar");
        if (!bar) return;
        const btnToggle = bar.querySelector("#tts-btn-toggle");
        if (btnToggle) {
            btnToggle.innerHTML = this.isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
        }
        const titleEl = bar.querySelector("#tts-bar-title");
        if (titleEl) {
            titleEl.textContent = this.currentTitle;
        }
    }

    hideFloatingBar() {
        const bar = document.getElementById("tts-floating-bar");
        if (bar) {
            bar.style.display = "none";
        }
    }
}

// Khởi tạo đối tượng toàn cục
window.ttsAssistant = new TTSAssistant();

/**
 * Hàm tiện ích gọi đọc Lời Tựa Đại Tộc hoặc Chi Lãng Nam
 */
window.ttsSpeakPreface = function(type) {
    if (!window.ttsAssistant) return;

    if (type === 'great') {
        const text = `
            Gia phả Đại Tộc Họ Trần Việt Nam. Tinh hoa truyền thừa và kết nối các chi phái toàn quốc.
            Hào khí Đông A, trăm năm thịnh vượng.
            Câu đối tổ tiên: Tổ đức lưu quang vạn đại thịnh. Tông công đống thảo cửu trùng xuân.
            Khởi nguyên: Hào khí Đông A, trăm năm thịnh vượng.
            Từ đường linh từ: Đền Trần, Thiên Trường, Nam Định.
            Ngày kỵ tổ hằng niên: Ngày mười tám tháng Giêng âm lịch.
            Hậu duệ Đời 23, Trần Văn Thuần kính biên và số hóa lưu truyền hậu thế, năm Bính Ngọ 2026.
        `;
        window.ttsAssistant.speak("Lời Tựa Đại Tộc Họ Trần Việt Nam", text);
    } else if (type === 'langnam') {
        const text = `
            Chi Họ Trần Lãng Nam, thôn Đồng Thái, xã Ninh Cường, huyện Trực Ninh, tỉnh Nam Định.
            Nhánh trực hệ nối liền hai mươi tư đời từ Đức Thủy Tổ Trần Kinh.
            Lời tựa về Đạo hiếu và mục đích lập phả:
            Hiếu kính dâng lên tông tổ, điều lành tụ lại ở cháu con.
            Cây có cội mới trổ cành xanh lá, nước có nguồn mới biển rộng sông sâu.
            Người sinh ra ở đời nhờ phúc ấm của Tiên Tổ mà được vuông tròn hình vóc, học hành tấn tới, dựng nghiệp thành gia.
            Gia phả này lập nên nhằm mục đích phụng sự đạo hiếu, kết nối muôn đời con cháu cụ Chí Hòa và các thế hệ con cháu Chi Họ Trần Lãng Nam nhớ về nguồn cội, biết rõ vai vế tôn ty, giữ gìn giềng mối gia phong, tương thân tương ái.
            Lịch sử khai khẩn đất Lãng Nam:
            Cụ Quốc Hiển, con cụ Trần Trí, cháu nội An Sinh Vương Trần Liễu, vào năm Tân Dậu 1381 đã dời về Cồn Cả, xã Cát Thành, Trực Ninh khai hoang lập ấp. Con cháu cụ đời đời cần lao quai đê lấn biển, lập nên thôn Lãng Nam.
            Bài thơ cổ của Cụ Tổ Bình Hoàn năm Kỷ Tỵ 1629:
            Thôn Cường đất lịch quê ta, xung quanh lau sậy bao thành núi cao.
            Gió đưa phảng phất dạt dào, dập dìu như thể khác nào tầng cao.
            Gần xa thấp thoáng tựa hồ quân reo, đèn dầu lấp lánh cheo leo,
            Nhìn sao Bắc đẩu, chiếu sông ngân hà,
            Bầy cây với bãi phù sa, trùng trùng điệp điệp tiếng đà âm thanh.
        `;
        window.ttsAssistant.speak("Lời Tựa Chi Họ Trần Lãng Nam", text);
    }
};

/**
 * Hàm tiện ích gọi đọc tiểu sử chi tiết của một vị tiền nhân
 */
window.ttsSpeakMember = function(memberId) {
    if (!window.ttsAssistant || !window.familyDataManager) return;
    const m = window.familyDataManager.getMemberById(memberId);
    if (!m) return;

    const privacy = window.isPrivacyMode && m.con_song;
    let text = `
        Kính đọc thông tin tiền nhân: ${m.ho_ten}.
        ${m.ten_hieu ? 'Tên hiệu hoặc danh xưng: ' + m.ten_hieu + '.' : ''}
        Thế hệ: Đời thứ ${m.doi_thu}, thuộc ${m.chi_nhanh}.
        ${m.danh_hieu ? 'Phẩm hàm tước vị: ' + m.danh_hieu + '.' : ''}
        Giới tính: ${m.gioi_tinh}.
        Năm sinh: ${privacy ? 'Bảo mật riêng tư.' : (m.ngay_sinh ? m.ngay_sinh : 'Chưa rõ.')}.
    `;

    if (!m.con_song) {
        text += `
            Ngày kỵ giỗ âm lịch: ${m.ngay_mat_am ? m.ngay_mat_am : 'Chưa rõ.'}.
            Mộ phần và nơi an táng: ${m.mo_phan ? m.mo_phan : 'Chưa rõ.'}.
        `;
    } else {
        text += ` Hiện còn sinh thời. `;
    }

    if (m.vo_chong) {
        text += ` Phối ngẫu: ${m.vo_chong}. `;
    }

    if (m.tieu_su) {
        text += ` Tiểu sử và hành trạng: ${m.tieu_su}. `;
    }

    if (m.cong_duc) {
        text += ` Công đức với dòng họ và quê hương: ${m.cong_duc}. `;
    }

    window.ttsAssistant.speak(`Tiểu sử: ${m.ho_ten} (Đời ${m.doi_thu})`, text);
};

/**
 * Các hàm điều khiển nhanh giọng đọc cho giao diện bảng tiểu sử
 */
window.ttsPause = function() {
    if (window.ttsAssistant) window.ttsAssistant.pause();
};

window.ttsResume = function() {
    if (window.ttsAssistant) window.ttsAssistant.resume();
};

window.ttsStop = function() {
    if (window.ttsAssistant) window.ttsAssistant.stop(true);
};

window.ttsSetRate = function(rate, btnEl) {
    if (window.ttsAssistant) {
        window.ttsAssistant.setRate(rate);
        if (btnEl) {
            const parent = btnEl.parentElement;
            if (parent) {
                parent.querySelectorAll(".btn-tts-speed").forEach(b => b.classList.remove("active"));
                btnEl.classList.add("active");
            }
        }
    }
};
