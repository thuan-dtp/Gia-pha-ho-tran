/**
 * TAB 5: SỔ VÀNG, TRA CỨU & LỊCH GIỖ THÔNG MINH
 * Tích hợp Bảng Vàng vinh danh, Tra cứu đa năng,
 * Lịch Kỵ Nhật Âm - Dương tự động đếm ngược và Công cụ tính vai vế dòng họ.
 */

class GoldenSearchTab {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentSubTab = "honor"; // "honor", "search", "anniversary", "kinship"
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    setSubTab(subTab) {
        this.currentSubTab = subTab;
        this.render();
    }

    render() {
        if (!this.container || !window.familyDataManager) return;

        this.container.innerHTML = `
            <div class="golden-tab-wrapper">
                <!-- THANH CHUYỂN PHÂN HỆ CON -->
                <div class="golden-subnav">
                    <button class="subnav-btn ${this.currentSubTab === 'honor' ? 'active' : ''}" onclick="window.goldenTab.setSubTab('honor')">
                        🏆 BẢNG VÀNG DANH DỰ
                    </button>
                    <button class="subnav-btn ${this.currentSubTab === 'search' ? 'active' : ''}" onclick="window.goldenTab.setSubTab('search')">
                        🔍 TRA CỨU ĐA NĂNG
                    </button>
                    <button class="subnav-btn ${this.currentSubTab === 'anniversary' ? 'active' : ''}" onclick="window.goldenTab.setSubTab('anniversary')">
                        📅 LỊCH GIỖ THÔNG MINH
                    </button>
                    <button class="subnav-btn ${this.currentSubTab === 'kinship' ? 'active' : ''}" onclick="window.goldenTab.setSubTab('kinship')">
                        🤝 TÍNH VAI VẾ & XƯNG HÔ
                    </button>
                </div>

                <!-- KHU VỰC NỘI DUNG PHÂN HỆ -->
                <div class="golden-subcontent">
                    ${this.renderSubContent()}
                </div>
            </div>
        `;

        this.attachSubEvents();
    }

    renderSubContent() {
        switch (this.currentSubTab) {
            case "honor":
                return this.renderHonorPlaques();
            case "search":
                return this.renderSearchSection();
            case "anniversary":
                return this.renderAnniversarySection();
            case "kinship":
                return this.renderKinshipSection();
            default:
                return this.renderHonorPlaques();
        }
    }

    /* =================== 1. BẢNG VÀNG DANH DỰ =================== */
    renderHonorPlaques() {
        const honors = window.familyDataManager.getHonorList();

        return `
            <div class="honor-header text-center">
                <h2 class="section-gold-title">⭐ BẢNG VÀNG VINH DANH HỌ TRẦN ⭐</h2>
                <p class="section-desc">Ghi nhận công đức, học vị khoa bảng và những đóng góp to lớn của tiền nhân và hậu duệ.</p>
            </div>

            <div class="honor-grid">
                ${honors.map(m => `
                    <div class="honor-card">
                        <div class="honor-card-ribbon">BẢNG VÀNG</div>
                        <div class="honor-card-icon">🎖️</div>
                        <h3 class="honor-name">${m.ho_ten}</h3>
                        <div class="honor-title">${m.danh_hieu || m.ten_hieu || "Bậc Tiêu Biểu"}</div>
                        <div class="honor-gen">Đời thứ ${m.doi_thu} • ${m.chi_nhanh}</div>
                        <div class="honor-body">
                            <p class="honor-merit"><strong>Công đức ghi nhận:</strong> ${m.cong_duc || m.tieu_su}</p>
                        </div>
                        <div class="honor-footer">
                            <button class="btn-royal-sm" onclick="window.switchTab('family', '${m.id}')">Xem Gia Đình</button>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    /* =================== 2. TRA CỨU ĐA NĂNG =================== */
    renderSearchSection() {
        return `
            <div class="search-header text-center">
                <h2 class="section-gold-title">🔍 TRA CỨU GIA PHẢ THÔNG MINH</h2>
                <p class="section-desc">Tìm kiếm tức thì theo Họ tên, Danh hiệu, Thế hệ, Chi nhánh, Nghề nghiệp hoặc Mộ phần.</p>
                <div class="search-box-wrap">
                    <input type="text" id="global-search-input" class="search-input" placeholder="Nhập tên cụ, danh xưng, năm sinh hoặc từ khóa cần tìm..." />
                    <button class="btn-royal" id="btn-trigger-search">Tìm Kiếm</button>
                </div>
            </div>

            <div id="search-results-area" class="search-results-grid">
                <div class="empty-hint text-center">Hãy nhập từ khóa vào ô trên để bắt đầu tra cứu.</div>
            </div>
        `;
    }

    /* =================== 3. LỊCH GIỖ THÔNG MINH (ÂM - DƯƠNG) =================== */
    renderAnniversarySection() {
        const list = window.familyDataManager.getAnniversaries();
        const currentYear = new Date().getFullYear();

        // Tính ngày dương lịch và số ngày còn lại
        const enrichedList = list.map(item => {
            const nextAnn = window.LunarHelper.getNextAnniversary(item.lunarDay, item.lunarMonth);
            return {
                ...item,
                ...nextAnn
            };
        });

        // Sắp xếp theo số ngày sắp đến gần nhất
        enrichedList.sort((a, b) => a.diffDays - b.diffDays);

        const upcoming = enrichedList.filter(item => item.diffDays <= 30);
        const others = enrichedList.filter(item => item.diffDays > 30);

        return `
            <div class="anniversary-header text-center">
                <h2 class="section-gold-title">📅 LỊCH KỴ NHẬT THÔNG MINH NĂM ${currentYear}</h2>
                <p class="section-desc">Hệ thống tự động chuyển đổi ngày Giỗ Âm lịch sang Dương lịch và đếm ngược nhắc nhở tế lễ.</p>
            </div>

            <!-- CÁC NGÀY GIỖ TRONG THÁNG (SẮP DIỄN RA) -->
            <div class="anniversary-block upcoming-block">
                <h3 class="block-title text-gold">🔥 CÁC NGÀY GIỖ SẮP TỚI TRONG THÁNG (30 NGÀY TỚI)</h3>
                ${upcoming.length > 0 ? `
                    <div class="anniversary-grid">
                        ${upcoming.map(item => this.renderAnniversaryCard(item, true)).join("")}
                    </div>
                ` : `<div class="empty-box">Trong 30 ngày tới không có ngày kỵ nhật nào của dòng họ.</div>`}
            </div>

            <!-- TOÀN BỘ CÁC NGÀY GIỖ TRONG NĂM -->
            <div class="anniversary-block mt-4">
                <h3 class="block-title text-gold">📜 TOÀN BỘ CÁC NGÀY GIỖ TRONG NĂM (XẾP THEO THỜI GIAN)</h3>
                <div class="anniversary-grid">
                    ${enrichedList.map(item => this.renderAnniversaryCard(item, false)).join("")}
                </div>
            </div>
        `;
    }

    renderAnniversaryCard(item, isHighlight) {
        return `
            <div class="ann-card ${isHighlight ? 'ann-card-upcoming' : ''}">
                <div class="ann-card-header">
                    <span class="ann-badge-lunar">${item.lunarDateStr}</span>
                    <span class="ann-countdown ${item.diffDays <= 7 ? 'text-danger font-bold' : ''}">
                        ${item.diffDays === 0 ? '🔴 HÔM NAY' : `Còn ${item.diffDays} ngày`}
                    </span>
                </div>
                <h4 class="ann-name">${item.member.ho_ten}</h4>
                <div class="ann-alias">${item.member.ten_hieu || "Bậc Tiền Nhân"}</div>
                <div class="ann-gen">Đời thứ ${item.member.doi_thu} • ${item.member.chi_nhanh}</div>
                <div class="ann-solar">
                    <strong>Dương lịch năm nay:</strong> ${item.solarDateStr}
                </div>
                <div class="ann-tomb">
                    <strong>Nơi an táng:</strong> ${item.member.mo_phan || "Xem bia ký chi tiết"}
                </div>
                <div class="ann-actions">
                    <button class="btn-royal-sm w-100" onclick="window.switchTab('family', '${item.member.id}')">Dâng Lễ & Xem Bia Ký</button>
                </div>
            </div>
        `;
    }

    /* =================== 4. CÔNG CỤ TÍNH VAI VẾ & XƯNG HÔ =================== */
    renderKinshipSection() {
        const members = window.familyDataManager.getAllMembers();

        return `
            <div class="kinship-header text-center">
                <h2 class="section-gold-title">🤝 CÔNG CỤ TÍNH VAI VẾ & GỢI Ý XƯNG HÔ</h2>
                <p class="section-desc">Chọn 2 thành viên bất kỳ trong dòng họ, thuật toán sẽ tự động xác định Tổ Phụ chung và chỉ dẫn cách xưng hô chuẩn lễ nghi.</p>
            </div>

            <div class="kinship-box">
                <div class="kinship-selectors-row">
                    <!-- NGƯỜI THỨ NHẤT -->
                    <div class="kinship-col">
                        <label class="kinship-label">Người thứ nhất (A):</label>
                        <select id="kinship-person-a" class="kinship-select">
                            ${members.map(m => `<option value="${m.id}">Đời ${m.doi_thu} - ${m.ho_ten} (${m.chi_nhanh})</option>`).join("")}
                        </select>
                    </div>

                    <!-- BIỂU TƯỢNG SO SÁNH -->
                    <div class="kinship-vs-icon">⚡</div>

                    <!-- NGƯỜI THỨ HAI -->
                    <div class="kinship-col">
                        <label class="kinship-label">Người thứ hai (B):</label>
                        <select id="kinship-person-b" class="kinship-select">
                            ${members.map((m, idx) => `<option value="${m.id}" ${idx === 2 ? 'selected' : ''}>Đời ${m.doi_thu} - ${m.ho_ten} (${m.chi_nhanh})</option>`).join("")}
                        </select>
                    </div>
                </div>

                <div class="text-center mt-3">
                    <button class="btn-royal btn-lg" id="btn-calc-kinship">⚡ Xác Định Vai Vế & Cách Xưng Hô</button>
                </div>

                <!-- KẾT QUẢ TÍNH TOÁN -->
                <div id="kinship-result-box" class="kinship-result-wrap" style="display: none;">
                </div>
            </div>
        `;
    }

    attachSubEvents() {
        // Sự kiện Tra cứu
        const searchInput = document.getElementById("global-search-input");
        const searchBtn = document.getElementById("btn-trigger-search");
        if (searchInput && searchBtn) {
            const doSearch = () => {
                const q = searchInput.value.trim();
                const area = document.getElementById("search-results-area");
                if (!area) return;

                if (!q) {
                    area.innerHTML = `<div class="empty-hint text-center">Hãy nhập họ tên hoặc từ khóa vào ô trên để bắt đầu tra cứu (hỗ trợ cả tiếng Việt không dấu).</div>`;
                    return;
                }

                const results = window.familyDataManager.searchMembers(q, window.isPrivacyMode);

                if (results.length === 0) {
                    area.innerHTML = `<div class="empty-hint text-center">Không tìm thấy thành viên nào khớp với từ khóa "${q}".<br/><small style="color:var(--text-muted); margin-top:6px; display:block;">Mẹo: Thử gõ không dấu ví dụ "tran van thuan", "hung", "vuong", "long"...</small></div>`;
                    return;
                }

                area.innerHTML = `
                    <div style="grid-column: 1 / -1; margin-bottom: 8px; font-weight: bold; color: var(--gold-dark);">
                        🎯 Tìm thấy ${results.length} thành viên phù hợp với từ khóa "${q}":
                    </div>
                ` + results.map(m => `
                    <div class="search-result-card">
                        <div class="res-card-top">
                            <span class="res-badge">Đời ${m.doi_thu} • ${m.chi_nhanh}</span>
                            <span class="res-status">${m.con_song ? '🟢 Còn sống' : '🕊️ Đã khuất'}</span>
                        </div>
                        <h4 class="res-name">${m.ho_ten}</h4>
                        <div class="res-alias">${m.ten_hieu || "—"}</div>
                        <div class="res-detail">
                            <p><strong>Năm sinh:</strong> ${window.isPrivacyMode && m.con_song ? 'Bảo mật riêng tư' : (m.ngay_sinh || '—')}</p>
                            ${!m.con_song && m.ngay_mat_am ? `<p><strong style="color:#b91c1c;">Ngày giỗ:</strong> ${m.ngay_mat_am} ÂL</p>` : ''}
                            <p><strong>Phối ngẫu:</strong> ${m.vo_chong || '—'}</p>
                            <p><strong>Mộ phần:</strong> ${m.mo_phan || 'Còn sinh thời'}</p>
                            ${m.danh_hieu ? `<p><strong>Danh hiệu:</strong> <span style="background:#fef08a; padding:1px 5px; border-radius:3px; color:#854d0e;">${m.danh_hieu}</span></p>` : ''}
                        </div>
                        <div class="res-actions">
                            <button class="btn-royal-sm" onclick="window.switchTab('family', '${m.id}')">👨‍👩‍👧‍👦 Xem Gia Đình</button>
                            <button class="btn-royal-sm-outline" onclick="window.switchTab('tree', '${m.id}')">🌲 Định Vị Cây</button>
                        </div>
                    </div>
                `).join("");
            };

            searchBtn.addEventListener("click", doSearch);
            searchInput.addEventListener("input", doSearch);
            searchInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") doSearch();
            });
        }

        // Sự kiện Tính Vai Vế
        const calcBtn = document.getElementById("btn-calc-kinship");
        if (calcBtn) {
            calcBtn.addEventListener("click", () => {
                const idA = document.getElementById("kinship-person-a").value;
                const idB = document.getElementById("kinship-person-b").value;
                const result = window.familyDataManager.calculateKinship(idA, idB);
                const resBox = document.getElementById("kinship-result-box");
                if (!resBox) return;

                resBox.style.display = "block";

                if (result.error) {
                    resBox.innerHTML = `<div class="alert alert-warning">${result.error}</div>`;
                    return;
                }

                resBox.innerHTML = `
                    <div class="kinship-card-gold">
                        <h3 class="kinship-res-title">KẾT QUẢ XÁC ĐỊNH QUAN HỆ HUYẾT THỐNG</h3>
                        
                        <div class="kinship-lca-block">
                            <div class="lca-label">Tổ Phụ Chung Gần Nhất (LCA):</div>
                            <div class="lca-name">🏛️ Cụ ${result.lca ? result.lca.ho_ten + ' (Đời ' + result.lca.doi_thu + ' - ' + result.lca.chi_nhanh + ')' : 'Chưa xác định'}</div>
                        </div>

                        <div class="kinship-dialogue-grid">
                            <div class="kinship-dialogue-col">
                                <div class="dia-label font-bold text-gold">${result.personA.ho_ten} gọi ${result.personB.ho_ten} là:</div>
                                <div class="dia-badge-big">${result.addressAtoB}</div>
                            </div>

                            <div class="kinship-dialogue-col">
                                <div class="dia-label font-bold text-gold">${result.personB.ho_ten} gọi ${result.personA.ho_ten} là:</div>
                                <div class="dia-badge-big">${result.addressBtoA}</div>
                            </div>
                        </div>

                        <div class="kinship-explain">
                            <strong>Giải thích vai vế theo gia phong:</strong> ${result.relationship}
                        </div>
                    </div>
                `;
            });
        }
    }
}

window.GoldenSearchTab = GoldenSearchTab;
