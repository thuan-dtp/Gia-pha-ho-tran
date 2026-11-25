/**
 * SERVICE WORKER - OFFLINE FIRST & INSTANT UPDATE ENGINE
 * Luôn ưu tiên lấy bản mới nhất khi có mạng và phục vụ Offline 100% khi mất mạng.
 */

const CACHE_NAME = "giapha-hotran-vi-female-v8";

const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./admin.html",
    "./manifest.json",
    "./favicon.ico",
    "./assets/icon_seal.svg",
    "./assets/icon_192.png",
    "./assets/icon_512.png",
    "./css/style.css",
    "./css/styles.css",
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
    "./js/tts-helper.js",
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

// Cài đặt Service Worker: bỏ qua HTTP disk-cache cũ để nạp đúng mã nguồn mới nhất
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Nạp mới tài nguyên v6.3.0 vào Cache...");
            return Promise.all(
                ASSETS_TO_CACHE.map((url) =>
                    fetch(new Request(url, { cache: "reload" })).then((res) => {
                        if (res && res.status === 200) {
                            return cache.put(url, res);
                        }
                    })
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// Xóa sạch toàn bộ cache phiên bản cũ ngay khi kích hoạt
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

// Chiến lược Network-First cho HTML/JS/CSS (không bao giờ kẹt code cũ), Offline Fallback 100%
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET" || !event.request.url.startsWith("http")) return;

    event.respondWith(
        fetch(event.request, { cache: "no-cache" })
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;
                    if (event.request.mode === "navigate") {
                        return caches.match("./index.html");
                    }
                });
            })
    );
});
