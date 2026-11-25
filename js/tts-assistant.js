/**
 * TRỢ LÝ GIỌNG ĐỌC TIẾNG VIỆT NAM MIỀN BẮC TRẦM ẤM (TEXT-TO-SPEECH) CHO NGƯỜI CAO TUỔI
 * - Ưu tiên giọng nam miền Bắc chuẩn: Microsoft NamMinh Online -> NamMinh / An / Male / Nam
 * - Hạ cao độ trầm ấm tự nhiên (pitch = 0.88 cho giọng nam; 0.82 cho giọng trung tính/nữ trên di động)
 * - Nhịp đọc trang trọng: Chậm (0.78) | Vừa (0.92) | Nhanh (1.08)
 * - Tách câu ngắn theo dấu chấm, chấm phẩy, xuống dòng; chống cắt ngang câu và chống kẹt nút điều khiển.
 */

class TTSAssistant {
    constructor() {
        this.synth = window.speechSynthesis || null;
        this.utterance = null;
        this.voice = null;
        this.isMaleVoice = false;
        this.pitch = 0.88; // Cao độ nam trầm ấm, trang trọng
        this.rate = 0.92;  // Mặc định mức "Vừa" (0.92) rõ ràng, khoan thai cho người cao tuổi
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
            // Lắng nghe đầy đủ sự kiện onvoiceschanged
            this.synth.onvoiceschanged = () => this.initVoice();
            if (typeof this.synth.addEventListener === "function") {
                this.synth.addEventListener("voiceschanged", () => this.initVoice());
            }
            // Vòng kiểm tra lặp 300ms tối đa 10 lần nếu trình duyệt nạp danh sách giọng chậm
            this.startVoicePolling();
        }
    }

    /**
     * Kiểm tra lặp 300ms (tối đa 10 lần) để bắt kịp giọng Online nạp bất đồng bộ
     */
    startVoicePolling() {
        if (!this.synth) return;
        if (this._voicePollTimer) clearInterval(this._voicePollTimer);
        this._voicePollCount = 0;

        this._voicePollTimer = setInterval(() => {
            this._voicePollCount++;
            this.initVoice();
            const isTopNamMinh = this.voice && /nam\s*minh/i.test(this.voice.name || "") && /online/i.test(this.voice.name || "");
            if (isTopNamMinh || this._voicePollCount >= 10) {
                clearInterval(this._voicePollTimer);
                this._voicePollTimer = null;
            }
        }, 300);
    }

    /**
     * Phân tích và chọn giọng nam Tiếng Việt miền Bắc trầm ấm chuẩn nhất
     * Trả về { voice, isMale, pitch }
     */
    selectVietnameseVoiceProfile() {
        if (!this.synth) return { voice: null, isMale: false, pitch: 0.84 };
        const voices = this.synth.getVoices() || [];
        if (!voices || voices.length === 0) return { voice: null, isMale: false, pitch: 0.84 };

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
                name.includes("namminh") ||
                name.includes("nam minh") ||
                name.includes("hoaimy") ||
                name.includes("hoài my")
            );
        });

        if (viVoices.length === 0) {
            return { voice: null, isMale: false, pitch: 0.84 };
        }

        const isFemaleName = (rawName) => {
            const name = (rawName || "").toLowerCase();
            return /hoaimy|hoài\s*my|\blinh\b|female|\bnữ\b|\bnu\b|giọng\s*nữ|giong\s*nu/i.test(name);
        };

        const isMaleName = (rawName) => {
            // Loại chữ "Vietnam / Việt Nam" trước khi dò từ khóa "Nam" độc lập
            const stripped = (rawName || "").replace(/việt\s*nam|viet\s*nam|vietnamese/gi, " ");
            return /namminh|nam\s*minh|\ban\b|\bmale\b|giọng\s*nam|giong\s*nam|\bnam\b/i.test(stripped);
        };

        // 1. Ưu tiên số 1: Microsoft NamMinh Online (giọng nam miền Bắc tự nhiên nhất trên Windows/Edge)
        const msNamMinhOnline = viVoices.find(v => {
            const n = v.name || "";
            return /microsoft/i.test(n) && /nam\s*minh/i.test(n) && /online/i.test(n);
        }) || viVoices.find(v => {
            const n = v.name || "";
            return /nam\s*minh/i.test(n) && /online/i.test(n);
        });

        if (msNamMinhOnline) {
            return { voice: msNamMinhOnline, isMale: true, pitch: 0.88 };
        }

        // 2. Ưu tiên số 2: Các giọng nam Tiếng Việt khác (NamMinh, Nam Minh, An, Male, Nam) — loại trừ giọng nữ
        const namMinhAny = viVoices.find(v => /nam\s*minh/i.test(v.name || "") && !isFemaleName(v.name));
        if (namMinhAny) {
            return { voice: namMinhAny, isMale: true, pitch: 0.88 };
        }

        const otherMaleVi = viVoices.find(v => isMaleName(v.name) && !isFemaleName(v.name));
        if (otherMaleVi) {
            return { voice: otherMaleVi, isMale: true, pitch: 0.88 };
        }

        // 3. Ưu tiên số 3: Trên Android/iOS hoặc trình duyệt chỉ có Google Tiếng Việt / vi-VN mặc định
        // -> Tự động chọn giọng vi-VN đó và hạ pitch xuống 0.82 - 0.84 để tạo âm sắc nam trầm ấm
        const googleVi = viVoices.find(v => /google/i.test(v.name || "") && !isFemaleName(v.name));
        if (googleVi) {
            return { voice: googleVi, isMale: false, pitch: 0.83 };
        }

        const neutralVi = viVoices.find(v => !isFemaleName(v.name));
        if (neutralVi) {
            return { voice: neutralVi, isMale: false, pitch: 0.83 };
        }

        // Trường hợp thiết bị chỉ cài duy nhất giọng nữ vi-VN -> hạ cao độ về 0.82 để âm sắc trầm trang nghiêm
        return { voice: viVoices[0], isMale: false, pitch: 0.82 };
    }

    /**
     * Tương thích API lấy đối tượng SpeechSynthesisVoice Tiếng Việt chuẩn nhất
     */
    getVietnameseVoice() {
        const profile = this.selectVietnameseVoiceProfile();
        this.isMaleVoice = profile.isMale;
        this.pitch = profile.pitch;
        return profile.voice;
    }

    initVoice() {
        if (!this.synth) return;
        const profile = this.selectVietnameseVoiceProfile();
        if (profile.voice) {
            const prevName = this.voice ? this.voice.name : "";
            this.voice = profile.voice;
            this.isMaleVoice = profile.isMale;
            this.pitch = profile.pitch;
            if (prevName !== profile.voice.name) {
                console.log(
                    "TTS Assistant: Đã chọn giọng đọc gia phả:",
                    profile.voice.name,
                    `(${profile.voice.lang}) | Nam miền Bắc: ${profile.isMale ? "Có" : "Giả lập trầm ấm"} | Pitch: ${profile.pitch}`
                );
            }
        } else {
            this.voice = null;
            this.isMaleVoice = false;
            this.pitch = 0.84;
        }
    }

    /**
     * Thông báo thân thiện khi thiết bị chưa có gói giọng Tiếng Việt
     */
    showDefaultVoiceNotice() {
        const msg = "Trình duyệt đang dùng giọng mặc định, khuyên dùng Microsoft Edge hoặc Chrome có kết nối mạng để nghe giọng Nam Tiếng Việt chuẩn nhất.";
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
     * giúp ngắt nghỉ tự nhiên, trang trọng và không bao giờ bị cắt ngang câu trên Chrome/Edge/iOS
     */
    splitIntoSentences(text) {
        if (!text) return [];

        // Chuyển các thẻ ngắt dòng HTML thành ký tự xuống dòng trước khi lọc thẻ HTML
        const normalized = String(text)
            .replace(/<\s*br\s*\/?>/gi, "\n")
            .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/[ \t]+/g, " ")
            .trim();

        if (!normalized) return [];

        // Tách câu theo xuống dòng, dấu chấm phẩy (;), chấm than (!), hỏi chấm (?) và dấu chấm câu (.)
        // (Bảo vệ các dãy số như 0977.181.611 không bị tách vụn ở dấu chấm giữa hai chữ số)
        const rawParts = normalized
            .split(/(?:\r?\n)+|(?<=[!?;])\s+|(?<!\d)\.(?!\d)\s+/)
            .map(s => s.trim())
            .filter(Boolean);

        const sentences = [];
        for (const part of rawParts) {
            if (part.length <= 185) {
                sentences.push(part);
            } else {
                // Nếu một câu quá dài (>185 ký tự), tách mềm tại dấu hai chấm hoặc dấu phẩy để tránh lỗi ngắt 15s của trình duyệt
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
     * Hủy hàng đợi phát âm cũ một cách an toàn trên mọi trình duyệt (kể cả khi đang pause trên Safari/Chrome)
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
            alert("Trình duyệt thiết bị của quý vị chưa tích hợp bộ đọc tiếng Việt Web Speech. Vui lòng thử trên trình duyệt Microsoft Edge, Google Chrome hoặc Safari.");
            return;
        }

        // Gọi window.speechSynthesis.cancel() sạch sẽ trước khi phát mới
        this.playSessionId++;
        this.safeCancelSynth();
        this.isPlaying = false;
        this.isPaused = false;

        // Cập nhật lại giọng nam Tiếng Việt tốt nhất ngay trước khi phát
        const profile = this.selectVietnameseVoiceProfile();
        if (profile.voice) {
            this.voice = profile.voice;
            this.isMaleVoice = profile.isMale;
            this.pitch = profile.pitch;
        } else {
            this.voice = null;
            this.isMaleVoice = false;
            this.pitch = 0.84;
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
        // Khoảng trễ nhỏ 40ms sau cancel() giúp Edge/Chrome không nuốt âm đầu của câu thứ nhất
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

        // Khóa ngôn ngữ Tiếng Việt và nhịp đọc trầm ấm
        const profile = this.selectVietnameseVoiceProfile();
        const selectedVoice = profile.voice || this.voice;

        utter.lang = (selectedVoice && selectedVoice.lang) ? selectedVoice.lang : "vi-VN";
        utter.rate = this.rate;
        utter.pitch = selectedVoice ? profile.pitch : this.pitch;
        utter.volume = 1.0;

        if (selectedVoice) {
            this.voice = selectedVoice;
            this.isMaleVoice = profile.isMale;
            this.pitch = profile.pitch;
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
                    // Nghỉ nhịp ngắn 130ms giữa các câu tạo phong thái đọc gia phả khoan thai, truyền cảm
                    this._chunkTimer = setTimeout(() => {
                        if (sessionId === this.playSessionId && this.isPlaying && !this.isPaused) {
                            this.speakNextChunk(sessionId);
                        }
                    }, 130);
                }
            }
        };

        utter.onerror = (e) => {
            if (sessionId !== this.playSessionId) return;
            const errType = e && e.error ? String(e.error).toLowerCase() : "";
            // Bỏ qua sự kiện hủy chủ động khi người dùng bấm Dừng / chuyển bài / đổi tốc độ
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
                }, 80);
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

        // Phòng lỗi trình duyệt đóng băng sau khi tạm dừng lâu: nếu chưa phát lại thì đọc tiếp câu hiện tại
        setTimeout(() => {
            if (sessionId === this.playSessionId && this.isPlaying && !this.isPaused && !this.synth.speaking) {
                this.speakNextChunk(sessionId);
            }
        }, 220);
    }

    /**
     * Đảo trạng thái Tạm dừng <-> Tiếp tục mượt mà, không bao giờ kẹt nút
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
            // Hủy câu hiện tại với session mới và phát lại ngay từ đầu câu đó ở tốc độ mới
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
     * Kiểm tra mức tốc độ đang chọn ('slow' | 'normal' | 'fast')
     */
    getRateMode() {
        if (this.rate <= 0.84) return "slow";
        if (this.rate >= 1.02) return "fast";
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
                        <button type="button" class="tts-btn-rate ${mode === "slow" ? "active" : ""}" data-rate="0.78" title="Đọc chậm trang nghiêm cho người cao tuổi (0.78x)">Chậm</button>
                        <button type="button" class="tts-btn-rate ${mode === "normal" ? "active" : ""}" data-rate="0.92" title="Đọc vừa chuẩn truyền cảm (0.92x)">Vừa</button>
                        <button type="button" class="tts-btn-rate ${mode === "fast" ? "active" : ""}" data-rate="1.08" title="Đọc nhanh rõ chữ (1.08x)">Nhanh</button>
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

        // 1. Cập nhật trên thanh nổi Floating Bar
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
                const bMode = r <= 0.84 ? "slow" : (r >= 1.02 ? "fast" : "normal");
                b.classList.toggle("active", bMode === mode);
            });
        }

        // 2. Đồng bộ toàn bộ cụm nút trên thẻ Tiểu sử / Bia ký / Sách gia phả
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
            if (onclickAttr.includes("0.78") || onclickAttr.includes("0.75")) {
                btn.classList.toggle("active", mode === "slow");
            } else if (onclickAttr.includes("1.08") || onclickAttr.includes("1.2")) {
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
 * Nút Tạm dừng tự động đảo Tạm dừng <-> Tiếp tục để không bao giờ bị kẹt nút
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
