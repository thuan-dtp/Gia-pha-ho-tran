/**
 * GIA PHẢ HỌ TRẦN - APPLICATION CONTROLLER (APP.JS)
 * Điều phối toàn bộ ứng dụng, quản lý 5 Tab, thanh tiện ích thông minh,
 * modal bia ký, thắp hương online và Service Worker PWA.
 */

// Biến trạng thái toàn cục
window.isPrivacyMode = true; // Mặc định bảo mật thông tin người còn sống
window.currentFontSizeLevel = 0; // 0: Chuẩn, 1: Lớn (A+), 2: Cực lớn (A++)
window.isDarkMode = false;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Khởi tạo dữ liệu
    await window.familyDataManager.init();

    // 2. Tải thiết lập cá nhân từ IndexedDB / localStorage
    await loadUserSettings();

    // 3. Khởi tạo các Tab View
    initTabViews();

    // 4. Khởi tạo thanh tiện ích (A+, Dark Mode, Fullscreen, Incense, Privacy)
    initUtilityBar();

    // 5. Khởi tạo Modal Thắp Hương & Bia Ký
    initModals();

    // 6. Theo dõi trạng thái kết nối mạng (Online / Offline)
    initNetworkMonitor();

    // 7. Đăng ký Service Worker cho PWA Offline 100%
    registerServiceWorker();

    // 8. Khởi tạo Hệ thống Sửa Nhanh Tại Chỗ & Phân Quyền Cây Phả Hệ
    initQuickEditSystem();

    // 9. Khởi tạo Tiện ích Bổ Sung Sử Liệu & Chỉ Đường GPS
    initContributeHistorySystem();

    // 10. Tự động mở Tab mặc định (Phả Đồ Cổ Điển hoặc Tab lưu trước đó)
    const savedTab = localStorage.getItem("last_active_tab") || "tree";
    window.switchTab(savedTab);
});

/**
 * Khởi tạo các đối tượng điều khiển 5 Tab
 */
function initTabViews() {
    window.bookView = new BookView("book-container");
    window.classicTree = new ClassicTree("tree-container");
    window.familyChart = new FamilyChart("family-chart-container", "family-detail-panel");
    window.galaxyOrbit = new GalaxyOrbit("galaxy-container");
    window.goldenTab = new GoldenSearchTab("golden-container");
}

/**
 * Hàm chuyển đổi giữa 5 Tab chính
 */
window.switchTab = function(tabName, targetMemberId = null) {
    // Ẩn tất cả tab-content
    const contents = document.querySelectorAll(".tab-pane");
    contents.forEach(pane => pane.classList.remove("active"));

    // Bỏ active tất cả nav-items
    const navItems = document.querySelectorAll(".main-nav-item");
    navItems.forEach(btn => btn.classList.remove("active"));

    // Bật pane tương ứng
    const targetPane = document.getElementById(`pane-${tabName}`);
    const targetBtn = document.getElementById(`nav-btn-${tabName}`);
    if (targetPane) targetPane.classList.add("active");
    if (targetBtn) targetBtn.classList.add("active");

    // Lưu tab đang xem
    localStorage.setItem("last_active_tab", tabName);

    // Kích hoạt render nội dung cho tab được chọn
    switch (tabName) {
        case "book":
            window.bookView.init();
            if (targetMemberId) {
                setTimeout(() => {
                    const el = document.getElementById(`member-entry-${targetMemberId}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 200);
            }
            break;
        case "tree":
            window.classicTree.init();
            break;
        case "family":
            window.familyChart.init(targetMemberId);
            break;
        case "galaxy":
            window.galaxyOrbit.init();
            break;
        case "golden":
            window.goldenTab.init();
            break;
    }
};

/**
 * Khởi tạo Thanh Tiện Ích Thông Minh
 */
function initUtilityBar() {
    // 1. Tăng cỡ chữ cho người cao tuổi (A+ / A- / Mặc định)
    const btnFontPlus = document.getElementById("btn-font-plus");
    const btnFontReset = document.getElementById("btn-font-reset");

    if (btnFontPlus) {
        btnFontPlus.addEventListener("click", () => {
            window.currentFontSizeLevel = (window.currentFontSizeLevel + 1) % 3;
            applyFontSize();
        });
    }

    if (btnFontReset) {
        btnFontReset.addEventListener("click", () => {
            window.currentFontSizeLevel = 0;
            applyFontSize();
        });
    }

    // 2. Chế độ đọc ban đêm / Ánh nến (Candle / Dark Mode)
    const btnDarkMode = document.getElementById("btn-dark-mode");
    if (btnDarkMode) {
        btnDarkMode.addEventListener("click", () => {
            window.isDarkMode = !window.isDarkMode;
            applyTheme();
        });
    }

    // 3. Trình chiếu toàn màn hình (Fullscreen)
    const btnFullscreen = document.getElementById("btn-fullscreen");
    if (btnFullscreen) {
        btnFullscreen.addEventListener("click", () => {
            toggleFullscreen();
        });
    }

    // 4. Công tắc Bảo mật riêng tư người còn sống
    const chkPrivacy = document.getElementById("chk-privacy-mode");
    if (chkPrivacy) {
        chkPrivacy.checked = window.isPrivacyMode;
        chkPrivacy.addEventListener("change", (e) => {
            window.isPrivacyMode = e.target.checked;
            localStorage.setItem("privacy_mode", window.isPrivacyMode);
            // Re-render tab hiện tại
            const activeTab = localStorage.getItem("last_active_tab") || "tree";
            window.switchTab(activeTab);
        });
    }

    // 5. Thắp hương & Lưu bút online
    const btnOpenIncense = document.getElementById("btn-open-incense");
    if (btnOpenIncense) {
        btnOpenIncense.addEventListener("click", () => {
            openIncenseModal();
        });
    }

    // 6. Bộ lọc chi nhánh chung trên header
    const branchSelect = document.getElementById("global-branch-select");
    if (branchSelect) {
        branchSelect.addEventListener("change", (e) => {
            const branch = e.target.value;
            if (window.classicTree) window.classicTree.setFilter(branch);
            if (window.bookView) window.bookView.setFilter(branch);
        });
    }
}

/**
 * Áp dụng kích cỡ chữ
 */
function applyFontSize() {
    const body = document.body;
    body.classList.remove("font-large", "font-xlarge");
    if (window.currentFontSizeLevel === 1) {
        body.classList.add("font-large");
    } else if (window.currentFontSizeLevel === 2) {
        body.classList.add("font-xlarge");
    }
    localStorage.setItem("font_size_level", window.currentFontSizeLevel);

    const label = document.getElementById("font-size-indicator");
    if (label) {
        label.innerText = window.currentFontSizeLevel === 0 ? "A" : (window.currentFontSizeLevel === 1 ? "A+" : "A++");
    }
}

/**
 * Áp dụng chế độ giao diện (Dark / Candle mode)
 */
function applyTheme() {
    const body = document.body;
    if (window.isDarkMode) {
        body.classList.add("dark-candle-theme");
    } else {
        body.classList.remove("dark-candle-theme");
    }
    localStorage.setItem("dark_mode", window.isDarkMode);

    const btn = document.getElementById("btn-dark-mode");
    if (btn) {
        btn.innerHTML = window.isDarkMode ? "☀️ Ban Ngày" : "🕯️ Ánh Nến / Đêm";
    }
}

/**
 * Bật/Tắt Toàn màn hình
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.warn("Không thể bật fullscreen:", err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Tải thiết lập người dùng đã lưu
 */
async function loadUserSettings() {
    const savedFont = localStorage.getItem("font_size_level");
    if (savedFont !== null) {
        window.currentFontSizeLevel = parseInt(savedFont, 10);
        applyFontSize();
    }

    const savedDark = localStorage.getItem("dark_mode");
    if (savedDark !== null) {
        window.isDarkMode = savedDark === "true";
        applyTheme();
    }

    const savedPrivacy = localStorage.getItem("privacy_mode");
    if (savedPrivacy !== null) {
        window.isPrivacyMode = savedPrivacy === "true";
    }
}

/**
 * Modal Xem Thông Tin Bia Ký Chi Tiết Thành Viên
 */
window.showMemberDetailModal = function(memberId) {
    const m = window.familyDataManager.getMemberById(memberId);
    if (!m) return;

    const modal = document.getElementById("member-detail-modal");
    const body = document.getElementById("modal-detail-body");
    if (!modal || !body) return;

    const isDead = !m.con_song;
    const privacy = window.isPrivacyMode && m.con_song;

    body.innerHTML = `
        <div class="stele-modal-content">
            <div class="stele-header">
                <div class="stele-ornament">❖ ❖ ❖</div>
                <h2 class="stele-title text-gold">${m.ho_ten}</h2>
                <div class="stele-sub">${m.ten_hieu || "Bậc Tiêu Biểu Họ Trần"}</div>
            </div>

            <div class="stele-grid">
                <div class="stele-avatar-col">
                    <div class="stele-avatar-box">
                        <span class="avatar-large">${m.gioi_tinh === 'Nữ' ? '👵' : '👴'}</span>
                        <div class="stele-badge-status ${m.con_song ? 'status-alive' : 'status-deceased'}">
                            ${m.con_song ? '● Còn tại thế' : '✦ Đã quy tiên'}
                        </div>
                    </div>
                </div>

                <div class="stele-info-col">
                    <p><strong>Thế hệ & Chi nhánh:</strong> <span class="text-gold font-bold">Đời ${m.doi_thu} • ${m.chi_nhanh}</span></p>
                    <p><strong>Phẩm hàm / Tước vị:</strong> ${m.danh_hieu || "Chưa ghi nhận"}</p>
                    <p><strong>Ngày sinh:</strong> ${privacy ? 'Bảo mật riêng tư' : (m.ngay_sinh || 'Chưa rõ')}</p>
                    ${!m.con_song ? `
                        <p class="text-red"><strong>Ngày kỵ nhật (Giỗ Âm):</strong> ${m.ngay_mat_am || 'Chưa rõ'}</p>
                        <p><strong>Ngày mất Dương lịch:</strong> ${m.ngay_mat_duong || 'Chưa rõ'}</p>
                    ` : ''}
                    <p><strong>Phối ngẫu:</strong> ${m.vo_chong || 'Chưa ghi nhận'}</p>
                    <p>
                        <strong>Nơi an táng / Mộ phần:</strong> ${m.mo_phan || 'Còn sinh thời'}
                        ${(!m.con_song && m.mo_phan && !m.mo_phan.includes("Còn sinh thời") && !m.mo_phan.toLowerCase().includes("chưa rõ") && !m.mo_phan.toLowerCase().includes("thất lạc")) ? `
                            <button class="btn-gps-inline" onclick="window.openGpsMap('${(m.mo_phan || '').replace(/'/g, "\\'")}', '${m.ho_ten.replace(/'/g, "\\'")}')" title="Chỉ đường Google Maps tới nơi an nghỉ">
                                📍 Chỉ đường bản đồ
                            </button>
                        ` : ''}
                    </p>
                </div>
            </div>

            <div class="stele-bio-block">
                <h4>📜 TIỂU SỬ & HÀNH TRẠNG</h4>
                <p>${m.tieu_su || "Chưa có văn bia tiểu sử chi tiết."}</p>
            </div>

            ${m.cong_duc ? `
                <div class="stele-merit-block">
                    <h4>⭐ CÔNG ĐỨC VỚI DÒNG HỌ</h4>
                    <p>${m.cong_duc}</p>
                </div>
            ` : ''}

            <div class="modal-stele-actions text-center mt-3" style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                <button class="btn-royal" onclick="window.closeAllModals(); window.switchTab('family', '${m.id}')">👨‍👩‍👧‍👦 Xem Cây Gia Đình</button>
                <button class="btn-royal-outline" onclick="window.closeAllModals(); window.switchTab('book', '${m.id}')">📖 Xem Trong Sách Phả</button>
                <button class="btn-royal-sm-tts" onclick="window.ttsSpeakMember('${m.id}')" title="Nghe giọng đọc tiếng Việt văn bia tiền nhân này">🔊 Nghe Đọc Bia Ký</button>
                <button class="btn-quick-edit-trigger" onclick="window.openQuickEditAuth('${m.id}')">✏️ Sửa / Bổ Sung (Phân Quyền)</button>
            </div>
        </div>
    `;

    modal.style.display = "flex";
};

/**
 * Khởi tạo và Quản lý Modal Thắp Hương & Lưu Bút
 */
function initModals() {
    // Đóng modal khi bấm nút close hoặc click ra ngoài
    const closeBtns = document.querySelectorAll(".modal-close-btn");
    closeBtns.forEach(btn => {
        btn.addEventListener("click", () => window.closeAllModals());
    });

    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal-overlay")) {
            window.closeAllModals();
        }
    });

    // Form thắp hương & lưu bút
    const formIncense = document.getElementById("form-light-incense");
    if (formIncense) {
        formIncense.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("incense-sender-name").value;
            const branch = document.getElementById("incense-sender-branch").value;
            const prayer = document.getElementById("incense-prayer-text").value;

            // Kích hoạt hiệu ứng khói hương bốc lên
            const burner = document.querySelector(".incense-burner-visual");
            if (burner) burner.classList.add("smoking");

            // Phát tiếng chuông & lưu vào IDB
            await window.IncenseSystem.lightIncense(name, branch, prayer);

            // Tải lại danh sách lưu bút
            loadGuestbookToModal();

            alert("Kính cẩn thắp hương thành kính và lưu lời tri ân thành công!");
            document.getElementById("incense-prayer-text").value = "";
        });
    }

    // Nút gõ chuông độc lập
    const btnBell = document.getElementById("btn-sound-bell");
    if (btnBell) {
        btnBell.addEventListener("click", () => {
            window.IncenseSystem.playTempleBell();
        });
    }
}

window.closeAllModals = function() {
    const modals = document.querySelectorAll(".modal-overlay");
    modals.forEach(m => m.style.display = "none");
};

function openIncenseModal() {
    const modal = document.getElementById("incense-modal");
    if (modal) {
        modal.style.display = "flex";
        loadGuestbookToModal();
    }
}

async function loadGuestbookToModal() {
    const listEl = document.getElementById("incense-guestbook-list");
    if (!listEl) return;

    const entries = await window.IncenseSystem.getGuestbookList();
    if (entries.length === 0) {
        listEl.innerHTML = `<div class="empty-note text-center">Chưa có lưu bút nào. Hãy là người đầu tiên kính dâng nén hương thơm!</div>`;
        return;
    }

    listEl.innerHTML = entries.map(item => `
        <div class="guestbook-item">
            <div class="guestbook-header">
                <span class="guestbook-author">🕯️ ${item.ten_nguoi_gui} (${item.chi_nhanh})</span>
                <span class="guestbook-time">${new Date(item.thoi_gian).toLocaleDateString("vi-VN")}</span>
            </div>
            <div class="guestbook-body">${item.loi_chuc}</div>
        </div>
    `).join("");
}

/**
 * Theo dõi trạng thái mạng Internet
 */
function initNetworkMonitor() {
    const indicator = document.getElementById("network-status-badge");
    const updateStatus = () => {
        if (!indicator) return;
        if (navigator.onLine) {
            indicator.className = "network-badge online";
            indicator.innerHTML = "🟢 Trực tuyến";
            indicator.title = "Đang có kết nối mạng Internet";
        } else {
            indicator.className = "network-badge offline";
            indicator.innerHTML = "🟠 Ngoại tuyến (Offline 100%)";
            indicator.title = "Đang chạy hoàn toàn từ bộ nhớ thiết bị mà không cần Internet";
        }
    };

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    updateStatus();
}

/**
 * Đăng ký Service Worker
 */
function registerServiceWorker() {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
        navigator.serviceWorker.register("./sw.js")
            .then(reg => console.log("Service Worker đăng ký thành công:", reg.scope))
            .catch(err => console.log("Chạy trực tiếp file local hoặc lỗi Service Worker:", err));
    }
}


/* ==========================================================================
   HỆ THỐNG SỬA NHANH TẠI CHỖ & XÁC THỰC PHÂN QUYỀN (INDEX.HTML)
   ========================================================================== */

window._targetMemberForQuickEdit = null;

/**
 * Hiển thị Toast thông báo nhanh trên giao diện trang chủ
 */
window.showIndexToast = function(msg, isSuccess = true) {
    const toast = document.getElementById("index-toast");
    const msgEl = document.getElementById("index-toast-message");
    const iconEl = document.getElementById("index-toast-icon");
    if (!toast) return;

    msgEl.innerText = msg;
    iconEl.innerText = isSuccess ? "✅" : "⚠️";
    toast.style.background = isSuccess ? "#065f46" : "#7f1d1d";
    toast.style.borderColor = isSuccess ? "#34d399" : "#f87171";
    toast.style.display = "flex";

    clearTimeout(window._indexToastTimeout);
    window._indexToastTimeout = setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
};

/**
 * Mở hộp thoại Xác thực quyền và Sửa nhanh thành viên khi người xem phát hiện sai sót
 */
window.openQuickEditAuth = async function(memberId) {
    window._targetMemberForQuickEdit = memberId;
    const member = window.familyDataManager.getMemberById(memberId);
    if (!member) {
        alert("Không tìm thấy thông tin thành viên cần chỉnh sửa!");
        return;
    }

    await window.FamilyAuth.init();
    const session = window.FamilyAuth.getCurrentSession();

    if (session) {
        // Đã có phiên đăng nhập -> Kiểm tra phân quyền cây phả hệ
        const check = window.FamilyAuth.canModifyMember(session, member);
        if (check.allowed) {
            window.closeAllModals();
            openQuickEditForm(member, session);
        } else {
            alert(`⛔ BẠN KHÔNG CÓ QUYỀN CHỈNH SỬA THÀNH VIÊN NÀY!\n\n` +
                  `• Phiên hiện tại của bạn: ${session.role_title} (${session.scope_branch})\n` +
                  `• Thành viên: "${member.ho_ten}" thuộc nhánh "${member.chi_nhanh}".\n\n` +
                  `📌 Lý do: ${check.reason}\n` +
                  `👉 Vui lòng liên hệ: ${check.managerContact} để cập nhật thông tin.`);
        }
    } else {
        // Chưa đăng nhập -> Mở popup xác thực mã PIN
        window.closeAllModals();
        const modalAuth = document.getElementById("modal-quick-auth");
        const pinInput = document.getElementById("input-quick-auth-pin");
        if (modalAuth) {
            modalAuth.style.display = "flex";
            if (pinInput) {
                pinInput.value = "";
                setTimeout(() => pinInput.focus(), 150);
            }
        }
    }
};

/**
 * Hiển thị form chỉnh sửa thành viên tại chỗ
 */
function openQuickEditForm(member, session) {
    const modalEdit = document.getElementById("modal-quick-edit");
    if (!modalEdit) return;

    // Ẩn panel Zalo cũ nếu có
    const zaloPanel = document.getElementById("quick-edit-zalo-panel");
    if (zaloPanel) zaloPanel.style.display = "none";

    // Cập nhật thông tin phiên người sửa
    const userRoleEl = document.getElementById("quick-edit-user-role");
    const branchTagEl = document.getElementById("quick-edit-branch-tag");
    if (userRoleEl) userRoleEl.innerText = `${session.holder} (${session.role_title})`;
    if (branchTagEl) branchTagEl.innerText = member.chi_nhanh || session.scope_branch;

    // Điền dữ liệu vào form
    document.getElementById("quick-edit-id").value = member.id || "";
    document.getElementById("quick-edit-parent-id").value = member.parent_id || "";
    document.getElementById("qe-ho-ten").value = member.ho_ten || "";
    document.getElementById("qe-gioi-tinh").value = member.gioi_tinh || "Nam";
    document.getElementById("qe-doi-thu").value = member.doi_thu || 1;
    document.getElementById("qe-chi-nhanh").value = member.chi_nhanh || "";
    document.getElementById("qe-ten-hieu").value = member.ten_hieu || "";
    document.getElementById("qe-ngay-sinh").value = member.ngay_sinh || "";
    document.getElementById("qe-ngay-mat-am").value = member.ngay_mat_am || "";
    document.getElementById("qe-vo-chong").value = member.vo_chong || "";
    document.getElementById("qe-mo-phan").value = member.mo_phan || "";
    document.getElementById("qe-danh-hieu").value = member.danh_hieu || "";
    document.getElementById("qe-tieu-su").value = member.tieu_su || "";
    document.getElementById("qe-cong-duc").value = member.cong_duc || "";

    const isAlive = member.con_song !== false;
    const radioAlive = document.getElementById("qe-status-alive");
    const radioDeceased = document.getElementById("qe-status-deceased");
    const wrapMat = document.getElementById("wrap-qe-ngay-mat");

    if (radioAlive && radioDeceased) {
        radioAlive.checked = isAlive;
        radioDeceased.checked = !isAlive;
    }
    if (wrapMat) {
        wrapMat.style.display = isAlive ? "none" : "block";
    }

    modalEdit.style.display = "flex";
}

/**
 * Khởi tạo toàn bộ sự kiện cho hệ thống Quick Edit
 */
function initQuickEditSystem() {
    // 1. Xử lý form đăng nhập PIN nhanh
    const formAuth = document.getElementById("form-quick-auth");
    if (formAuth) {
        formAuth.addEventListener("submit", async (e) => {
            e.preventDefault();
            const pin = document.getElementById("input-quick-auth-pin").value.trim();
            const res = await window.FamilyAuth.loginWithPin(pin);

            if (res.success) {
                window.closeAllModals();
                window.showIndexToast(`Chào mừng ${res.account.role_title}!`, true);

                // Nếu có thành viên đang chờ sửa, kiểm tra quyền và mở form
                if (window._targetMemberForQuickEdit) {
                    const member = window.familyDataManager.getMemberById(window._targetMemberForQuickEdit);
                    if (member) {
                        const check = window.FamilyAuth.canModifyMember(res.account, member);
                        if (check.allowed) {
                            openQuickEditForm(member, res.account);
                        } else {
                            alert(`⛔ BẠN KHÔNG CÓ QUYỀN TRÊN THÀNH VIÊN NÀY!\n\n` +
                                  `• Tài khoản của bạn: ${res.account.role_title}\n` +
                                  `• Thành viên: "${member.ho_ten}" (${member.chi_nhanh})\n\n` +
                                  `Lý do: ${check.reason}\n` +
                                  `Vui lòng liên hệ: ${check.managerContact}`);
                        }
                    }
                }
            } else {
                alert(res.message);
            }
        });
    }

    // 2. Chuyển đổi trạng thái sinh tử trên form quick edit
    const radioAlive = document.getElementById("qe-status-alive");
    const radioDeceased = document.getElementById("qe-status-deceased");
    const wrapMat = document.getElementById("wrap-qe-ngay-mat");

    if (radioAlive && radioDeceased && wrapMat) {
        radioAlive.addEventListener("change", () => {
            if (radioAlive.checked) wrapMat.style.display = "none";
        });
        radioDeceased.addEventListener("change", () => {
            if (radioDeceased.checked) wrapMat.style.display = "block";
        });
    }

    // 3. Xử lý submit form Sửa Nhanh Tại Chỗ
    const formEdit = document.getElementById("form-quick-edit");
    if (formEdit) {
        formEdit.addEventListener("submit", async (e) => {
            e.preventDefault();

            const session = window.FamilyAuth.getCurrentSession();
            if (!session) {
                alert("Phiên làm việc đã hết hạn. Vui lòng xác thực lại!");
                return;
            }

            const id = document.getElementById("quick-edit-id").value;
            const parentId = document.getElementById("quick-edit-parent-id").value;
            const hoTen = document.getElementById("qe-ho-ten").value.trim();
            const gioiTinh = document.getElementById("qe-gioi-tinh").value;
            const doiThu = parseInt(document.getElementById("qe-doi-thu").value) || 1;
            const chiNhanh = document.getElementById("qe-chi-nhanh").value.trim();
            const tenHieu = document.getElementById("qe-ten-hieu").value.trim();
            const ngaySinh = document.getElementById("qe-ngay-sinh").value.trim();
            const isAlive = document.getElementById("qe-status-alive").checked;
            const ngayMatAm = isAlive ? "" : document.getElementById("qe-ngay-mat-am").value.trim();
            const voChong = document.getElementById("qe-vo-chong").value.trim();
            const moPhan = document.getElementById("qe-mo-phan").value.trim();
            const danhHieu = document.getElementById("qe-danh-hieu").value.trim();
            const tieuSu = document.getElementById("qe-tieu-su").value.trim();
            const congDuc = document.getElementById("qe-cong-duc").value.trim();

            const existing = window.familyDataManager.getMemberById(id) || {};
            const isNew = !existing.id;

            const updatedMember = {
                ...existing,
                id: id,
                parent_id: parentId || null,
                ho_ten: hoTen,
                gioi_tinh: gioiTinh,
                doi_thu: doiThu,
                chi_nhanh: chiNhanh,
                ten_hieu: tenHieu,
                ngay_sinh: ngaySinh,
                con_song: isAlive,
                ngay_mat_am: ngayMatAm,
                ngay_mat_duong: existing.ngay_mat_duong || "",
                vo_chong: voChong,
                mo_phan: moPhan,
                danh_hieu: danhHieu,
                tieu_su: tieuSu,
                cong_duc: congDuc,
                updated_at: new Date().toISOString()
            };

            // Lưu vào IndexedDB
            await window.familyDataManager.putMember(updatedMember);

            // Ghi nhật ký kiểm toán
            await window.FamilyAuth.logAudit(
                isNew ? "CREATE_MEMBER" : "UPDATE_MEMBER",
                `${isNew ? 'Thêm mới' : 'Cập nhật'} thành viên [${hoTen}] (Đời ${doiThu} • ${chiNhanh})`,
                hoTen
            );

            // Re-render tab hiện tại
            const activeTab = localStorage.getItem("last_active_tab") || "tree";
            window.switchTab(activeTab);

            // Hiển thị thông báo và mở panel xuất Zalo
            window.showIndexToast(`Đã lưu thành công thông tin của vị ${hoTen}!`, true);
            const zaloPanel = document.getElementById("quick-edit-zalo-panel");
            if (zaloPanel) zaloPanel.style.display = "block";
        });
    }

    // 4. Xử lý nút "Thêm con cho vị này"
    const btnAddChild = document.getElementById("btn-qe-add-child");
    if (btnAddChild) {
        btnAddChild.addEventListener("click", () => {
            const currentId = document.getElementById("quick-edit-id").value;
            const currentName = document.getElementById("qe-ho-ten").value;
            const currentGen = parseInt(document.getElementById("qe-doi-thu").value) || 1;
            const currentBranch = document.getElementById("qe-chi-nhanh").value;

            if (!confirm(`Bạn có muốn thêm một người con mới cho vị: "${currentName}" (Đời ${currentGen})?`)) {
                return;
            }

            const childGen = currentGen + 1;
            const newChildId = `LN_${childGen}_Con_${Date.now().toString(36)}`;

            document.getElementById("quick-edit-id").value = newChildId;
            document.getElementById("quick-edit-parent-id").value = currentId;
            document.getElementById("qe-ho-ten").value = "";
            document.getElementById("qe-doi-thu").value = childGen;
            document.getElementById("qe-chi-nhanh").value = currentBranch;
            document.getElementById("qe-ten-hieu").value = "Hậu duệ";
            document.getElementById("qe-ngay-sinh").value = "";
            document.getElementById("qe-ngay-mat-am").value = "";
            document.getElementById("qe-vo-chong").value = "";
            document.getElementById("qe-mo-phan").value = "";
            document.getElementById("qe-danh-hieu").value = "";
            document.getElementById("qe-tieu-su").value = `Con của ${currentName}.`;
            document.getElementById("qe-cong-duc").value = "";
            document.getElementById("qe-status-alive").checked = true;
            document.getElementById("wrap-qe-ngay-mat").style.display = "none";

            document.getElementById("qe-ho-ten").focus();
            window.showIndexToast(`Đã chuyển sang chế độ thêm con cho cụ ${currentName}!`, true);
        });
    }

    // 5. Xử lý nút "Tải Gói Dữ Liệu Mới Gửi Zalo Cho Tổng Quản"
    const btnExportZalo = document.getElementById("btn-export-zalo-quick");
    if (btnExportZalo) {
        btnExportZalo.addEventListener("click", async () => {
            const session = window.FamilyAuth.getCurrentSession();
            if (!session) {
                alert("Vui lòng đăng nhập để xuất gói đồng bộ!");
                return;
            }
            try {
                await window.FamilyAuth.exportZaloPackage(session);
                alert("Đã tạo và tải file đồng bộ thành công!\n\n👉 Quý vị vui lòng mở Zalo và gửi file này cho Tổng Quản Trần Văn Thuần để tích hợp vào bản chính toàn quốc.");
            } catch (err) {
                alert("Lỗi xuất gói đồng bộ: " + err.message);
            }
        });
    }

    // 6. Xử lý Modal Quên Mã PIN & Tự Đặt Lại
    const linkForgot = document.getElementById("link-open-forgot-pin");
    const modalReset = document.getElementById("modal-quick-reset-pin");
    const selectAccReset = document.getElementById("reset-account-select");
    const displayQuestionEl = document.getElementById("reset-display-question");
    const tabQuestionBtn = document.getElementById("tab-btn-reset-question");
    const tabCodeBtn = document.getElementById("tab-btn-reset-code");
    const formResetQ = document.getElementById("form-reset-by-question");
    const formResetC = document.getElementById("form-reset-by-code");

    const updateResetQuestionDisplay = async () => {
        if (!selectAccReset || !displayQuestionEl) return;
        const accId = selectAccReset.value;
        const acc = await window.FamilyAuth.getAccountById(accId);
        if (acc && acc.security_question) {
            displayQuestionEl.innerText = acc.security_question;
        } else {
            displayQuestionEl.innerText = "Tài khoản này chưa cài đặt câu hỏi bảo mật cá nhân.";
        }
    };

    if (linkForgot) {
        linkForgot.addEventListener("click", () => {
            window.closeAllModals();
            const modalForgot = document.getElementById("modal-forgot-support");
            if (modalForgot) {
                modalForgot.style.display = "flex";
            } else if (modalReset) {
                modalReset.style.display = "flex";
                updateResetQuestionDisplay();
            }
        });
    }

    if (selectAccReset) {
        selectAccReset.addEventListener("change", updateResetQuestionDisplay);
    }

    if (tabQuestionBtn && tabCodeBtn && formResetQ && formResetC) {
        tabQuestionBtn.addEventListener("click", () => {
            tabQuestionBtn.className = "btn-royal-sm w-100";
            tabQuestionBtn.style.background = "#0284c7";
            tabCodeBtn.className = "btn-royal-sm-outline w-100";
            tabCodeBtn.style.background = "transparent";
            formResetQ.style.display = "block";
            formResetC.style.display = "none";
        });

        tabCodeBtn.addEventListener("click", () => {
            tabCodeBtn.className = "btn-royal-sm w-100";
            tabCodeBtn.style.background = "#0284c7";
            tabQuestionBtn.className = "btn-royal-sm-outline w-100";
            tabQuestionBtn.style.background = "transparent";
            formResetC.style.display = "block";
            formResetQ.style.display = "none";
        });
    }

    // Xử lý reset bằng câu hỏi
    if (formResetQ) {
        formResetQ.addEventListener("submit", async (e) => {
            e.preventDefault();
            const accId = selectAccReset.value;
            const answer = document.getElementById("reset-input-answer").value.trim();
            const newPin = document.getElementById("reset-input-new-pin-q").value.trim();

            if (!newPin || newPin.length < 6 || newPin.length > 16) {
                alert("Mật khẩu mới phải từ 6 đến 16 ký tự!");
                return;
            }

            const res = await window.FamilyAuth.resetPinWithSecurityQuestion(accId, answer, newPin);
            if (res.success) {
                alert(res.message);
                window.closeAllModals();
            } else {
                alert(res.message);
            }
        });
    }

    // Xử lý reset bằng mã khôi phục 6 ký tự
    if (formResetC) {
        formResetC.addEventListener("submit", async (e) => {
            e.preventDefault();
            const accId = selectAccReset.value;
            const code = document.getElementById("reset-input-code").value.trim();
            const newPin = document.getElementById("reset-input-new-pin-c").value.trim();

            if (!newPin || newPin.length < 6 || newPin.length > 16) {
                alert("Mật khẩu mới phải từ 6 đến 16 ký tự!");
                return;
            }

            const res = await window.FamilyAuth.resetPinWithRecoveryCode(accId, code, newPin);
            if (res.success) {
                alert(`${res.message}\n\n🛡️ Mã khôi phục dự phòng mới của bạn là: [${res.newRecoveryCode}]\nHãy ghi lại hoặc chụp ảnh cất giữ cẩn thận!`);
                window.closeAllModals();
            } else {
                alert(res.message);
            }
        });
    }
}

/**
 * ================= TIỆN ÍCH CHỈ ĐƯỜNG GPS & BỔ SUNG SỬ LIỆU =================
 */

// Hàm mở Google Maps tìm kiếm/chỉ đường tới địa danh mộ phần hoặc từ đường
window.openGpsMap = function(locationText, personName = "") {
    if (!locationText || locationText.includes("Còn sinh thời")) {
        alert("Thành viên hiện còn tại thế hoặc vị trí mộ phần chưa được ghi nhận.");
        return;
    }
    let query = locationText.trim();
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, "_blank", "noopener,noreferrer");
};

// Hàm mở Modal Góp Ý / Bổ Sung Sử Liệu Tiền Nhân
window.openContributeHistoryModal = function(memberId) {
    if (!window.familyDataManager) return;
    const m = window.familyDataManager.getMemberById(memberId);
    if (!m) return;

    // Nếu người dùng đã đăng nhập có quyền chi nhánh tương ứng -> mở modal sửa trực tiếp
    if (window.FamilyAuth && window.FamilyAuth.hasAccess(m.chi_nhanh)) {
        window.openQuickEditModal(memberId);
        return;
    }

    const modal = document.getElementById("modal-contribute-history");
    if (!modal) return;

    const inputId = document.getElementById("contrib-member-id");
    const infoEl = document.getElementById("contrib-member-info");
    const hintEl = document.getElementById("contrib-lack-hint");

    if (inputId) inputId.value = m.id;
    if (infoEl) infoEl.textContent = `${m.ho_ten} (Đời ${m.doi_thu} • ${m.chi_nhanh})`;

    const lackItems = [];
    if (!m.ngay_sinh || m.ngay_sinh === "Chưa rõ" || m.ngay_sinh === "—") lackItems.push("Năm sinh");
    if (!m.ngay_mat_am || m.ngay_mat_am === "Chưa rõ") lackItems.push("Ngày giỗ âm lịch");
    if (!m.mo_phan || m.mo_phan.toLowerCase().includes("chưa rõ") || m.mo_phan.toLowerCase().includes("thất lạc")) lackItems.push("Mộ phần / Nơi an nghỉ");

    if (hintEl) {
        hintEl.textContent = lackItems.length ? `[Hệ thống đang cần bổ sung: ${lackItems.join(", ")}]` : "";
    }

    // Reset các trường nhập
    const nameEl = document.getElementById("contrib-sender-name");
    const branchEl = document.getElementById("contrib-sender-branch");
    const phoneEl = document.getElementById("contrib-sender-phone");
    const contentEl = document.getElementById("contrib-content");

    if (nameEl) nameEl.value = "";
    if (branchEl) branchEl.value = "";
    if (phoneEl) phoneEl.value = "";
    if (contentEl) contentEl.value = "";

    modal.style.display = "flex";
};

// Khởi tạo sự kiện form góp ý sử liệu
function initContributeHistorySystem() {
    const form = document.getElementById("form-contribute-history");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const memberId = document.getElementById("contrib-member-id").value;
        const m = window.familyDataManager.getMemberById(memberId);
        const senderName = document.getElementById("contrib-sender-name").value.trim();
        const senderBranch = document.getElementById("contrib-sender-branch").value.trim();
        const senderPhone = document.getElementById("contrib-sender-phone").value.trim();
        const content = document.getElementById("contrib-content").value.trim();

        const contribution = {
            id: "contrib_" + Date.now(),
            member_id: memberId,
            member_name: m ? m.ho_ten : "Tiền nhân",
            member_gen: m ? m.doi_thu : "",
            sender_name: senderName,
            sender_branch: senderBranch,
            sender_phone: senderPhone,
            content: content,
            created_at: new Date().toLocaleString("vi-VN")
        };

        try {
            const list = JSON.parse(localStorage.getItem("family_contributions") || "[]");
            list.unshift(contribution);
            localStorage.setItem("family_contributions", JSON.stringify(list));
        } catch (err) {
            console.error("Lưu góp ý thất bại", err);
        }

        window.closeAllModals();
        window.showIndexToast(`Kính tạ tấm lòng hiếu kính của con cháu! Sử liệu đóng góp cho cụ ${m ? m.ho_ten : ''} đã được ghi nhận vào Sổ Bồi Đắp Phả Ký thành công.`);
    });
}
