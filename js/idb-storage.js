/**
 * HỆ THỐNG LƯU TRỮ OFFLINE INDEXEDDB (IDBStorage)
 * Đảm bảo ứng dụng chạy 100% không cần kết nối mạng.
 */

class IndexedDBManager {
    constructor() {
        this.dbName = "GiaPhaHoTranDB";
        this.dbVersion = 1;
        this.db = null;
    }

    async open() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 1. Store thành viên phả hệ
                if (!db.objectStoreNames.contains("members")) {
                    const memberStore = db.createObjectStore("members", { keyPath: "id" });
                    memberStore.createIndex("chi_nhanh", "chi_nhanh", { unique: false });
                    memberStore.createIndex("doi_thu", "doi_thu", { unique: false });
                }

                // 2. Store lưu bút & thắp hương online
                if (!db.objectStoreNames.contains("guestbook")) {
                    const guestbookStore = db.createObjectStore("guestbook", { keyPath: "id", autoIncrement: true });
                    guestbookStore.createIndex("thoi_gian", "thoi_gian", { unique: false });
                }

                // 3. Store cấu hình cài đặt
                if (!db.objectStoreNames.contains("settings")) {
                    db.createObjectStore("settings", { keyPath: "key" });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error("Lỗi mở IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /* =================== QUẢN LÝ THÀNH VIÊN =================== */

    async getAllMembers() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("members", "readonly");
            const store = tx.objectStore("members");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    async saveAllMembers(members) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("members", "readwrite");
            const store = tx.objectStore("members");
            store.clear();
            for (const m of members) {
                store.put(m);
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async putMember(member) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("members", "readwrite");
            const store = tx.objectStore("members");
            const req = store.put(member);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async deleteMember(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("members", "readwrite");
            const store = tx.objectStore("members");
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    /* =================== SỔ LƯU BÚT & THẮP HƯƠNG =================== */

    async addGuestbookEntry(entry) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("guestbook", "readwrite");
            const store = tx.objectStore("guestbook");
            entry.thoi_gian = entry.thoi_gian || new Date().toISOString();
            const req = store.add(entry);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async getAllGuestbook() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("guestbook", "readonly");
            const store = tx.objectStore("guestbook");
            const req = store.getAll();
            req.onsuccess = () => {
                const list = req.result || [];
                // Sắp xếp mới nhất lên đầu
                list.sort((a, b) => new Date(b.thoi_gian) - new Date(a.thoi_gian));
                resolve(list);
            };
            req.onerror = () => reject(req.error);
        });
    }

    /* =================== CÀI ĐẶT & MÃ PIN =================== */

    async getSetting(key, defaultValue = null) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("settings", "readonly");
            const store = tx.objectStore("settings");
            const req = store.get(key);
            req.onsuccess = () => {
                if (req.result && req.result.value !== undefined) {
                    resolve(req.result.value);
                } else {
                    resolve(defaultValue);
                }
            };
            req.onerror = () => resolve(defaultValue);
        });
    }

    async setSetting(key, value) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("settings", "readwrite");
            const store = tx.objectStore("settings");
            const req = store.put({ key, value });
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Khôi phục toàn bộ dữ liệu về mặc định ban đầu
     */
    async resetToDefault() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(["members", "settings"], "readwrite");
            tx.objectStore("members").clear();
            tx.objectStore("settings").clear();
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }
}

window.IDBStorage = new IndexedDBManager();
