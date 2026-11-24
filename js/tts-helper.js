/**
 * GIA PHẢ HỌ TRẦN - TTS HELPER
 * Trợ lý điều khiển giọng đọc tiếng Việt Nam chuẩn (vi-VN)
 */

window.ttsHelper = {
    speakPreface: (type) => window.ttsSpeakPreface && window.ttsSpeakPreface(type),
    speakMember: (id) => window.ttsSpeakMember && window.ttsSpeakMember(id),
    pause: () => window.ttsPause && window.ttsPause(),
    resume: () => window.ttsResume && window.ttsResume(),
    stop: () => window.ttsStop && window.ttsStop(),
    setRate: (rate, el) => window.ttsSetRate && window.ttsSetRate(rate, el)
};
