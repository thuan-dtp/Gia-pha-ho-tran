/**
 * TRỢ LÝ GIỌNG ĐỌC NỮ TIẾNG VIỆT NAM CHUẨN (vi-VN) CHO NGƯỜI CAO TUỔI
 * - Khóa cứng ngôn ngữ vi-VN
 * - Ưu tiên giọng Nữ Tiếng Việt tự nhiên: Microsoft HoaiMy Online / HoaiMy -> Linh -> Google Tiếng Việt -> vi-VN
 * - Cao độ chuẩn tự nhiên pitch = 1.0; Tốc độ: Chậm (0.85) | Vừa (1.0) | Nhanh (1.2)
 * - Tách câu ngắn tự nhiên, chống cắt ngang câu và chống kẹt nút Tạm dừng / Tiếp tục / Dừng.
 */

class TTSAssistant {
    constructor() {
        this.synth = window.speechSynthesis || null;
        this.utterance = null;
        this.voice = null;
        this.pitch = 1.0; // Cao độ chuẩn tự nhiên cho giọng Nữ Tiếng Việt
        this.rate = 1.0;  // Mặc định mức "Vừa" (1.0), Chậm (0.85), Nhanh (1.2)
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTitle = "";
        this.currentChunks = [];
        this.chunkIndex = 0;
        this.floatingBarEl = null;
        this.playSessionId = 0;
        this._chunkTimer = null;
        this._voicePollTimer = null;
        this._voicePollCount = 0;

        this.initVoice();
        if (this.synth) {
            // Lắng nghe đầy đủ sự kiện onvoiceschanged để không bao giờ rơi về giọng tiếng Anh
            this.synth.onvoiceschanged = () => this.initVoice();
            if (typeof this.synth.addEventListener === "function") {
                this.synth.addEventListener("voiceschanged", () => this.initVoice());
            }
            // Vòng kiểm tra lặp 300ms tối đa 10 lần nếu trình duyệt nạp danh sách giọng chậm
            this.startVoicePolling();
        }
    }

    /**
     * Kiểm tra lặp 300ms (tối đa 10 lần) để bắt kịp giọng Nữ Online nạp bất đồng bộ
     */
    startVoicePolling() {
        if (!this.synth) return;
        if (this._voicePollTimer) clearInterval(this._voicePollTimer);
        this._voicePollCount = 0;

        this._voicePollTimer = setInterval(() => {
            this._voicePollCount++;
            this.initVoice();
            const isTopHoaiMy = this.voice && /hoai\s*my|hoài\s*my/i.test(this.voice.name || "") && /online/i.test(this.voice.name || "");
            if (isTopHoaiMy || this._voicePollCount >= 10) {
                clearInterval(this._voicePollTimer);
                this._voicePollTimer = null;
            }
        }, 300);
    }

    /**
     * Lọc và ưu tiên chọn giọng NỮ Tiếng Việt Nam (vi-VN) tự nhiên nhất
     * Loại bỏ ưu tiên giọng Nam (NamMinh, male)
     */
    selectVietnameseVoiceProfile() {
        if (!this.synth) return { voice: null, pitch: 1.0 };
        const voices = this.synth.getVoices() || [];
        if (!voices || voices.length === 0) return { voice: null, pitch: 1.0 };

        // Lọc toàn bộ danh sách giọng Tiếng Việt (vi-VN / vi_VN / Vietnamese)
        const viVoices = voices.filter(v => {
            const lang = (v.lang || "").toLowerCase();
            const name = (v.name || "").toLowerCase();
            return (
                lang === "vi-vn" ||
                lang === "vi_vn" ||
                lang.startsWith("vi") ||
                lang.includes("vi-") ||
                name.includes("vietnam") ||
                name.includes("tiếng việt") ||
                name.includes("tieng viet") ||
                name.includes("hoaimy") ||
                name.includes("hoài my") ||
                name.includes("namminh")
            );
        });

        if (viVoices.length === 0) {
            // Tuyệt đối không chọn voices[0] tiếng Anh
            return { voice: null, pitch: 1.0 };
        }

        const isMaleName = (rawName) => {
            const stripped = (rawName || "").replace(/việt\s*nam|viet\s*nam|vietnamese/gi, " ");
            return /namminh|nam\s*minh|\bmale\b|giọng\s*nam|giong\s*nam|\ban\b|\bnam\b/i.test(stripped);
        };

        const isExplicitFemale = (rawName) => {
            const name = (rawName || "").toLowerCase();
            return /hoaimy|hoài\s*my|\blinh\b|female|\bnữ\b|\bnu\b|giọng\s*nữ|giong\s*nu/i.test(name);
        };

        // 1. Ưu tiên số 1: Microsoft HoaiMy Online (giọng Nữ Tiếng Việt tự nhiên nhất trên Edge/Windows)
        const msHoaiMyOnline = viVoices.find(v => {
            const n = v.name || "";
            return /hoai\s*my|hoài\s*my/i.test(n) && /online/i.test(n);
        });
        if (msHoaiMyOnline) {
            return { voice: msHoaiMyOnline, pitch: 1.0 };
        }

        // 2. Ưu tiên số 2: Microsoft HoaiMy / Linh hoặc các giọng Nữ Tiếng Việt khác
        const hoaiMyOrLinh = viVoices.find(v => isExplicitFemale(v.name) && !isMaleName(v.name));
        if (hoaiMyOrLinh) {
            return { voice: hoaiMyOrLinh, pitch: 1.0 };
        }

        // 3. Ưu tiên số 3: Google Tiếng Việt / Google Vietnamese (giọng nữ tự nhiên chuẩn trên Chrome/Android)
        const googleVi = viVoices.find(v => /google/i.test(v.name || "") && !isMaleName(v.name));
        if (googleVi) {
            return { voice: googleVi, pitch: 1.0 };
        }

        // 4. Ưu tiên số 4: Bất kỳ giọng vi-VN / vi_VN nào không phải giọng nam
        const nonMaleVi = viVoices.find(v => !isMaleName(v.name));
        if (nonMaleVi) {
            return { voice: nonMaleVi, pitch: 1.0 };
        }

        // 5. Dự phòng cuối cùng nếu thiết bị chỉ có duy nhất 1 giọng tiếng Việt
        return { voice: viVoices[0], pitch: 1.0 };
    }

    /**
     * Tương thích API lấy đối tượng SpeechSynthesisVoice Nữ Tiếng Việt chuẩn nhất
     */
    getVietnameseVoice() {
        const profile = this.selectVietnameseVoiceProfile();
        this.pitch = 1.0;
        return profile.voice;
    }

    initVoice() {
        if (!this.synth) return;
        const profile = this.selectVietnameseVoiceProfile();
        this.pitch = 1.0;
        if (profile.voice) {
            const prevName = this.voice ? this.voice.name : "";
            this.voice = profile.voice;
            if (prevName !== profile.voice.name) {
                console.log(
                    "TTS Assistant: Đã khóa cứng giọng đọc Nữ Tiếng Việt:",
                    profile.voice.name,
                    `(${profile.voice.lang})`
                );
            }
        } else {
            this.voice = null;
        }
    }

    /**
     * Thông báo thân thiện khi thiết bị chưa có gói giọng Tiếng Việt
     */
    showDefaultVoiceNotice() {
        const msg = "Trình duyệt đang dùng giọng mặc định, khuyên dùng Microsoft Edge hoặc Chrome có kết nối mạng để nghe giọng Tiếng Việt Nam chuẩn nhất.";
        if (window.showIndexToast) {
            window.showIndexToast(msg, false);
        } else if (window.showAdminToast) {
            window.showAdminToast(msg, false);
        } else {
            console.warn(msg);
        }
    }

    /**
     * Chia văn bản thành từng câu ngắn theo dấu chấm (.), dấu chấm phẩy (;), dấu hỏi/chấm than và xuống dòng
     * giúp ngắt nghỉ tự nhiên, mượt mà và không bị cắt ngang câu
     */
    splitIntoSentences(text) {
        if (!text) return [];

        const normalized = String(text)
            .replace(/<\s*br\s*\/?>/gi, "\n")
            .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/[ \t]+/g, " ")
            .trim();

        if (!normalized) return [];

        // Tách câu theo xuống dòng, dấu chấm phẩy (;), chấm than (!), hỏi chấm (?) và dấu chấm câu (.)
        // Bảo vệ các dãy số như 0977.181.611 không bị tách vụn
        const rawParts = normalized
            .split(/(?:\r?\n)+|(?<=[!?;])\s+|(?<!\d)\.(?!\d)\s+/)
            .map(s => s.trim())
            .filter(Boolean);

        const sentences = [];
        for (const part of rawParts) {
            if (part.length <= 185) {
                sentences.push(part);
            } else {
                const subClauses = part.split(/(?<=[,:])\s+/);
                let buffer = "";
                for (const clause of subClauses) {
                    const cleanClause = clause.trim();
                    if (!cleanClause) continue;
                    if (!buffer) {
                        buffer = cleanClause;
                    } else if ((buffer + " " + cleanClause).length <= 175) {
                        buffer += " " + cleanClause;
                    } else {
                        sentences.push(buffer);
                        buffer = cleanClause;
                    }
                }
                if (buffer) sentences.push(buffer);
            }
        }

        return sentences.length ? sentences : [normalized];
    }

    /**
     * Hủy hàng đợi phát âm cũ an toàn trên mọi trình duyệt
     */
    safeCancelSynth() {
        if (this._chunkTimer) {
            clearTimeout(this._chunkTimer);
            this._chunkTimer = null;
        }
        if (!this.synth) return;
        try {
            if (this.synth.paused) {
                this.synth.resume();
            }
            this.synth.cancel();
        } catch (e) {
            console.warn("TTS cancel warning:", e);
        }
    }

    /**
     * Bắt đầu đọc bài văn tế / phả ký / tiểu sử
     */
    speak(title, fullText) {
        if (!this.synth) {
            alert("Trình duyệt thiết bị của quý vị chưa tích hợp bộ đọc tiếng Việt Web Speech. Vui lòng thử trên trình duyệt Google Chrome, Edge hoặc Cốc Cốc.");
            return;
        }

        // Gọi window.speechSynthesis.cancel() sạch sẽ trước khi phát mới
        this.playSessionId++;
        this.safeCancelSynth();
        this.isPlaying = false;
        this.isPaused = false;

        // Cập nhật lại giọng Nữ Tiếng Việt tốt nhất ngay trước khi phát
        const profile = this.selectVietnameseVoiceProfile();
        this.pitch = 1.0;
        if (profile.voice) {
            this.voice = profile.voice;
        } else {
            this.voice = null;
            this.showDefaultVoiceNotice();
        }

        this.currentTitle = title || "Đang đọc gia phả...";
        this.currentChunks = this.splitIntoSentences(fullText);
        this.chunkIndex = 0;

        if (this.currentChunks.length === 0) {
            this.updateBarUI();
            return;
        }

        this.isPlaying = true;
        this.isPaused = false;
        this.showFloatingBar();
        this.updateBarUI();

        const currentSession = this.playSessionId;
        this._chunkTimer = setTimeout(() => {
            if (currentSession === this.playSessionId && this.isPlaying) {
                this.speakNextChunk(currentSession);
            }
        }, 40);
    }

    speakNextChunk(sessionId = this.playSessionId) {
        if (sessionId !== this.playSessionId) return;

        if (!this.isPlaying || this.chunkIndex >= this.currentChunks.length) {
            this.isPlaying = false;
            this.isPaused = false;
            this.utterance = null;
            this.updateBarUI();
            this.hideFloatingBar();
            return;
        }

        const sentence = this.currentChunks[this.chunkIndex];
        const utter = new SpeechSynthesisUtterance(sentence);

        // Khóa cứng ngôn ngữ vi-VN và cao độ chuẩn tự nhiên cho giọng Nữ
        utter.lang = "vi-VN";
        utter.rate = this.rate;
        utter.pitch = 1.0;
        utter.volume = 1.0;

        const profile = this.selectVietnameseVoiceProfile();
        const selectedVoice = profile.voice || this.voice;
        if (selectedVoice) {
            this.voice = selectedVoice;
            utter.voice = selectedVoice;
        }

        utter.onend = () => {
            if (sessionId !== this.playSessionId) return;
            if (this.isPlaying && !this.isPaused) {
                this.chunkIndex++;
                if (this.chunkIndex >= this.currentChunks.length) {
                    this.isPlaying = false;
                    this.isPaused = false;
                    this.utterance = null;
                    this.updateBarUI();
                    this.hideFloatingBar();
                } else {
                    this._chunkTimer = setTimeout(() => {
                        if (sessionId === this.playSessionId && this.isPlaying && !this.isPaused) {
                            this.speakNextChunk(sessionId);
                        }
                    }, 90);
                }
            }
        };

        utter.onerror = (e) => {
            if (sessionId !== this.playSessionId) return;
            const errType = e && e.error ? String(e.error).toLowerCase() : "";
            if (errType === "canceled" || errType === "interrupted") {
                return;
            }
            console.warn("TTS chunk warning:", e);
            if (this.isPlaying && !this.isPaused) {
                this.chunkIndex++;
                this._chunkTimer = setTimeout(() => {
                    if (sessionId === this.playSessionId && this.isPlaying && !this.isPaused) {
                        this.speakNextChunk(sessionId);
                    }
                }, 60);
            }
        };

        this.utterance = utter;
        this.synth.speak(utter);
        this.updateBarUI();
    }

    pause() {
        if (!this.synth || !this.isPlaying || this.isPaused) return;
        if (this._chunkTimer) {
            clearTimeout(this._chunkTimer);
            this._chunkTimer = null;
        }
        try {
            if (this.synth.speaking && !this.synth.paused) {
                this.synth.pause();
            }
        } catch (e) {
            console.warn("TTS pause warning:", e);
        }
        this.isPaused = true;
        this.updateBarUI();
    }

    resume() {
        if (!this.synth || !this.isPlaying || !this.isPaused) return;
        this.isPaused = false;
        const sessionId = this.playSessionId;
        try {
            if (this.synth.paused) {
                this.synth.resume();
            }
        } catch (e) {
            console.warn("TTS resume warning:", e);
        }
        this.updateBarUI();

        setTimeout(() => {
            if (sessionId === this.playSessionId && this.isPlaying && !this.isPaused && !this.synth.speaking) {
                this.speakNextChunk(sessionId);
            }
        }, 220);
    }

    /**
     * Đảo trạng thái Tạm dừng <-> Tiếp tục mượt mà
     */
    togglePause() {
        if (!this.synth || !this.isPlaying) return;
        if (this.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    stop(hideBar = true) {
        this.playSessionId++;
        this.safeCancelSynth();
        this.isPlaying = false;
        this.isPaused = false;
        this.chunkIndex = 0;
        this.currentChunks = [];
        this.utterance = null;
        this.updateBarUI();
        if (hideBar) {
            this.hideFloatingBar();
        }
    }

    setRate(newRate) {
        const parsed = parseFloat(newRate);
        if (!isNaN(parsed)) {
            this.rate = parsed;
        }
        if (this.isPlaying) {
            this.playSessionId++;
            this.isPaused = false;
            this.safeCancelSynth();
            const sessionId = this.playSessionId;
            this.updateBarUI();
            this._chunkTimer = setTimeout(() => {
                if (sessionId === this.playSessionId && this.isPlaying) {
                    this.speakNextChunk(sessionId);
                }
            }, 40);
        } else {
            this.updateBarUI();
        }
    }

    /**
     * Kiểm tra mức tốc độ đang chọn: Chậm (0.85) | Vừa (1.0) | Nhanh (1.2)
     */
    getRateMode() {
        if (this.rate <= 0.92) return "slow";
        if (this.rate >= 1.1) return "fast";
        return "normal";
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

        const mode = this.getRateMode();
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
                    <button type="button" class="tts-btn-act" id="tts-btn-toggle" title="Tạm dừng / Tiếp tục">
                        ${this.isPaused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng"}
                    </button>
                    <button type="button" class="tts-btn-act" id="tts-btn-stop" title="Dừng đọc">
                        ⏹️ Dừng
                    </button>
                    <div class="tts-rate-selector">
                        <span class="tts-rate-label">Tốc độ:</span>
                        <button type="button" class="tts-btn-rate ${mode === "slow" ? "active" : ""}" data-rate="0.85" title="Đọc chậm cho người cao tuổi (0.85x)">Chậm</button>
                        <button type="button" class="tts-btn-rate ${mode === "normal" ? "active" : ""}" data-rate="1.0" title="Đọc vừa chuẩn tự nhiên (1.0x)">Vừa</button>
                        <button type="button" class="tts-btn-rate ${mode === "fast" ? "active" : ""}" data-rate="1.2" title="Đọc nhanh (1.2x)">Nhanh</button>
                    </div>
                    <button type="button" class="tts-btn-close" id="tts-btn-close" title="Đóng thanh giọng đọc">✕</button>
                </div>
            </div>
        `;

        const btnToggle = bar.querySelector("#tts-btn-toggle");
        if (btnToggle) {
            btnToggle.onclick = () => this.togglePause();
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
                const r = parseFloat(e.currentTarget.dataset.rate);
                this.setRate(r);
            };
        });

        bar.style.display = "flex";
        this.floatingBarEl = bar;
    }

    /**
     * Đồng bộ trạng thái nút Tạm dừng / Tiếp tục và nút tốc độ trên cả thanh nổi lẫn các bảng tiểu sử
     */
    updateBarUI() {
        const mode = this.getRateMode();

        const bar = document.getElementById("tts-floating-bar");
        if (bar) {
            const btnToggle = bar.querySelector("#tts-btn-toggle");
            if (btnToggle) {
                btnToggle.innerHTML = this.isPaused ? "▶️ Tiếp tục" : "⏸️ Tạm dừng";
            }
            const titleEl = bar.querySelector("#tts-bar-title");
            if (titleEl) {
                titleEl.textContent = this.currentTitle;
            }
            bar.querySelectorAll(".tts-btn-rate").forEach(b => {
                const r = parseFloat(b.dataset.rate);
                const bMode = r <= 0.92 ? "slow" : (r >= 1.1 ? "fast" : "normal");
                b.classList.toggle("active", bMode === mode);
            });
        }

        document.querySelectorAll(".btn-tts-pause").forEach(btn => {
            if (this.isPlaying && this.isPaused) {
                btn.innerHTML = "▶️ Tiếp Tục";
                btn.title = "Tiếp tục nghe giọng đọc";
            } else {
                btn.innerHTML = "⏸️ Tạm Dừng";
                btn.title = "Tạm dừng giọng đọc";
            }
        });

        document.querySelectorAll(".member-tts-speed .btn-tts-speed").forEach(btn => {
            const onclickAttr = btn.getAttribute("onclick") || "";
            if (onclickAttr.includes("0.85") || onclickAttr.includes("0.75") || onclickAttr.includes("0.78")) {
                btn.classList.toggle("active", mode === "slow");
            } else if (onclickAttr.includes("1.2") || onclickAttr.includes("1.08")) {
                btn.classList.toggle("active", mode === "fast");
            } else {
                btn.classList.toggle("active", mode === "normal");
            }
        });
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
    if (window.ttsAssistant) window.ttsAssistant.togglePause();
};

window.ttsTogglePause = function() {
    if (window.ttsAssistant) window.ttsAssistant.togglePause();
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
