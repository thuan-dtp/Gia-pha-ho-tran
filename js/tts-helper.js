/**
 * GIA PHẢ HỌ TRẦN - TTS HELPER
 * Bộ xử lý Trợ lý Giọng đọc Nữ Tiếng Việt Nam chuẩn (vi-VN) theo cấu hình SKILL.md
 */

window.ttsHelper = {
    getVietnameseVoice: function() {
        if (window.ttsAssistant && typeof window.ttsAssistant.getVietnameseVoice === 'function') {
            return window.ttsAssistant.getVietnameseVoice();
        }
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
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
                name.includes('hoaimy')
            );
        });
        if (!viVoices.length) return null;

        const priorityKeywords = ['hoaimy', 'hoài my', 'google tiếng việt', 'google vietnamese', 'linh', 'tiếng việt', 'vietnamese'];
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
