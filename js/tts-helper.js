/**
 * GIA PHẢ HỌ TRẦN - TTS HELPER
 * Trợ lý điều khiển giọng đọc Nữ Tiếng Việt Nam chuẩn tự nhiên (vi-VN)
 * Ưu tiên: Microsoft HoaiMy Online / HoaiMy -> Linh -> Google Tiếng Việt -> vi-VN (loại trừ ưu tiên giọng Nam).
 */

window.ttsHelper = {
    getVietnameseVoice: function() {
        if (window.ttsAssistant && typeof window.ttsAssistant.getVietnameseVoice === "function") {
            return window.ttsAssistant.getVietnameseVoice();
        }
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        const viVoices = voices.filter(v => {
            const lang = (v.lang || "").toLowerCase();
            const name = (v.name || "").toLowerCase();
            return lang.startsWith("vi") || lang.includes("vi-") || name.includes("vietnam") || name.includes("tiếng việt") || name.includes("hoaimy");
        });
        if (!viVoices.length) return null;

        const isMale = (n) => {
            const stripped = (n || "").replace(/việt\s*nam|viet\s*nam|vietnamese/gi, " ");
            return /namminh|nam\s*minh|\bmale\b|giọng\s*nam|\ban\b|\bnam\b/i.test(stripped);
        };
        const isFemale = (n) => /hoaimy|hoài\s*my|\blinh\b|female|\bnữ\b|\bnu\b|giọng\s*nữ/i.test(n || "");

        return (
            viVoices.find(v => /hoai\s*my|hoài\s*my/i.test(v.name) && /online/i.test(v.name)) ||
            viVoices.find(v => isFemale(v.name) && !isMale(v.name)) ||
            viVoices.find(v => /google/i.test(v.name) && !isMale(v.name)) ||
            viVoices.find(v => !isMale(v.name)) ||
            viVoices[0]
        );
    },
    speakPreface: (type) => window.ttsSpeakPreface && window.ttsSpeakPreface(type),
    speakMember: (id) => window.ttsSpeakMember && window.ttsSpeakMember(id),
    togglePause: () => window.ttsTogglePause && window.ttsTogglePause(),
    pause: () => window.ttsPause && window.ttsPause(),
    resume: () => window.ttsResume && window.ttsResume(),
    stop: () => window.ttsStop && window.ttsStop(),
    setRate: (rate, el) => window.ttsSetRate && window.ttsSetRate(rate, el)
};
