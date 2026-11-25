/**
 * GIA PHẢ HỌ TRẦN - TTS HELPER
 * Trợ lý điều khiển giọng đọc Nữ Tiếng Việt Nam chuẩn (vi-VN)
 * Khóa cứng ngôn ngữ đọc vi-VN, ưu tiên các giọng Nữ chuẩn: Google Tiếng Việt, Microsoft HoaiMy, Linh.
 */

window.ttsHelper = {
    getVietnameseVoice: function() {
        if (window.ttsAssistant && typeof window.ttsAssistant.getVietnameseVoice === 'function') {
            return window.ttsAssistant.getVietnameseVoice();
        }
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        const viVoices = voices.filter(v => {
            const lang = (v.lang || '').toLowerCase();
            const name = (v.name || '').toLowerCase();
            return (
                lang === 'vi-vn' ||
                lang === 'vi_vn' ||
                lang.startsWith('vi') ||
                name.includes('tiếng việt') ||
                name.includes('tieng viet') ||
                name.includes('vietnamese') ||
                name.includes('hoaimy')
            );
        });
        if (!viVoices.length) return null;

        const priorityKeywords = ['google tiếng việt', 'google vietnamese', 'hoaimy', 'hoài my', 'linh', 'tiếng việt', 'vietnamese'];
        for (const kw of priorityKeywords) {
            const match = viVoices.find(v => (v.name || '').toLowerCase().includes(kw));
            if (match) return match;
        }
        return viVoices[0];
    },
    speakPreface: (type) => window.ttsSpeakPreface && window.ttsSpeakPreface(type),
    speakMember: (id) => window.ttsSpeakMember && window.ttsSpeakMember(id),
    pause: () => window.ttsPause && window.ttsPause(),
    resume: () => window.ttsResume && window.ttsResume(),
    stop: () => window.ttsStop && window.ttsStop(),
    setRate: (rate, el) => window.ttsSetRate && window.ttsSetRate(rate, el)
};
