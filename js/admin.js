/**
 * HỆ THỐNG QUẢN TRỊ & CẬP NHẬT PHẢ HỆ ĐA NHÁNH (ADMIN.JS)
 * Phân quyền bằng Mã PIN, Quản lý thành viên trực tiếp (Thêm/Sửa/Xóa lẻ từng người),
 * Tìm kiếm nhanh theo tên, Nhập/Xuất Excel bằng SheetJS,
 * Tự động tính thế hệ & ngày giỗ, Chạy 100% Ngoại tuyến với IndexedDB.
 */

// Bảng mã PIN mặc định theo phân quyền Đại Tộc & Các Chi
const DEFAULT_PINS = {
    "admin": { pin: "T051981", role: "Admin Đại Tộc Họ Trần Việt Nam", branch: "Tất cả", canEditAll: true },
    "langnam": { pin: "333333", role: "Trưởng Chi Họ Trần Lãng Nam", branch: "Chi Lãng Nam", canEditAll: false },
    "nhanh_long": { pin: "111111", role: "Trưởng Nhánh Cụ Long (Đời 21)", branch: "Chi Cụ Chí Hòa - Nhánh ông Long", canEditAll: false },
    "nhanh_thinh": { pin: "222222", role: "Trưởng Nhánh Cụ Thịnh (Đời 21)", branch: "Chi Cụ Chí Hòa - Nhánh ông Thịnh", canEditAll: false },
    "nhanh_vuong": { pin: "369369", role: "Trưởng Nhánh Cụ Vượng (Đời 21)", branch: "Chi Cụ Chí Hòa - Nhánh ông Vượng", canEditAll: false }
};

let currentAdminSession = null; // Lưu phiên làm việc hiện tại

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Nạp CSDL IndexedDB
    await window.familyDataManager.init();

    // 2. Tự động đồng bộ mật khẩu mới trong cấu hình IDB nếu có
    if (window.IDBStorage) {
        try {
            const pinConfigs = await window.IDBStorage.getSetting("admin_pins", null);
            if (pinConfigs) {
                let updated = false;
                if (pinConfigs["admin"] && pinConfigs["admin"].pin === "888888") {
                    pinConfigs["admin"].pin = "T051981";
                    updated = true;
                }
                if (pinConfigs["nhanh_vuong"] && pinConfigs["nhanh_vuong"].pin === "444444") {
                    pinConfigs["nhanh_vuong"].pin = "369369";
                    updated = true;
                }
                if (updated) {
                    await window.IDBStorage.setSetting("admin_pins", pinConfigs);
                }
            }
        } catch (e) {
            console.warn("Lỗi migration admin_pins:", e);
        }
    }

    // 3. Kiểm tra phiên đăng nhập đã lưu trong sessionStorage
    checkSavedSession();

    // 4. Đăng ký các sự kiện Admin
    initAdminEvents();
});

/**
 * Hàm bỏ dấu tiếng Việt để tìm kiếm không dấu (ví dụ: "thuan" tìm được "Trần Văn Thuần")
 */
function removeVietnameseTones(str) {
    if (!str) return "";
    str = String(str).toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    return str.trim();
}

/**
 * Kiểm tra thành viên có thuộc quyền quản lý của phiên đăng nhập hiện tại hay không
 */
/**
 * Kiểm tra thành viên có thuộc quyền quản lý của phiên đăng nhập hiện tại hay không
 */
function isMemberInSessionScope(m, session) {
    if (!session || !m) return false;
    if (session.role === "tong_quan" || session.canEditAll) return true;
    if (window.FamilyAuth) {
        return window.FamilyAuth.canModifyMember(session, m).allowed;
    }
    return true;
}

/**
 * Kiểm tra xem người dùng có quyền chỉnh sửa/xóa thành viên cụ thể này hay không
 */
function canUserEditMember(m, session) {
    if (!session || !m) return false;
    if (session.role === "tong_quan" || session.canEditAll) return true;
    if (window.FamilyAuth) {
        return window.FamilyAuth.canModifyMember(session, m).allowed;
    }
    return true;
}

/**
 * Kiểm tra phiên đăng nhập đã lưu
 */
function checkSavedSession() {
    const saved = sessionStorage.getItem("family_admin_session");
    if (saved) {
        try {
            currentAdminSession = JSON.parse(saved);
            showAdminDashboard();
        } catch (e) {
            sessionStorage.removeItem("family_admin_session");
        }
    }
}

/**
 * Xử lý đăng nhập bằng mã PIN (Web Crypto API SHA-256)
 */
async function handlePinLogin(pin) {
    await window.FamilyAuth.init();
    const res = await window.FamilyAuth.loginWithPin(pin);

    if (res.success) {
        currentAdminSession = {
            ...res.account,
            canEditAll: res.account.role === "tong_quan" || res.account.scope_branch === "Tất cả",
            branch: res.account.scope_branch,
            role: res.account.role_title
        };
        sessionStorage.setItem("family_admin_session", JSON.stringify(currentAdminSession));
        showAdminDashboard();

        if (window.showAdminToast) {
            window.showAdminToast(`Chào mừng ${res.account.holder} (${res.account.role_title})!`, true);
        }

        return true;
    } else {
        alert(res.message || "Mật khẩu không chính xác hoặc quyền đã bị thu hồi!");
        return false;
    }
}

/**
 * Hiển thị Bảng Điều Khiển Quản Trị
 */
function showAdminDashboard() {
    const loginSection = document.getElementById("admin-login-section");
    const dashboardSection = document.getElementById("admin-dashboard-section");

    if (loginSection) loginSection.style.display = "none";
    if (dashboardSection) dashboardSection.style.display = "block";

    // Cập nhật thông tin phiên trên Top Bar
    const badgeRole = document.getElementById("admin-role-badge");
    const badgeBranch = document.getElementById("admin-branch-badge");
    if (badgeRole) badgeRole.innerText = currentAdminSession.role;
    if (badgeBranch) badgeBranch.innerText = `Phạm vi: ${currentAdminSession.branch}`;

    // Hiển thị nút Cấp PIN mới nếu là Admin Đại Tộc
    const btnCreatePin = document.getElementById("btn-create-branch-pin");
    if (btnCreatePin) {
        btnCreatePin.style.display = currentAdminSession.canEditAll ? "inline-block" : "none";
    }

    // Hiển thị/Ẩn bộ lọc Chi nhánh: chỉ Admin Đại Tộc mới cần chọn chi
    const wrapFilterBranch = document.getElementById("wrap-filter-branch-admin");
    if (wrapFilterBranch) {
        wrapFilterBranch.style.display = currentAdminSession.canEditAll ? "flex" : "none";
    }

    // Cập nhật tiêu đề bảng quản lý thành viên
    const displayBranchName = document.getElementById("display-current-branch-name");
    if (displayBranchName) {
        if (currentAdminSession.canEditAll) {
            displayBranchName.innerText = "TOÀN BỘ ĐẠI TỘC HỌ TRẦN VIỆT NAM";
        } else {
            displayBranchName.innerText = currentAdminSession.branch.toUpperCase();
        }
    }

    // Đổ danh sách các Đời vào dropdown lọc thế hệ
    populateGenerationFilter();

    // Nạp danh sách thành viên vào bảng
    renderAdminMembersTable();
}

/**
 * Đăng xuất
 */
function handleLogout() {
    currentAdminSession = null;
    sessionStorage.removeItem("family_admin_session");
    const loginSection = document.getElementById("admin-login-section");
    const dashboardSection = document.getElementById("admin-dashboard-section");

    if (loginSection) loginSection.style.display = "block";
    if (dashboardSection) dashboardSection.style.display = "none";
    const inputPin = document.getElementById("input-admin-pin");
    if (inputPin) {
        inputPin.value = "";
        inputPin.focus();
    }
}

/**
 * Nạp danh sách các Đời vào bộ lọc thế hệ
 */
function populateGenerationFilter() {
    const selectGen = document.getElementById("filter-generation-admin");
    if (!selectGen) return;

    const dm = window.familyDataManager;
    const allMembers = dm.getAllMembers();
    const gens = new Set();
    allMembers.forEach(m => {
        if (m.doi_thu) gens.add(m.doi_thu);
    });

    const sortedGens = Array.from(gens).sort((a, b) => a - b);
    let optionsHtml = `<option value="all">Tất cả các Đời (${sortedGens.length} thế hệ)</option>`;
    sortedGens.forEach(g => {
        optionsHtml += `<option value="${g}">Đời thứ ${g}</option>`;
    });
    selectGen.innerHTML = optionsHtml;
}

/**
 * Hiển thị bảng danh sách thành viên theo đúng Chi/Nhánh đang đăng nhập
 */
function renderAdminMembersTable() {
    const tbody = document.getElementById("admin-members-tbody");
    if (!tbody || !currentAdminSession) return;

    const dm = window.familyDataManager;
    const allMembers = dm.getAllMembers();

    // 1. Lọc theo phân quyền của phiên đăng nhập
    let branchList = [];
    if (currentAdminSession.canEditAll) {
        const filterBranch = document.getElementById("filter-branch-admin") ? document.getElementById("filter-branch-admin").value : "Tất cả";
        if (filterBranch === "Tất cả") {
            branchList = [...allMembers];
        } else {
            branchList = allMembers.filter(m => dm.isMemberInBranch(m, filterBranch));
        }
    } else {
        branchList = allMembers.filter(m => isMemberInSessionScope(m, currentAdminSession));
    }

    // Cập nhật số lượng tổng của chi
    const countTotalEl = document.getElementById("count-total-branch-members");
    if (countTotalEl) {
        countTotalEl.innerText = branchList.length;
    }

    // 2. Lọc theo Tình trạng sinh tử
    const filterStatus = document.getElementById("filter-status-admin") ? document.getElementById("filter-status-admin").value : "all";
    let filteredList = branchList;
    if (filterStatus === "alive") {
        filteredList = filteredList.filter(m => m.con_song);
    } else if (filterStatus === "deceased") {
        filteredList = filteredList.filter(m => !m.con_song);
    }

    // 3. Lọc theo Thế hệ (Đời)
    const filterGen = document.getElementById("filter-generation-admin") ? document.getElementById("filter-generation-admin").value : "all";
    if (filterGen !== "all") {
        const genNum = parseInt(filterGen, 10);
        filteredList = filteredList.filter(m => m.doi_thu === genNum);
    }

    // 4. Tìm kiếm nhanh theo Tên, Tự hiệu, Mã ID, Phối ngẫu
    const searchInput = document.getElementById("search-admin-input");
    const rawQuery = searchInput ? (searchInput.value || "").trim() : "";
    const clearBtn = document.getElementById("btn-clear-search");
    if (clearBtn) {
        clearBtn.style.display = rawQuery ? "block" : "none";
    }

    if (rawQuery) {
        const qClean = removeVietnameseTones(rawQuery);
        filteredList = filteredList.filter(m => {
            const nameClean = removeVietnameseTones(m.ho_ten || "");
            const titleClean = removeVietnameseTones(m.ten_hieu || "");
            const honorClean = removeVietnameseTones(m.danh_hieu || "");
            const spouseClean = removeVietnameseTones(m.vo_chong || "");
            const idClean = (m.id || "").toLowerCase();

            return nameClean.includes(qClean) ||
                   titleClean.includes(qClean) ||
                   honorClean.includes(qClean) ||
                   spouseClean.includes(qClean) ||
                   idClean.includes(qClean.toLowerCase());
        });
    }

    // Cập nhật số lượng đang hiển thị
    const countFilteredEl = document.getElementById("count-filtered-members");
    if (countFilteredEl) {
        countFilteredEl.innerText = filteredList.length;
    }

    // Sắp xếp theo thế hệ (Đời thứ) tăng dần, rồi theo ID
    filteredList.sort((a, b) => {
        if ((a.doi_thu || 1) !== (b.doi_thu || 1)) {
            return (a.doi_thu || 1) - (b.doi_thu || 1);
        }
        return (a.id || "").localeCompare(b.id || "");
    });

    // 5. Kết xuất HTML của Bảng
    if (filteredList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
                    <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
                    <strong style="font-size: 16px; color: var(--gold-dark);">Không tìm thấy thành viên nào phù hợp</strong>
                    <p style="margin-top: 6px; font-size: 13.5px;">Thử xóa bớt từ khóa tìm kiếm hoặc kiểm tra lại các bộ lọc bên trên.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filteredList.map(m => {
        const canEdit = canUserEditMember(m, currentAdminSession);
        
        // Thân sinh
        let parentText = `<span class="text-muted"><em>(Khởi tổ)</em></span>`;
        if (m.parent_id) {
            const parent = dm.getMemberById(m.parent_id);
            if (parent) {
                parentText = `<strong>${parent.ho_ten}</strong> <small class="text-muted">(Đời ${parent.doi_thu})</small>`;
            } else {
                parentText = `<code>${m.parent_id}</code>`;
            }
        }

        // Tình trạng sinh tử
        let statusHtml = "";
        if (m.con_song) {
            statusHtml = `<span class="badge-alive">🟢 Còn sống</span>`;
            if (m.ngay_sinh) {
                statusHtml += `<br><small class="text-muted">Sinh: ${m.ngay_sinh}</small>`;
            }
        } else {
            statusHtml = `<span class="badge-deceased">🕊️ Đã khuất</span>`;
            if (m.ngay_mat_am) {
                statusHtml += `<br><small style="color: #b91c1c; font-weight: 500;">Giỗ: ${m.ngay_mat_am} ÂL</small>`;
            }
        }

        // Tên kèm danh hiệu / tự hiệu
        let nameDetailHtml = `<strong style="font-size: 15px; color: var(--primary-red);">${m.ho_ten}</strong>`;
        if (m.ten_hieu) {
            nameDetailHtml += `<br><small style="color: #78350f; font-style: italic;">${m.ten_hieu}</small>`;
        }
        if (m.danh_hieu) {
            nameDetailHtml += `<br><span style="display: inline-block; margin-top: 3px; font-size: 11.5px; background: #fef08a; border: 1px solid #fde047; padding: 1px 6px; border-radius: 3px; color: #854d0e;">🎖️ ${m.danh_hieu}</span>`;
        }

        return `
            <tr>
                <td style="text-align: center;">
                    <span class="badge-gen">Đời ${m.doi_thu || 1}</span>
                </td>
                <td>
                    ${nameDetailHtml}
                    <div style="font-size: 11px; color: #888; margin-top: 2px;">Mã: <code>${m.id}</code></div>
                </td>
                <td style="text-align: center;">
                    ${m.gioi_tinh === "Nữ" ? "Nữ 👩" : "Nam 👨"}
                </td>
                <td>
                    ${statusHtml}
                </td>
                <td>
                    ${parentText}
                </td>
                <td>
                    ${m.vo_chong ? `<span style="font-size: 13.5px;">${m.vo_chong}</span>` : '<span class="text-muted">—</span>'}
                </td>
                <td>
                    <span class="badge-branch-cell">${m.chi_nhanh || "Đại Tộc"}</span>
                </td>
                <td style="text-align: center; white-space: nowrap;">
                    ${canEdit ? `
                        <button class="btn-row-edit" onclick="window.openMemberModal('${m.id}')" title="Sửa thông tin">
                            ✏️ Sửa
                        </button>
                        <button class="btn-row-delete" onclick="window.handleDeleteMember('${m.id}')" title="Xóa thành viên">
                            🗑️ Xóa
                        </button>
                    ` : `
                        <span class="text-muted" style="font-size: 12px;" title="Chỉ Trưởng Chi phụ trách mới được quyền chỉnh sửa">🔒 Không có quyền</span>
                    `}
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * Mở Modal Form Thêm / Sửa Thành Viên Trực Quan
 * @param {string|null} memberId - Mã ID thành viên nếu là sửa, hoặc null nếu là thêm mới
 */
function openMemberModal(memberId = null) {
    const modal = document.getElementById("modal-member-crud");
    const title = document.getElementById("modal-crud-title");
    const parentSelect = document.getElementById("crud-parent-id");
    const form = document.getElementById("form-member-crud");

    if (!modal || !form) return;

    const dm = window.familyDataManager;
    const allMembers = dm.getAllMembers();

    // 1. Nạp danh sách Thân sinh (Cha/Mẹ) thuộc phạm vi quản lý để dễ chọn
    let potentialParents = [];
    if (currentAdminSession.canEditAll) {
        potentialParents = [...allMembers];
    } else {
        potentialParents = allMembers.filter(m => isMemberInSessionScope(m, currentAdminSession));
    }

    // Sắp xếp danh sách thân sinh theo thế hệ
    potentialParents.sort((a, b) => (a.doi_thu || 1) - (b.doi_thu || 1));

    let parentOptionsHtml = `<option value="">(Không có — Là Bậc Khởi Tổ dòng họ)</option>`;
    potentialParents.forEach(p => {
        parentOptionsHtml += `<option value="${p.id}">Đời ${p.doi_thu} — ${p.ho_ten} [${p.chi_nhanh}]</option>`;
    });
    parentSelect.innerHTML = parentOptionsHtml;

    // Sự kiện khi chọn Cha/Mẹ -> Tự động tính thế hệ con = Đời cha + 1
    parentSelect.onchange = function() {
        const selectedParentId = this.value;
        if (selectedParentId) {
            const p = dm.getMemberById(selectedParentId);
            if (p) {
                document.getElementById("crud-doi-thu").value = (p.doi_thu || 1) + 1;
                // Nếu đang thêm mới và chưa nhập chi nhánh thì lấy luôn chi nhánh của cha
                if (!memberId) {
                    const branchInput = document.getElementById("crud-chi-nhanh");
                    if (p.chi_nhanh && branchInput && !branchInput.readOnly) {
                        branchInput.value = p.chi_nhanh;
                    }
                }
            }
        }
    };

    // Thiết lập hành vi cho Radio Tình Trạng Sinh Tử
    const radioAlive = document.getElementById("crud-status-alive");
    const radioDeceased = document.getElementById("crud-status-deceased");
    const wrapNgayMat = document.getElementById("wrap-crud-ngay-mat");

    function updateDeathFieldVisibility() {
        if (radioDeceased.checked) {
            wrapNgayMat.style.opacity = "1";
            wrapNgayMat.style.pointerEvents = "auto";
        } else {
            wrapNgayMat.style.opacity = "0.6";
        }
    }
    radioAlive.onchange = updateDeathFieldVisibility;
    radioDeceased.onchange = updateDeathFieldVisibility;

    // Nút tạo mã ID tự động
    const btnAutoId = document.getElementById("btn-auto-gen-id");
    if (btnAutoId) {
        btnAutoId.onclick = function() {
            autoGenerateId();
        };
    }

    // Thiết lập trường Chi Nhánh theo quyền hạn
    const branchInput = document.getElementById("crud-chi-nhanh");
    if (branchInput) {
        if (!currentAdminSession.canEditAll) {
            branchInput.value = currentAdminSession.branch;
            branchInput.readOnly = true;
        } else {
            branchInput.readOnly = false;
        }
    }

    // 2. Chế độ SỬA THÀNH VIÊN
    if (memberId) {
        const m = dm.getMemberById(memberId);
        if (!m) return;

        title.innerHTML = `✏️ Chỉnh Sửa Thông Tin: <span class="text-gold">${m.ho_ten}</span> (Đời ${m.doi_thu})`;
        
        document.getElementById("crud-id").value = m.id;
        document.getElementById("crud-id").readOnly = true; // Khóa ID khi sửa để không làm đứt liên kết
        document.getElementById("crud-ho-ten").value = m.ho_ten || "";
        document.getElementById("crud-ten-hieu").value = m.ten_hieu || "";
        document.getElementById("crud-gioi-tinh").value = m.gioi_tinh || "Nam";
        document.getElementById("crud-ngay-sinh").value = m.ngay_sinh || "";
        
        if (m.con_song) {
            radioAlive.checked = true;
        } else {
            radioDeceased.checked = true;
        }
        updateDeathFieldVisibility();

        document.getElementById("crud-ngay-mat-am").value = m.ngay_mat_am || "";
        document.getElementById("crud-parent-id").value = m.parent_id || "";
        document.getElementById("crud-doi-thu").value = m.doi_thu || 1;
        document.getElementById("crud-chi-nhanh").value = m.chi_nhanh || currentAdminSession.branch;
        document.getElementById("crud-vo-chong").value = m.vo_chong || "";
        document.getElementById("crud-mo-phan").value = m.mo_phan || "";
        document.getElementById("crud-danh-hieu").value = m.danh_hieu || "";
        document.getElementById("crud-tieu-su").value = m.tieu_su || "";
        document.getElementById("crud-cong-duc").value = m.cong_duc || "";

    } else {
        // 3. Chế độ THÊM 1 THÀNH VIÊN MỚI
        title.innerHTML = `➕ Thêm 1 Người Mới Vào <span class="text-gold">${currentAdminSession.branch}</span>`;
        form.reset();

        document.getElementById("crud-id").readOnly = false;
        radioAlive.checked = true;
        updateDeathFieldVisibility();

        // Gợi ý đời thứ: mặc định lấy đời cao nhất trong chi
        let defaultGen = 24;
        if (potentialParents.length > 0) {
            const maxGen = Math.max(...potentialParents.map(p => p.doi_thu || 1));
            defaultGen = Math.min(maxGen + 1, 30);
        }
        document.getElementById("crud-doi-thu").value = defaultGen;

        if (branchInput) {
            branchInput.value = currentAdminSession.branch === "Tất cả" ? "Chi Họ Trần Lãng Nam" : currentAdminSession.branch;
        }

        autoGenerateId();
    }

    modal.style.display = "flex";
    document.getElementById("crud-ho-ten").focus();
}

/**
 * Tự động tạo mã ID định danh chuẩn khoa học
 */
function autoGenerateId() {
    const doiThu = document.getElementById("crud-doi-thu").value || 24;
    const hoTen = document.getElementById("crud-ho-ten").value || "";
    const branch = document.getElementById("crud-chi-nhanh").value || "";

    let prefix = "TV";
    if (branch.includes("Lãng Nam") || branch.includes("Chí Hòa") || branch.includes("ông Vượng") || branch.includes("ông Long") || branch.includes("ông Thịnh")) {
        prefix = "LN";
    } else if (branch.includes("Chi 1")) {
        prefix = "C1";
    } else if (branch.includes("Chi 2")) {
        prefix = "C2";
    }

    let namePart = "";
    if (hoTen.trim()) {
        const words = hoTen.trim().split(/\s+/);
        const lastName = words[words.length - 1];
        namePart = removeVietnameseTones(lastName).replace(/[^a-z0-9]/gi, "");
        namePart = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }

    if (!namePart) {
        namePart = String(Math.floor(Math.random() * 900 + 100));
    }

    document.getElementById("crud-id").value = `${prefix}_${doiThu}_${namePart}`;
}

/**
 * Xử lý Lưu Thành Viên (Thêm mới hoặc Cập nhật)
 */
async function handleSaveMember(e) {
    e.preventDefault();

    const id = document.getElementById("crud-id").value.trim();
    const ho_ten = document.getElementById("crud-ho-ten").value.trim();
    const doi_thu = parseInt(document.getElementById("crud-doi-thu").value, 10);
    const parent_id = document.getElementById("crud-parent-id").value.trim() || null;
    const chi_nhanh = document.getElementById("crud-chi-nhanh").value.trim();
    const gioi_tinh = document.getElementById("crud-gioi-tinh").value;
    const ten_hieu = document.getElementById("crud-ten-hieu").value.trim();
    const ngay_sinh = document.getElementById("crud-ngay-sinh").value.trim();
    const con_song = document.getElementById("crud-status-alive").checked;
    const ngay_mat_am = con_song ? "" : document.getElementById("crud-ngay-mat-am").value.trim();
    const vo_chong = document.getElementById("crud-vo-chong").value.trim();
    const mo_phan = document.getElementById("crud-mo-phan").value.trim();
    const danh_hieu = document.getElementById("crud-danh-hieu").value.trim();
    const tieu_su = document.getElementById("crud-tieu-su").value.trim();
    const cong_duc = document.getElementById("crud-cong-duc").value.trim();

    if (!id || !ho_ten) {
        alert("Vui lòng nhập đầy đủ Mã ID và Họ tên của thành viên.");
        return;
    }

    // Kiểm tra không được chọn chính mình làm cha
    if (parent_id && parent_id === id) {
        alert("Một người không thể tự làm Cha/Mẹ của chính mình!");
        return;
    }

    const member = {
        id,
        parent_id,
        doi_thu,
        chi_nhanh,
        ho_ten,
        ten_hieu,
        gioi_tinh,
        ngay_sinh,
        con_song,
        ngay_mat_am,
        vo_chong,
        mo_phan,
        danh_hieu,
        tieu_su,
        cong_duc,
        so_vang: !!(danh_hieu || cong_duc)
    };

    try {
        // Lưu trực tiếp vào IndexedDB
        await window.IDBStorage.putMember(member);

        // Khởi tạo lại Data Manager để cập nhật bộ nhớ
        await window.familyDataManager.init();

        // Đóng Modal & Làm mới bảng ngay lập tức
        if (window.closeAllModals) window.closeAllModals();
        populateGenerationFilter();
        renderAdminMembersTable();

        if (window.showAdminToast) {
            window.showAdminToast(`Đã lưu thành công thông tin của "${ho_ten}" vào gia phả!`, true);
        } else {
            alert(`Đã lưu thông tin của "${ho_ten}" vào gia phả thành công!`);
        }
    } catch (err) {
        console.error("Lỗi khi lưu thành viên:", err);
        alert("Lỗi khi lưu dữ liệu: " + err.message);
    }
}

/**
 * Xử lý Xóa thành viên
 */
async function handleDeleteMember(memberId) {
    const dm = window.familyDataManager;
    const m = dm.getMemberById(memberId);
    if (!m) return;

    // Kiểm tra quyền
    if (!canUserEditMember(m, currentAdminSession)) {
        alert("Bạn không có quyền xóa thành viên của chi khác!");
        return;
    }

    // Kiểm tra nếu thành viên này đang có con trong gia phả
    const allMembers = dm.getAllMembers();
    const children = allMembers.filter(child => child.parent_id === memberId);
    let warningChildren = "";
    if (children.length > 0) {
        warningChildren = `\n\n⚠️ CẢNH BÁO: Thành viên này hiện có ${children.length} người con trong hệ thống (${children.map(c => c.ho_ten).slice(0, 3).join(", ")}...). Nếu xóa, các con sẽ bị mất liên kết với cha/mẹ!`;
    }

    const confirmMsg = `Bạn có chắc chắn muốn xóa thành viên "${m.ho_ten}" (Mã: ${m.id}, Đời ${m.doi_thu}) khỏi gia phả không?${warningChildren}\n\nThao tác này sẽ lưu trực tiếp vào cơ sở dữ liệu trên thiết bị.`;
    if (!confirm(confirmMsg)) return;

    try {
        await window.IDBStorage.deleteMember(memberId);
        await window.familyDataManager.init();
        populateGenerationFilter();
        renderAdminMembersTable();

        if (window.showAdminToast) {
            window.showAdminToast(`Đã xóa thành viên "${m.ho_ten}" khỏi gia phả!`, false);
        } else {
            alert(`Đã xóa thành viên "${m.ho_ten}" thành công!`);
        }
    } catch (err) {
        console.error("Lỗi khi xóa thành viên:", err);
        alert("Lỗi khi xóa: " + err.message);
    }
}

/**
 * Đăng ký tất cả các sự kiện giao diện
 */
function initAdminEvents() {
    // 1. Form đăng nhập
    const formLogin = document.getElementById("form-admin-login");
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            const pin = document.getElementById("input-admin-pin").value.trim();
            handlePinLogin(pin);
        });
    }

    // 2. Đăng xuất
    const btnLogout = document.getElementById("btn-admin-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", handleLogout);
    }

    // 3. Nút Thêm 1 người mới to nổi bật
    const btnQuickAdd = document.getElementById("btn-quick-add-member");
    if (btnQuickAdd) {
        btnQuickAdd.addEventListener("click", () => openMemberModal(null));
    }

    // 4. Ô tìm kiếm nhanh
    const searchAdmin = document.getElementById("search-admin-input");
    if (searchAdmin) {
        searchAdmin.addEventListener("input", () => renderAdminMembersTable());
    }

    // 5. Nút xóa ô tìm kiếm nhanh
    const btnClearSearch = document.getElementById("btn-clear-search");
    if (btnClearSearch) {
        btnClearSearch.addEventListener("click", () => {
            if (searchAdmin) searchAdmin.value = "";
            renderAdminMembersTable();
            if (searchAdmin) searchAdmin.focus();
        });
    }

    // 6. Bộ lọc chi nhánh (dành cho Admin Đại Tộc)
    const filterBranch = document.getElementById("filter-branch-admin");
    if (filterBranch) {
        filterBranch.addEventListener("change", () => renderAdminMembersTable());
    }

    // 7. Bộ lọc tình trạng sinh tử
    const filterStatus = document.getElementById("filter-status-admin");
    if (filterStatus) {
        filterStatus.addEventListener("change", () => renderAdminMembersTable());
    }

    // 8. Bộ lọc thế hệ
    const filterGen = document.getElementById("filter-generation-admin");
    if (filterGen) {
        filterGen.addEventListener("change", () => renderAdminMembersTable());
    }

    // 9. Nút Tải file Excel mẫu chuẩn
    const btnDownloadTemplate = document.getElementById("btn-download-excel-template");
    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener("click", generateAndDownloadExcelTemplate);
    }

    // 10. Nút Nhập file Excel
    const fileExcelInput = document.getElementById("input-upload-excel");
    if (fileExcelInput) {
        fileExcelInput.addEventListener("change", handleExcelUpload);
    }

    // 11. Nút Xuất toàn bộ Excel
    const btnExportExcel = document.getElementById("btn-export-excel-full");
    if (btnExportExcel) {
        btnExportExcel.addEventListener("click", exportFullFamilyExcel);
    }

    // 12. Nút Xuất file data_chi_X.js
    const btnExportJS = document.getElementById("btn-export-branch-js");
    if (btnExportJS) {
        btnExportJS.addEventListener("click", exportCurrentBranchJSFile);
    }

    // 13. Form Lưu thành viên Modal
    const formMember = document.getElementById("form-member-crud");
    if (formMember) {
        formMember.addEventListener("submit", handleSaveMember);
    }

    // 14. Tạo thêm mã PIN cho Chi tỉnh khác
    const btnCreatePin = document.getElementById("btn-create-branch-pin");
    if (btnCreatePin) {
        btnCreatePin.addEventListener("click", handleCreateBranchPin);
    }

    // 15. Đổi mật khẩu cá nhân
    const btnChangePin = document.getElementById("btn-change-pin");
    if (btnChangePin) {
        btnChangePin.addEventListener("click", handleChangePin);
    }

    const formChangeMyPwd = document.getElementById("form-change-my-password");
    if (formChangeMyPwd) {
        formChangeMyPwd.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentAdminSession) return;

            const curPwd = document.getElementById("input-cur-pwd").value.trim();
            const newPwd = document.getElementById("input-new-pwd").value.trim();
            const confirmPwd = document.getElementById("input-confirm-new-pwd").value.trim();

            if (newPwd !== confirmPwd) {
                alert("Mật khẩu xác nhận không trùng khớp! Vui lòng nhập lại.");
                return;
            }

            if (newPwd.length < 6 || newPwd.length > 16) {
                alert("Mật khẩu mới phải từ 6 đến 16 ký tự!");
                return;
            }

            const res = await window.FamilyAuth.changePasswordSimple(currentAdminSession.id, curPwd, newPwd);
            if (res.success) {
                alert(res.message);
                const modal = document.getElementById("modal-change-my-password");
                if (modal) modal.style.display = "none";
                if (window.showAdminToast) {
                    window.showAdminToast("Đã đổi mật khẩu cá nhân thành công!", true);
                }
            } else {
                alert(res.message);
            }
        });
    }

    // 16. Đồng bộ Google Sheet
    const btnSyncSheet = document.getElementById("btn-sync-gsheet");
    if (btnSyncSheet) {
        btnSyncSheet.addEventListener("click", handleSyncGoogleSheet);
    }
}

/**
 * 1. TẠO & TẢI FILE EXCEL MẪU CHUẨN (SheetJS)
 */
function generateAndDownloadExcelTemplate() {
    if (!window.XLSX) {
        alert("Thư viện SheetJS chưa sẵn sàng.");
        return;
    }

    const branchName = currentAdminSession.canEditAll ? "Chi Họ Trần Lãng Nam" : currentAdminSession.branch;
    const templateData = [
        {
            ID: "LN_24_Vidu1",
            Parent_ID: "LN_23_Thuan",
            Doi_Thu: 24,
            Chi_Nhanh: branchName,
            Ho_Ten: "Trần Văn An",
            Ten_Hieu: "Trưởng nam",
            Gioi_Tinh: "Nam",
            Ngay_Sinh: "15/06/2012",
            Con_Song: "TRUE",
            Ngay_Mat_Am: "",
            Vo_Chong: "",
            Mo_Phan: "Thôn Đồng Thái, Xã Ninh Cường, Ninh Bình",
            Danh_Hieu: "Học sinh giỏi",
            Tieu_Su: "Chăm ngoan học giỏi, hiếu thảo với ông bà cha mẹ.",
            Cong_Duc: "Đạt giải nhì học sinh giỏi cấp tỉnh."
        },
        {
            ID: "LN_24_Vidu2",
            Parent_ID: "LN_23_Thuan",
            Doi_Thu: 24,
            Chi_Nhanh: branchName,
            Ho_Ten: "Trần Thị Mai",
            Ten_Hieu: "Thứ nữ",
            Gioi_Tinh: "Nữ",
            Ngay_Sinh: "20/10/2015",
            Con_Song: "TRUE",
            Ngay_Mat_Am: "",
            Vo_Chong: "",
            Mo_Phan: "Thôn Đồng Thái, Xã Ninh Cường, Ninh Bình",
            Danh_Hieu: "",
            Tieu_Su: "Hiếu thuận, chăm chỉ.",
            Cong_Duc: ""
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
        { wch: 14 }, // ID
        { wch: 14 }, // Parent_ID
        { wch: 8 },  // Doi_Thu
        { wch: 28 }, // Chi_Nhanh
        { wch: 22 }, // Ho_Ten
        { wch: 18 }, // Ten_Hieu
        { wch: 10 }, // Gioi_Tinh
        { wch: 14 }, // Ngay_Sinh
        { wch: 10 }, // Con_Song
        { wch: 14 }, // Ngay_Mat_Am
        { wch: 22 }, // Vo_Chong
        { wch: 30 }, // Mo_Phan
        { wch: 20 }, // Danh_Hieu
        { wch: 35 }, // Tieu_Su
        { wch: 35 }  // Cong_Duc
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GIA_PHA_CHUAN");
    XLSX.writeFile(workbook, `Bang_Mau_Nhap_Gia_Pha_${branchName.replace(/\s+/g, "_")}.xlsx`);
}

/**
 * 2. NHẬP FILE EXCEL & HỢP NHẤT DỮ LIỆU
 */
async function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.XLSX) {
        alert("Chưa nạp được thư viện đọc Excel.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet);

            if (!rawRows || rawRows.length === 0) {
                alert("File Excel trống hoặc không đúng cấu trúc!");
                return;
            }

            let parsedMembers = rawRows.map(row => ({
                id: String(row.ID || row.id || "").trim(),
                parent_id: row.Parent_ID || row.parent_id ? String(row.Parent_ID || row.parent_id).trim() : null,
                doi_thu: parseInt(row.Doi_Thu || row.doi_thu || 1, 10),
                chi_nhanh: String(row.Chi_Nhanh || row.chi_nhanh || currentAdminSession.branch).trim(),
                ho_ten: String(row.Ho_Ten || row.ho_ten || "").trim(),
                ten_hieu: String(row.Ten_Hieu || row.ten_hieu || "").trim(),
                gioi_tinh: String(row.Gioi_Tinh || row.gioi_tinh || "Nam").trim(),
                ngay_sinh: String(row.Ngay_Sinh || row.ngay_sinh || "").trim(),
                con_song: String(row.Con_Song || row.con_song).toLowerCase() === "true" || row.Con_Song === 1,
                ngay_mat_am: String(row.Ngay_Mat_Am || row.ngay_mat_am || "").trim(),
                vo_chong: String(row.Vo_Chong || row.vo_chong || "").trim(),
                mo_phan: String(row.Mo_Phan || row.mo_phan || "").trim(),
                danh_hieu: String(row.Danh_Hieu || row.danh_hieu || "").trim(),
                tieu_su: String(row.Tieu_Su || row.tieu_su || "").trim(),
                cong_duc: String(row.Cong_Duc || row.cong_duc || "").trim(),
                so_vang: !!(row.Danh_Hieu || row.Cong_Duc)
            }));

            // Kiểm tra phân quyền: Trưởng chi chỉ được nạp người trong chi của mình
            if (!currentAdminSession.canEditAll) {
                const unauthorized = parsedMembers.filter(m => !isMemberInSessionScope(m, currentAdminSession));
                if (unauthorized.length > 0) {
                    alert(`CẢNH BÁO PHÂN QUYỀN:\nBạn là ${currentAdminSession.role}, chỉ có quyền cập nhật nhánh "${currentAdminSession.branch}".\nFile Excel chứa ${unauthorized.length} thành viên thuộc chi khác sẽ bị bỏ qua!`);
                    parsedMembers = parsedMembers.filter(m => isMemberInSessionScope(m, currentAdminSession));
                }
            }

            const dm = window.familyDataManager;
            const currentList = [...dm.getAllMembers()];

            for (const newM of parsedMembers) {
                if (!newM.id || !newM.ho_ten) continue;
                const idx = currentList.findIndex(m => m.id === newM.id);
                if (idx >= 0) {
                    currentList[idx] = newM;
                } else {
                    currentList.push(newM);
                }
            }

            // Kiểm tra tính toàn vẹn
            const validation = dm.validateIntegrity(currentList);
            if (!validation.isValid) {
                alert("FILE EXCEL CÓ LỖI LOGIC:\n\n" + validation.errors.slice(0, 8).join("\n"));
                return;
            }

            const confirmMsg = `Kiểm tra hợp lệ thành công!\n- Số người nạp/cập nhật: ${parsedMembers.length}\n- Tổng thành viên trong gia phả: ${currentList.length}\n\nBạn có muốn lưu ngay vào cơ sở dữ liệu trên máy không?`;
            if (confirm(confirmMsg)) {
                await window.IDBStorage.saveAllMembers(currentList);
                await window.familyDataManager.init();
                populateGenerationFilter();
                renderAdminMembersTable();
                if (window.showAdminToast) {
                    window.showAdminToast(`Đã nạp và cập nhật thành công ${parsedMembers.length} người từ file Excel!`, true);
                }
            }
        } catch (err) {
            console.error("Lỗi đọc Excel:", err);
            alert("Lỗi khi đọc file Excel: " + err.message);
        } finally {
            event.target.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * 3. XUẤT TOÀN BỘ GIA PHẢ RA EXCEL
 */
function exportFullFamilyExcel() {
    if (!window.XLSX) return;
    const members = window.familyDataManager.getAllMembers();
    const worksheet = XLSX.utils.json_to_sheet(members);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GIA_PHA_HO_TRAN");
    XLSX.writeFile(workbook, `Gia_Pha_Ho_Tran_Full_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * 4. XUẤT FILE MÃ NGUỒN data_chi_X.js
 */
function exportCurrentBranchJSFile() {
    const branch = currentAdminSession.canEditAll 
        ? (document.getElementById("filter-branch-admin") ? document.getElementById("filter-branch-admin").value : "Tất cả")
        : currentAdminSession.branch;

    if (branch === "Tất cả") {
        alert("Vui lòng chọn cụ thể một Chi phái để xuất tệp mã nguồn JS.");
        return;
    }

    const content = window.familyDataManager.exportBranchJS(branch);
    let fileName = "data_chi.js";
    if (branch.includes("Lãng Nam") || branch.includes("Chí Hòa")) {
        fileName = "data_chi_lang_nam.js";
    } else if (branch === "Chi 1") {
        fileName = "data_chi_1.js";
    } else if (branch === "Chi 2") {
        fileName = "data_chi_2.js";
    } else {
        fileName = `data_${branch.replace(/\s+/g, "_")}.js`;
    }

    const blob = new Blob([content], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Đã xuất file mã nguồn ${fileName} thành công!\nBạn có thể đưa tệp này vào thư mục /data/ và đẩy lên GitHub Pages.`);
}

/**
 * 5. ĐỔI MÃ PIN QUẢN TRỊ
 */
async function handleChangePin() {
    const modal = document.getElementById("modal-change-my-password");
    if (!modal) return;
    const userInfoEl = document.getElementById("change-pwd-user-info");
    if (userInfoEl && currentAdminSession) {
        userInfoEl.textContent = `Tài khoản: ${currentAdminSession.holder} • ${currentAdminSession.role}`;
    }
    const inputCur = document.getElementById("input-cur-pwd");
    const inputNew = document.getElementById("input-new-pwd");
    const inputConfirm = document.getElementById("input-confirm-new-pwd");
    if (inputCur) inputCur.value = "";
    if (inputNew) inputNew.value = "";
    if (inputConfirm) inputConfirm.value = "";
    modal.style.display = "flex";
}

/**
 * 6. ĐỒNG BỘ GOOGLE SHEET
 */
async function handleSyncGoogleSheet() {
    const savedUrl = await window.IDBStorage.getSetting("google_sheets_url", "");
    const url = prompt("Nhập liên kết Google Sheets đã xuất bản CSV (Publish to web -> CSV):", savedUrl);
    if (!url || !url.trim()) return;

    try {
        const res = await window.SyncEngine.syncFromGoogleSheetsCSV(url.trim());
        await window.familyDataManager.init();
        populateGenerationFilter();
        renderAdminMembersTable();
        alert(`Đồng bộ thành công ${res.count} thành viên từ Google Sheets!`);
    } catch (err) {
        alert("Lỗi đồng bộ: " + err.message);
    }
}

/**
 * 7. CẤP MÃ PIN CHO CHI HỌ TRẦN TỈNH KHÁC (Dành cho Admin Đại Tộc)
 */
async function handleCreateBranchPin() {
    if (!currentAdminSession || !currentAdminSession.canEditAll) {
        alert("Chỉ có Admin Đại Tộc mới có quyền cấp mã PIN cho chi họ mới!");
        return;
    }

    const branchName = prompt("Nhập tên Chi Họ Trần mới cần cấp quyền (Ví dụ: Chi Họ Trần Thanh Hóa, Chi Họ Trần Hải Dương...):");
    if (!branchName || !branchName.trim()) return;

    const pin = prompt(`Nhập mã PIN gồm 6 chữ số cấp cho Trưởng Chi "${branchName.trim()}":`);
    if (!pin || pin.trim().length < 4) {
        alert("Mã PIN không hợp lệ (tối thiểu 4 ký tự).");
        return;
    }

    let pinConfigs = await window.IDBStorage.getSetting("admin_pins", DEFAULT_PINS);
    const key = "chi_" + Date.now();
    pinConfigs[key] = {
        pin: pin.trim(),
        role: "Trưởng " + branchName.trim(),
        branch: branchName.trim(),
        canEditAll: false
    };

    await window.IDBStorage.setSetting("admin_pins", pinConfigs);
    alert(`Đã cấp mã PIN thành công!\n- Chi họ: ${branchName.trim()}\n- Mã PIN: ${pin.trim()}\nTrưởng chi mới có thể dùng mã PIN này để đăng nhập và chỉ quản lý dữ liệu chi của mình.`);
}

// Gắn các hàm CRUD vào window để gọi từ inline onclick của các dòng bảng
window.openMemberModal = openMemberModal;
window.handleDeleteMember = handleDeleteMember;
window.renderAdminMembersTable = renderAdminMembersTable;


/* ==========================================================================
   HỆ THỐNG ĐIỀU PHỐI PHÂN QUYỀN 4 TẦNG & AUDIT LOG (ADMIN.JS V5.0)
   ========================================================================== */

/**
 * Chuyển đổi giữa 4 phân khu quản trị trong Dashboard
 */
window.switchAdminTab = function(tabName) {
    const tabs = ['members', 'auth-tree', 'audit-log', 'zalo-sync'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-tab-${t}`);
        const panel = document.getElementById(`panel-admin-${t}`);
        if (btn) btn.classList.toggle("active", t === tabName);
        if (panel) panel.style.display = (t === tabName) ? "block" : "none";
    });

    if (tabName === "auth-tree") {
        renderAuthTree();
    } else if (tabName === "audit-log") {
        renderAuditLog();
    }
};

/**
 * Hiển thị Sơ đồ Cây Phân Quyền Đa Cấp
 */
async function renderAuthTree() {
    const container = document.getElementById("auth-tree-container");
    if (!container) return;

    await window.FamilyAuth.init();
    const accounts = await window.FamilyAuth.getAllAccounts();
    const session = window.FamilyAuth.getCurrentSession();
    const isSuperAdmin = session && (session.role === "tong_quan" || session.canEditAll);

    // Phân loại các cấp
    const level1 = accounts.filter(a => a.role === "tong_quan");
    const level2 = accounts.filter(a => a.role === "truong_chi");
    const level3 = accounts.filter(a => a.role === "truong_canh");
    const level4 = accounts.filter(a => a.role === "nguoi_ghi_chep" || (a.role !== "tong_quan" && a.role !== "truong_chi" && a.role !== "truong_canh"));

    const renderAccountNode = (acc, level) => {
        const isCurrent = session && session.id === acc.id;
        const isChildOfCurrent = session && acc.parent_account_id === session.id;
        const canManageThis = isSuperAdmin || isChildOfCurrent;
        const isRevoked = acc.status === "revoked";

        let roleBadgeColor = "#b91c1c";
        let roleIcon = "👑";
        if (acc.role === "truong_chi") { roleBadgeColor = "#1d4ed8"; roleIcon = "🌾"; }
        else if (acc.role === "truong_canh") { roleBadgeColor = "#047857"; roleIcon = "🌿"; }
        else if (acc.role === "nguoi_ghi_chep") { roleBadgeColor = "#b45309"; roleIcon = "✍️"; }

        return `
            <div class="auth-node-item auth-node-level-${level} ${isRevoked ? 'opacity-50' : ''}">
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 22px;">${roleIcon}</span>
                    <div>
                        <div style="font-weight: bold; font-size: 15px; color: var(--primary-red); display: flex; align-items: center; gap: 8px;">
                            ${acc.holder}
                            ${isCurrent ? '<span style="background: #fef08a; color: #854d0e; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #ca8a04;">(Đang đăng nhập)</span>' : ''}
                            ${acc.is_default_pin ? '<span style="background: #fee2e2; color: #991b1b; font-size: 11px; padding: 2px 6px; border-radius: 4px;" title="Tài khoản còn dùng mã PIN khởi tạo, cần thiết lập bảo mật">⚠️ Mã PIN gốc</span>' : '<span style="background: #d1fae5; color: #065f46; font-size: 11px; padding: 2px 6px; border-radius: 4px;">🛡️ Đã bảo vệ</span>'}
                            ${isRevoked ? '<span style="background: #991b1b; color: #ffffff; font-size: 11px; padding: 2px 6px; border-radius: 4px;">ĐÃ THU HỒI</span>' : ''}
                        </div>
                        <div style="font-size: 13px; color: var(--text-muted); margin-top: 3px;">
                            <span class="auth-badge-role" style="background: ${roleBadgeColor}; color: #ffffff;">${acc.role_title}</span>
                            <span style="margin-left: 6px;">Phạm vi: <strong class="text-gold">${acc.scope_branch}</strong></span>
                            ${acc.created_at ? `<span style="margin-left: 6px; font-size: 11.5px; opacity: 0.8;">• Khởi tạo: ${new Date(acc.created_at).toLocaleDateString("vi-VN")}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    ${canManageThis && !isCurrent && !isRevoked ? `
                        <button class="btn-royal-sm" onclick="window.openReissueModal('${acc.id}', '${acc.holder}')" style="background: #0284c7; border-color: #38bdf8; font-size: 12px; padding: 5px 10px;">
                            🔄 Cấp Lại PIN
                        </button>
                        <button class="btn-royal-sm-outline" onclick="window.handleRevokeAccount('${acc.id}', '${acc.holder}')" style="border-color: #f87171; color: #ef4444; font-size: 12px; padding: 5px 10px;">
                            🚫 Thu Hồi
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    };

    let html = `<div style="display: flex; flex-direction: column; gap: 4px;">`;

    // Cấp 1
    html += `<div style="font-weight: bold; font-size: 13.5px; color: #991b1b; margin-bottom: 4px;">✦ CẤP 1: TỔNG QUẢN ĐẠI TỘC</div>`;
    level1.forEach(acc => html += renderAccountNode(acc, 1));

    // Cấp 2
    if (level2.length > 0) {
        html += `<div style="font-weight: bold; font-size: 13.5px; color: #1d4ed8; margin: 12px 0 4px 24px;">✦ CẤP 2: TRƯỞNG CHI ĐỊA PHƯƠNG</div>`;
        level2.forEach(acc => html += renderAccountNode(acc, 2));
    }

    // Cấp 3
    if (level3.length > 0) {
        html += `<div style="font-weight: bold; font-size: 13.5px; color: #047857; margin: 12px 0 4px 48px;">✦ CẤP 3: TRƯỞNG CÀNH / PHÂN NHÁNH</div>`;
        level3.forEach(acc => html += renderAccountNode(acc, 3));
    }

    // Cấp 4
    if (level4.length > 0) {
        html += `<div style="font-weight: bold; font-size: 13.5px; color: #b45309; margin: 12px 0 4px 72px;">✦ CẤP 4: NGƯỜI GHI CHÉP PHỤ TRÁCH NHẬP LIỆU</div>`;
        level4.forEach(acc => html += renderAccountNode(acc, 4));
    }

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Hiển thị Nhật Ký Kiểm Toán Hoạt Động (Audit Log)
 */
async function renderAuditLog() {
    const tbody = document.getElementById("admin-audit-log-tbody");
    if (!tbody) return;

    await window.FamilyAuth.init();
    const logs = await window.FamilyAuth.getAuditLogs();
    const session = window.FamilyAuth.getCurrentSession();

    // Hiển thị nút xóa nhật ký nếu là Tổng Quản
    const btnClear = document.getElementById("btn-clear-audit-log");
    if (btnClear) {
        btnClear.style.display = (session && session.role === "tong_quan") ? "inline-block" : "none";
    }

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Chưa có nhật ký hoạt động nào được ghi nhận.</td></tr>`;
        return;
    }

    const actionBadges = {
        "LOGIN": { label: "Đăng Nhập", class: "audit-login" },
        "LOGOUT": { label: "Đăng Xuất", class: "audit-login" },
        "UPDATE_MEMBER": { label: "Sửa Người", class: "audit-update" },
        "CREATE_MEMBER": { label: "Thêm Người", class: "audit-create" },
        "DELETE_MEMBER": { label: "Xóa Người", class: "audit-delete" },
        "SETUP_SECURITY": { label: "Đổi PIN / Bảo Mật", class: "audit-auth" },
        "RESET_PIN": { label: "Khôi Phục PIN", class: "audit-auth" },
        "DELEGATE_PERMISSION": { label: "Cấp Quyền", class: "audit-auth" },
        "REISSUE_CODE": { label: "Cấp Lại Mã", class: "audit-auth" },
        "REVOKE_PERMISSION": { label: "Thu Hồi Quyền", class: "audit-delete" },
        "EXPORT_ZALO_PACKAGE": { label: "Xuất Gói Zalo", class: "audit-update" },
        "IMPORT_ZALO_PACKAGE": { label: "Nạp Gói Zalo", class: "audit-create" }
    };

    tbody.innerHTML = logs.map(log => {
        const badge = actionBadges[log.action] || { label: log.action, class: "audit-update" };
        const d = new Date(log.timestamp);
        const timeStr = `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • ${d.toLocaleDateString("vi-VN")}`;

        return `
            <tr>
                <td style="font-family: monospace; font-size: 12.5px; white-space: nowrap;">${timeStr}</td>
                <td>
                    <div style="font-weight: bold; color: var(--primary-red);">${log.actor_name}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted);">${log.actor_role}</div>
                </td>
                <td style="text-align: center;">
                    <span class="audit-action-tag ${badge.class}">${badge.label}</span>
                </td>
                <td style="font-weight: 500;">${log.target || "—"}</td>
                <td style="font-size: 13px; color: var(--text-dark);">${log.details}</td>
            </tr>
        `;
    }).join("");
}

/**
 * Mở modal Thiết Lập Lần Đầu (Đổi PIN, Câu hỏi bí mật, Mã khôi phục)
 */
function openFirstTimeSetupModal(account) {
    const modal = document.getElementById("modal-first-time-setup");
    if (!modal) return;

    const displayCodeEl = document.getElementById("setup-display-recovery-code");
    const code = window.FamilyAuth.generateRecoveryCode(account.role === "tong_quan" ? "TQ" : "LN");
    if (displayCodeEl) displayCodeEl.innerText = code;
    window._generatedSetupRecoveryCode = code;

    modal.style.display = "flex";
}

/**
 * Mở modal Cấp Lại Mã Kích Hoạt Tạm Thời
 */
window.openReissueModal = function(accountId, holderName) {
    const modal = document.getElementById("modal-reissue-code");
    const idInput = document.getElementById("reissue-target-id");
    const nameInput = document.getElementById("reissue-target-name");
    const pinInput = document.getElementById("reissue-temp-pin");

    if (modal && idInput && nameInput) {
        idInput.value = accountId;
        nameInput.value = holderName;
        if (pinInput) pinInput.value = "999999";
        modal.style.display = "flex";
    }
};

/**
 * Xử lý thu hồi quyền tài khoản
 */
window.handleRevokeAccount = async function(accountId, holderName) {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi quyền quản trị của: "${holderName}" không?`)) {
        return;
    }
    const session = window.FamilyAuth.getCurrentSession();
    try {
        await window.FamilyAuth.revokeAccount(session, accountId);
        window.showAdminToast(`Đã thu hồi quyền của ${holderName}!`, true);
        renderAuthTree();
    } catch (err) {
        alert("Lỗi: " + err.message);
    }
};

/**
 * Đăng ký tất cả các sự kiện mới cho Hệ thống Phân Quyền & Zalo Sync
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Link Quên mã PIN màn hình đăng nhập
    const linkForgot = document.getElementById("link-admin-forgot-pin");
    const modalReset = document.getElementById("modal-admin-reset-pin");
    const selectAcc = document.getElementById("admin-reset-account-select");
    const displayQ = document.getElementById("admin-reset-display-question");

    const refreshResetAccountsDropdown = async () => {
        if (!selectAcc) return;
        const accounts = await window.FamilyAuth.getAllAccounts();
        selectAcc.innerHTML = accounts.map(a => `
            <option value="${a.id}">${a.holder} (${a.role_title})</option>
        `).join("");
        updateAdminResetQuestion();
    };

    const updateAdminResetQuestion = async () => {
        if (!selectAcc || !displayQ) return;
        const acc = await window.FamilyAuth.getAccountById(selectAcc.value);
        if (acc && acc.security_question) {
            displayQ.innerText = acc.security_question;
        } else {
            displayQ.innerText = "Tài khoản này chưa cài đặt câu hỏi bảo mật riêng.";
        }
    };

    if (linkForgot) {
        linkForgot.addEventListener("click", () => {
            const modalForgot = document.getElementById("modal-forgot-support");
            if (modalForgot) {
                modalForgot.style.display = "flex";
            } else if (modalReset) {
                modalReset.style.display = "flex";
                refreshResetAccountsDropdown();
            }
        });
    }

    if (selectAcc) {
        selectAcc.addEventListener("change", updateAdminResetQuestion);
    }

    // 2. Chuyển Tab trong Modal Reset PIN
    const tabQ = document.getElementById("tab-admin-reset-question");
    const tabC = document.getElementById("tab-admin-reset-code");
    const formQ = document.getElementById("form-admin-reset-by-question");
    const formC = document.getElementById("form-admin-reset-by-code");

    if (tabQ && tabC && formQ && formC) {
        tabQ.addEventListener("click", () => {
            tabQ.className = "btn-royal-sm w-100";
            tabQ.style.background = "#0284c7";
            tabC.className = "btn-royal-sm-outline w-100";
            tabC.style.background = "transparent";
            formQ.style.display = "block";
            formC.style.display = "none";
        });
        tabC.addEventListener("click", () => {
            tabC.className = "btn-royal-sm w-100";
            tabC.style.background = "#0284c7";
            tabQ.className = "btn-royal-sm-outline w-100";
            tabQ.style.background = "transparent";
            formC.style.display = "block";
            formQ.style.display = "none";
        });
    }

    // 3. Submit Reset PIN qua câu hỏi
    if (formQ) {
        formQ.addEventListener("submit", async (e) => {
            e.preventDefault();
            const accId = selectAcc.value;
            const answer = document.getElementById("admin-reset-input-answer").value.trim();
            const newPin = document.getElementById("admin-reset-input-new-pin-q").value.trim();

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

    // 4. Submit Reset PIN qua mã 6 ký tự
    if (formC) {
        formC.addEventListener("submit", async (e) => {
            e.preventDefault();
            const accId = selectAcc.value;
            const code = document.getElementById("admin-reset-input-code").value.trim();
            const newPin = document.getElementById("admin-reset-input-new-pin-c").value.trim();

            if (!newPin || newPin.length < 6 || newPin.length > 16) {
                alert("Mật khẩu mới phải từ 6 đến 16 ký tự!");
                return;
            }

            const res = await window.FamilyAuth.resetPinWithRecoveryCode(accId, code, newPin);
            if (res.success) {
                alert(`${res.message}\n\n🛡️ Mã bảo mật dự phòng mới của bạn là: [${res.newRecoveryCode}]\nHãy lưu lại cẩn thận!`);
                window.closeAllModals();
            } else {
                alert(res.message);
            }
        });
    }

    // 5. Submit Thiết Lập Lần Đầu
    const formSetup = document.getElementById("form-first-time-setup");
    if (formSetup) {
        formSetup.addEventListener("submit", async (e) => {
            e.preventDefault();
            const session = window.FamilyAuth.getCurrentSession();
            if (!session) return;

            const newPin = document.getElementById("setup-new-pin").value.trim();
            const question = document.getElementById("setup-question").value.trim();
            const answer = document.getElementById("setup-answer").value.trim();
            const code = window._generatedSetupRecoveryCode;

            if (!newPin || newPin.length < 6 || newPin.length > 16) {
                alert("Mật khẩu mới phải từ 6 đến 16 ký tự!");
                return;
            }

            await window.FamilyAuth.setupAccountSecurity(session.id, newPin, question, answer, code);
            window.closeAllModals();
            window.showAdminToast("Đã hoàn tất thiết lập 3 lớp bảo mật tài khoản!", true);
        });
    }

    // Tải thẻ mã khôi phục
    const btnDownloadCard = document.getElementById("btn-download-recovery-card");
    if (btnDownloadCard) {
        btnDownloadCard.addEventListener("click", () => {
            const session = window.FamilyAuth.getCurrentSession();
            const code = window._generatedSetupRecoveryCode || "TR8888";
            const text = `========================================\n` +
                         `THẺ MÃ KHÔI PHỤC BẢO MẬT GIA PHẢ HỌ TRẦN\n` +
                         `========================================\n\n` +
                         `• Chủ tài khoản: ${session ? session.holder : "Quản trị viên"}\n` +
                         `• Vai trò: ${session ? session.role_title : "Quản trị"}\n` +
                         `• MÃ KHÔI PHỤC DỰ PHÒNG: [ ${code} ]\n` +
                         `• Ngày cấp: ${new Date().toLocaleDateString("vi-VN")}\n\n` +
                         `HƯỚNG DẪN: Cất giữ mã này ở nơi an toàn. Khi quên mã PIN, bạn có thể nhập mã này trên màn hình Quên PIN để tự đặt lại mật khẩu mới mà không cần server.\n` +
                         `========================================\n`;

            const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `The_Bao_Mat_GiaPha_${code}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // 6. Modal Cấp Quyền Cho Nhánh Con
    const btnOpenDelegate = document.getElementById("btn-open-delegate-modal");
    const modalDelegate = document.getElementById("modal-delegate-account");
    const selectRoleDel = document.getElementById("del-role-select");
    const inputRoleTitle = document.getElementById("del-role-title");
    const selectScopeBranch = document.getElementById("del-scope-branch");
    const btnGenPin = document.getElementById("btn-gen-random-pin");
    const inputInitPin = document.getElementById("del-initial-pin");
    const formDelegate = document.getElementById("form-delegate-account");

    if (btnOpenDelegate && modalDelegate) {
        btnOpenDelegate.addEventListener("click", () => {
            const session = window.FamilyAuth.getCurrentSession();
            if (!session) return;

            // Đổ các nhánh con phù hợp với quyền hạn
            let branchOptions = "";
            if (session.role === "tong_quan") {
                branchOptions = `
                    <option value="Chi Lãng Nam">Chi Lãng Nam</option>
                    <option value="Chi Cụ Chí Hòa - Nhánh ông Long">Nhánh ông Long</option>
                    <option value="Chi Cụ Chí Hòa - Nhánh ông Thịnh">Nhánh ông Thịnh</option>
                    <option value="Chi Cụ Chí Hòa - Nhánh ông Vượng">Nhánh ông Vượng</option>
                    <option value="Chi 1">Chi 1 (An Sinh Vương)</option>
                    <option value="Chi 2">Chi 2 (Chiêu Minh Vương)</option>
                `;
            } else if (session.role === "truong_chi") {
                branchOptions = `
                    <option value="Chi Cụ Chí Hòa - Nhánh ông Long">Nhánh ông Long</option>
                    <option value="Chi Cụ Chí Hòa - Nhánh ông Thịnh">Nhánh ông Thịnh</option>
                    <option value="Chi Cụ Chí Hòa - Nhánh ông Vượng">Nhánh ông Vượng</option>
                    <option value="Chi Lãng Nam">Chi Lãng Nam (Tổng thể)</option>
                `;
            } else {
                branchOptions = `<option value="${session.scope_branch}">${session.scope_branch}</option>`;
            }
            if (selectScopeBranch) selectScopeBranch.innerHTML = branchOptions;

            // Sinh mã PIN ngẫu nhiên 6 số
            if (inputInitPin) inputInitPin.value = Math.floor(100000 + Math.random() * 900000).toString();

            modalDelegate.style.display = "flex";
        });
    }

    if (selectRoleDel && inputRoleTitle) {
        selectRoleDel.addEventListener("change", () => {
            if (selectRoleDel.value === "truong_canh") {
                inputRoleTitle.value = "Trưởng Cành Phân Nhánh";
            } else {
                inputRoleTitle.value = "Người Ghi Chép Phụ Trách Nhập Liệu";
            }
        });
    }

    if (btnGenPin && inputInitPin) {
        btnGenPin.addEventListener("click", () => {
            inputInitPin.value = Math.floor(100000 + Math.random() * 900000).toString();
        });
    }

    if (formDelegate) {
        formDelegate.addEventListener("submit", async (e) => {
            e.preventDefault();
            const session = window.FamilyAuth.getCurrentSession();
            if (!session) return;

            const holder = document.getElementById("del-holder-name").value.trim();
            const role = selectRoleDel.value;
            const roleTitle = inputRoleTitle.value.trim();
            const scopeBranch = selectScopeBranch.value;
            const pin = inputInitPin.value.trim();

            if (!pin || pin.length < 6 || pin.length > 16) {
                alert("Mật khẩu khởi tạo phải từ 6 đến 16 ký tự!");
                return;
            }

            try {
                const res = await window.FamilyAuth.createSubAccount(session, {
                    holder: holder,
                    role: role,
                    role_title: roleTitle,
                    scope_branch: scopeBranch,
                    initialPin: pin
                });

                window.closeAllModals();
                alert(`Cấp quyền thành công cho [${holder}]!\n\n` +
                      `• Danh xưng: ${roleTitle}\n` +
                      `• Chi nhánh: ${scopeBranch}\n` +
                      `• Mã PIN khởi tạo: ${pin}\n` +
                      `• Mã khôi phục: ${res.recoveryCode}\n\n` +
                      `👉 Vui lòng gửi mã PIN [${pin}] cho ${holder} để đăng nhập.`);

                renderAuthTree();
            } catch (err) {
                alert("Lỗi cấp quyền: " + err.message);
            }
        });
    }

    // 7. Submit Cấp Lại Mã Kích Hoạt Tạm Thời
    const formReissue = document.getElementById("form-reissue-code");
    if (formReissue) {
        formReissue.addEventListener("submit", async (e) => {
            e.preventDefault();
            const session = window.FamilyAuth.getCurrentSession();
            if (!session) return;

            const targetId = document.getElementById("reissue-target-id").value;
            const targetName = document.getElementById("reissue-target-name").value;
            const tempPin = document.getElementById("reissue-temp-pin").value.trim();

            if (!tempPin || tempPin.length < 6 || tempPin.length > 16) {
                alert("Mật khẩu tạm thời phải từ 6 đến 16 ký tự!");
                return;
            }

            try {
                await window.FamilyAuth.reissueActivationCode(session, targetId, tempPin);
                window.closeAllModals();
                alert(`Đã cấp lại mã PIN kích hoạt tạm thời [${tempPin}] thành công cho "${targetName}"!\nHãy gửi mã này để họ đăng nhập và tự đổi PIN mới.`);
                renderAuthTree();
            } catch (err) {
                alert("Lỗi: " + err.message);
            }
        });
    }

    // 8. Xuất & Nạp Gói Đồng Bộ Zalo trong Dashboard
    const btnExportZaloDash = document.getElementById("btn-export-zalo-dashboard");
    if (btnExportZaloDash) {
        btnExportZaloDash.addEventListener("click", async () => {
            const session = window.FamilyAuth.getCurrentSession();
            if (!session) return;
            try {
                await window.FamilyAuth.exportZaloPackage(session);
                alert("Đã xuất file gói đồng bộ Zalo thành công!\nQuý vị mở Zalo gửi file này cho Tổng Quản Trần Văn Thuần để phê duyệt nạp vào gia phả toàn quốc.");
            } catch (err) {
                alert("Lỗi xuất gói: " + err.message);
            }
        });
    }

    const inputImportZalo = document.getElementById("input-import-zalo");
    if (inputImportZalo) {
        inputImportZalo.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const session = window.FamilyAuth.getCurrentSession();
            if (!session || session.role !== "tong_quan") {
                alert("Chỉ có Tổng Quản Đại Tộc (Trần Văn Thuần) mới có thẩm quyền phê duyệt và nạp Gói Đồng Bộ Zalo.");
                e.target.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const content = evt.target.result;
                    const res = await window.FamilyAuth.importZaloPackage(session, content);

                    const summaryEl = document.getElementById("zalo-import-summary");
                    if (summaryEl) {
                        summaryEl.innerHTML = `✅ Đã tiếp nhận và gộp thành công gói từ: <strong>${res.sender.holder} (${res.sender.role_title})</strong><br>• Cập nhật: ${res.updatedCount} người • Thêm mới: ${res.addedCount} người • Tổng cộng: ${res.totalRecords} người.`;
                        summaryEl.style.display = "block";
                    }

                    // Tải lại bảng thành viên
                    renderAdminMembersTable();
                    alert(`Nạp gói đồng bộ Zalo thành công!\n- Người gửi: ${res.sender.holder} (${res.sender.role_title})\n- Cập nhật: ${res.updatedCount} người\n- Thêm mới: ${res.addedCount} người`);
                } catch (err) {
                    alert("Lỗi nạp gói Zalo: " + err.message);
                } finally {
                    e.target.value = "";
                }
            };
            reader.readAsText(file);
        });
    }

    // 9. Nút Xóa Nhật Ký Hoạt Động (Chỉ Tổng Quản)
    const btnClearAudit = document.getElementById("btn-clear-audit-log");
    if (btnClearAudit) {
        btnClearAudit.addEventListener("click", async () => {
            const session = window.FamilyAuth.getCurrentSession();
            if (!session || session.role !== "tong_quan") {
                alert("Chỉ có Tổng Quản Đại Tộc mới có quyền xóa Nhật Ký.");
                return;
            }
            if (confirm("Bạn có chắc chắn muốn làm mới toàn bộ Nhật Ký Kiểm Toán không?")) {
                await window.FamilyAuth.clearAuditLogs(session);
                renderAuditLog();
                window.showAdminToast("Đã làm mới Nhật Ký Kiểm Toán thành công!", true);
            }
        });
    }

    const btnRefreshAudit = document.getElementById("btn-refresh-audit-log");
    if (btnRefreshAudit) {
        btnRefreshAudit.addEventListener("click", () => {
            renderAuditLog();
            window.showAdminToast("Đã cập nhật dữ liệu Nhật Ký mới nhất!", true);
        });
    }
});
