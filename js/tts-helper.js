/**
 * GIA PHẢ HỌ TRẦN - TTS HELPER
 * Trợ lý điều khiển giọng đọc Nam Tiếng Việt miền Bắc trầm ấm (vi-VN)
 * Ưu tiên: Microsoft NamMinh Online -> NamMinh / An / Male / Nam -> Google Tiếng Việt / vi-VN (hạ pitch 0.82-0.84).
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
            return lang.startsWith("vi") || lang.includes("vi") || name.includes("vietnam") || name.includes("tiếng việt") || name.includes("namminh");
        });
        if (!viVoices.length) return null;

        const isFemale = (n) => /hoaimy|hoài\s*my|\blinh\b|female|\bnữ\b|\bnu\b/i.test(n || "");
        const isMale = (n) => {
            const stripped = (n || "").replace(/việt\s*nam|viet\s*nam|vietnamese/gi, " ");
            return /namminh|nam\s*minh|\ban\b|\bmale\b|\bnam\b/i.test(stripped);
        };

        return (
            viVoices.find(v => /microsoft/i.test(v.name) && /nam\s*minh/i.test(v.name) && /online/i.test(v.name)) ||
            viVoices.find(v => isMale(v.name) && !isFemale(v.name)) ||
            viVoices.find(v => !isFemale(v.name)) ||
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
