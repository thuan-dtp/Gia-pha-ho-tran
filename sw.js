/**
 * SERVICE WORKER - OFFLINE FIRST ENGINE
 * Lưu trữ và phục vụ toàn bộ ứng dụng khi thiết bị không có mạng Internet.
 */

const CACHE_NAME = "giapha-hotran-v5.9.1-popover-search";

const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./admin.html",
    "./manifest.json",
    "./css/style.css",
    "./css/modal.css",
    "./css/responsive.css",
    "./libs/d3.min.js",
    "./libs/xlsx.full.min.js",
    "./data/data_truc_chinh.js",
    "./data/data_chi_1.js",
    "./data/data_chi_2.js",
    "./data/data_chi_lang_nam.js",
    "./data/data_manager.js",
    "./js/lunar.js",
    "./js/idb-storage.js",
    "./js/auth_manager.js",
    "./js/tts-assistant.js",
    "./js/incense.js",
    "./js/tree-classic.js",
    "./js/family-chart.js",
    "./js/galaxy-orbit.js",
    "./js/book-view.js",
    "./js/golden-search.js",
    "./js/sync.js",
    "./js/app.js",
    "./js/admin.js"
];

// Cài đặt Service Worker và Cache trước tài nguyên
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Đang nạp toàn bộ tài nguyên vào Cache...");
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Xóa cache cũ khi có phiên bản mới
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[Service Worker] Xóa Cache cũ:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Bắt và phản hồi yêu cầu mạng: Cache First, Network Fallback
self.addEventListener("fetch", (event) => {
    // Chỉ xử lý các yêu cầu http/https
    if (!event.request.url.startsWith("http")) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Trả về từ Cache ngay lập tức (siêu tốc, offline 100%)
                return cachedResponse;
            }

            // Nếu chưa có trong cache, thử tải từ mạng
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Khi mất mạng và không có trong cache, trả về trang chính nếu là điều hướng HTML
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }
            });
        })
    );
});
