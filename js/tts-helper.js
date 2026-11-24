/**
 * GIA PHẢ HỌ TRẦN - TTS HELPER
 * Trợ lý điều khiển giọng đọc tiếng Việt Nam chuẩn (vi-VN)
 * Khóa cứng ngôn ngữ đọc vi-VN, ưu tiên các giọng chuẩn HoaiMy / NamMinh / Google Tiếng Việt.
 */

window.ttsHelper = {
    getVietnameseVoice: function() {
        if (window.ttsAssistant && typeof window.ttsAssistant.getVietnameseVoice === 'function') {
            return window.ttsAssistant.getVietnameseVoice();
        }
        if (!window.speechSynthesis) return null;
        const voices = window.speechSynthesis.getVoices() || [];
        const priorityKeywords = ['hoaimy', 'hoài my', 'namminh', 'nam minh', 'tiếng việt', 'tieng viet', 'vietnamese'];
        for (const kw of priorityKeywords) {
            const match = voices.find(v => {
                const name = (v.name || '').toLowerCase();
                const lang = (v.lang || '').toLowerCase();
                return (lang.includes('vi') || name.includes(kw)) && name.includes(kw);
            });
            if (match) return match;
        }
        const viLangVoice = voices.find(v => {
            const lang = (v.lang || '').toLowerCase();
            return lang.includes('vi') || lang.startsWith('vi');
        });
        if (viLangVoice) return viLangVoice;
        const viNameVoice = voices.find(v => {
            const name = (v.name || '').toLowerCase();
            return name.includes('vietnam') || name.includes('tiếng việt') || name.includes('tieng viet');
        });
        if (viNameVoice) return viNameVoice;
        return null;
    },
    speakPreface: (type) => window.ttsSpeakPreface && window.ttsSpeakPreface(type),
    speakMember: (id) => window.ttsSpeakMember && window.ttsSpeakMember(id),
    pause: () => window.ttsPause && window.ttsPause(),
    resume: () => window.ttsResume && window.ttsResume(),
    stop: () => window.ttsStop && window.ttsStop(),
    setRate: (rate, el) => window.ttsSetRate && window.ttsSetRate(rate, el)
};
