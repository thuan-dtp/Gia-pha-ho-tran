/**
 * TAB 3: CÂY GIA ĐÌNH VỢ - CHỒNG (FAMILY CHART ENGINE)
 * Hiển thị song song Vợ/Chồng, Thân phụ mẫu, Huynh đệ tỷ muội và Hậu duệ.
 * Nhấp vào bất kỳ ai để chọn làm Tâm điểm (Focus Person).
 */

class FamilyChart {
    constructor(containerId, detailPanelId) {
        this.container = document.getElementById(containerId);
        this.detailPanel = document.getElementById(detailPanelId);
        this.currentFocusId = null;
    }

    init(focusId = null) {
        if (!window.familyDataManager) return;

        // Nếu chưa chỉ định ID, lấy người đầu tiên (Cụ Khởi Tổ) hoặc người đời 2
        if (!focusId) {
            const members = window.familyDataManager.getAllMembers();
            const root = members.find(m => !m.parent_id) || members[0];
            this.currentFocusId = root ? root.id : null;
        } else {
            this.currentFocusId = focusId;
        }

        this.render();
    }

    setFocus(id) {
        this.currentFocusId = id;
        this.render();
    }

    render() {
        if (!this.container || !this.currentFocusId) return;

        const dm = window.familyDataManager;
        const focusPerson = dm.getMemberById(this.currentFocusId);
        if (!focusPerson) return;

        // 1. Tìm Cha Mẹ
        const parent = focusPerson.parent_id ? dm.getMemberById(focusPerson.parent_id) : null;

        // 2. Tìm Anh Chị Em ruột (cùng parent_id với focusPerson)
        const siblings = parent 
            ? dm.getAllMembers().filter(m => m.parent_id === parent.id && m.id !== focusPerson.id)
            : [];

        // 3. Tìm Con Cái (các thành viên có parent_id = focusPerson.id)
        const children = dm.getAllMembers().filter(m => m.parent_id === focusPerson.id);

        // 4. Render HTML cây quan hệ
        this.container.innerHTML = `
            <div class="family-graph-wrap">
                <!-- TẦNG 1: THÂN PHỤ MẪU (CHA & MẸ) -->
                <div class="fam-row fam-parents-row">
                    <div class="fam-section-label">BẬC THÂN SINH (ĐỜI ${(focusPerson.doi_thu || 1) - 1 > 0 ? (focusPerson.doi_thu || 1) - 1 : 'TIỀN KHỞI'})</div>
                    <div class="fam-cards-group">
                        ${parent ? this.renderMemberCard(parent, "parent") : `<div class="fam-card-placeholder">Cụ Khởi Tổ (Tiền hiền khai khẩn)</div>`}
                    </div>
                </div>

                <!-- ĐƯỜNG KẾT NỐI DỌC -->
                <div class="fam-connector-v"></div>

                <!-- TẦNG 2: ĐƯƠNG ĐẠI (ANH EM - BẢN THÂN - PHỐI NGẪU) -->
                <div class="fam-row fam-focus-row">
                    <!-- ANH CHỊ EM -->
                    ${siblings.length > 0 ? `
                        <div class="fam-siblings-col">
                            <div class="fam-section-label-sub">Huynh Đệ Tỷ Muội</div>
                            <div class="fam-siblings-list">
                                ${siblings.map(s => this.renderMemberCard(s, "sibling")).join("")}
                            </div>
                        </div>
                    ` : ''}

                    <!-- TRỌNG TÂM: BẢN THÂN VÀ PHỐI NGẪU (VỢ/CHỒNG) -->
                    <div class="fam-couple-block">
                        <div class="fam-section-label">ĐƯƠNG ĐẠI TÂM ĐIỂM (ĐỜI ${focusPerson.doi_thu})</div>
                        <div class="fam-couple-inner">
                            ${this.renderMemberCard(focusPerson, "focus", true)}
                            
                            <!-- BIỂU TƯỢNG HÔN PHỐI LOAN PHỤNG -->
                            <div class="couple-knot">
                                <span class="knot-icon">💍</span>
                                <span class="knot-text">Lương Duyên</span>
                            </div>

                            <!-- THẺ PHỐI NGẪU (VỢ / CHỒNG) -->
                            <div class="fam-card card-spouse">
                                <div class="card-tag">Phối Ngẫu (Chính thất / Kế thất)</div>
                                <div class="card-avatar">🧕</div>
                                <div class="card-name">${focusPerson.vo_chong || "Chưa ghi nhận thông tin"}</div>
                                <div class="card-role">${focusPerson.gioi_tinh === "Nam" ? "Nhụ nhân / Hiền thê" : "Phu quân"}</div>
                                <div class="card-dates">Đồng cam cộng khổ</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ĐƯỜNG KẾT NỐI TỚI HẬU DUỆ -->
                <div class="fam-connector-v"></div>

                <!-- TẦNG 3: HẬU DUỆ (CON CÁI) -->
                <div class="fam-row fam-children-row">
                    <div class="fam-section-label">HẬU DUỆ NỐI DÕNG (ĐỜI ${(focusPerson.doi_thu || 1) + 1}) - Tổng cộng: ${children.length} người</div>
                    <div class="fam-children-list">
                        ${children.length > 0 
                            ? children.map(c => this.renderMemberCard(c, "child")).join("")
                            : `<div class="fam-card-placeholder">Chưa có thông tin con cháu trong nhánh này.</div>`
                        }
                    </div>
                </div>
            </div>
        `;

        // 5. Cập nhật Panel thông tin chi tiết bên cạnh
        this.renderDetailPanel(focusPerson);

        // Gán sự kiện click vào các thẻ
        const clickableCards = this.container.querySelectorAll(".fam-clickable");
        clickableCards.forEach(card => {
            card.addEventListener("click", () => {
                const id = card.getAttribute("data-id");
                if (id) this.setFocus(id);
            });
        });
    }

    renderMemberCard(member, roleClass, isFocus = false) {
        const isDead = !member.con_song;
        const privacy = window.isPrivacyMode && member.con_song;
        const datesText = privacy 
            ? "● Còn tại thế" 
            : `${member.ngay_sinh || "—"} - ${isDead ? (member.ngay_mat_am ? 'Mất ' + member.ngay_mat_am : 'Đã khuất') : 'Còn tại thế'}`;

        return `
            <div class="fam-card fam-clickable ${roleClass} ${isFocus ? 'is-focus-card' : ''} ${member.gioi_tinh === 'Nữ' ? 'is-female' : 'is-male'}" data-id="${member.id}">
                ${isFocus ? '<div class="focus-crown">👑 TÂM ĐIỂM</div>' : ''}
                <div class="card-tag">Đời ${member.doi_thu} • ${member.chi_nhanh}</div>
                <div class="card-avatar">${member.gioi_tinh === 'Nữ' ? '👩' : '👨'}</div>
                <div class="card-name">${member.ho_ten}</div>
                <div class="card-dates">${datesText}</div>
                <div class="card-role">${member.danh_hieu || member.ten_hieu || "Thành viên"}</div>
                ${!isFocus ? '<div class="card-hint">Bấm để đặt làm tâm điểm ➔</div>' : ''}
            </div>
        `;
    }

    renderDetailPanel(member) {
        if (!this.detailPanel) return;

        const isDead = !member.con_song;
        const privacy = window.isPrivacyMode && member.con_song;

        this.detailPanel.innerHTML = `
            <div class="biography-stele">
                <div class="stele-header">
                    <div class="stele-ornament">❖ ❖ ❖</div>
                    <div class="stele-title">BIA KÝ THÀNH VIÊN</div>
                    <div class="stele-sub">Dòng họ Trần Vạn Thế Lưu Phương</div>
                </div>

                <div class="stele-portrait-wrap">
                    <div class="stele-avatar-frame">
                        <div class="stele-avatar-icon">${member.gioi_tinh === 'Nữ' ? '👵' : '👴'}</div>
                    </div>
                    <div class="stele-name-block">
                        <div class="stele-name">${member.ho_ten}</div>
                        <div class="stele-alias">${member.ten_hieu || "Chưa có danh xưng tự hiệu"}</div>
                        <div class="stele-status ${member.con_song ? 'status-alive' : 'status-deceased'}">
                            ${member.con_song ? '● Đang sinh thời (Còn tại thế)' : '✦ Đã về cõi vĩnh hằng'}
                        </div>
                    </div>
                </div>

                <div class="stele-content-table">
                    <div class="stele-row">
                        <div class="stele-label">Thế hệ / Chi phái:</div>
                        <div class="stele-value font-bold text-gold">Đời thứ ${member.doi_thu} • ${member.chi_nhanh}</div>
                    </div>
                    <div class="stele-row">
                        <div class="stele-label">Phẩm hàm / Danh hiệu:</div>
                        <div class="stele-value">${member.danh_hieu || "Chưa ghi nhận"}</div>
                    </div>
                    <div class="stele-row">
                        <div class="stele-label">Ngày sinh:</div>
                        <div class="stele-value">${privacy ? "Được bảo mật riêng tư" : (member.ngay_sinh || "Chưa rõ")}</div>
                    </div>
                    ${!member.con_song ? `
                        <div class="stele-row">
                            <div class="stele-label">Ngày kỵ nhật (Giỗ Âm):</div>
                            <div class="stele-value text-red font-bold">${member.ngay_mat_am || "Chưa rõ"}</div>
                        </div>
                        <div class="stele-row">
                            <div class="stele-label">Ngày mất Dương lịch:</div>
                            <div class="stele-value">${member.ngay_mat_duong || "Chưa rõ"}</div>
                        </div>
                    ` : ''}
                    <div class="stele-row">
                        <div class="stele-label">Phu nhân / Phu quân:</div>
                        <div class="stele-value">${member.vo_chong || "Chưa ghi nhận"}</div>
                    </div>
                    <div class="stele-row">
                        <div class="stele-label">Mộ phần / Nơi an nghỉ:</div>
                        <div class="stele-value">
                            ${member.mo_phan || "Còn sinh thời"}
                            ${(!member.con_song && member.mo_phan && !member.mo_phan.includes("Còn sinh thời") && !member.mo_phan.toLowerCase().includes("chưa rõ") && !member.mo_phan.toLowerCase().includes("thất lạc")) ? `
                                <button class="btn-gps-inline" onclick="window.openGpsMap('${(member.mo_phan || '').replace(/'/g, "\\'")}', '${member.ho_ten.replace(/'/g, "\\'")}')" title="Chỉ đường Google Maps tới nơi an nghỉ">
                                    📍 Chỉ đường bản đồ
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- CỤM ĐIỀU KHIỂN GIỌNG ĐỌC TIẾNG VIỆT CHO TIỂU SỬ -->
                <div class="member-tts-panel" id="fam-tts-panel-${member.id}">
                    <div class="member-tts-bar">
                        <div class="member-tts-actions">
                            <button type="button" class="btn-tts-ctrl btn-tts-play" onclick="window.ttsSpeakMember('${member.id}')" title="Phát giọng đọc tiếng Việt toàn bộ tiểu sử">
                                🔊 Nghe Tiểu Sử
                            </button>
                            <button type="button" class="btn-tts-ctrl btn-tts-pause" onclick="window.ttsPause()" title="Tạm dừng giọng đọc">
                                ⏸️ Tạm Dừng
                            </button>
                            <button type="button" class="btn-tts-ctrl btn-tts-stop" onclick="window.ttsStop()" title="Dừng đọc hẳn">
                                ⏹️ Dừng Hẳn
                            </button>
                        </div>
                        <div class="member-tts-speed">
                            <span class="speed-label">Tốc độ:</span>
                            <button type="button" class="btn-tts-speed ${window.ttsAssistant && window.ttsAssistant.rate <= 0.92 ? 'active' : ''}" onclick="window.ttsSetRate(0.85, this)" title="Đọc chậm (0.85x)">🐢 Chậm</button>
                            <button type="button" class="btn-tts-speed ${!window.ttsAssistant || (window.ttsAssistant.rate > 0.92 && window.ttsAssistant.rate < 1.1) ? 'active' : ''}" onclick="window.ttsSetRate(1.0, this)" title="Đọc vừa chuẩn tự nhiên (1.0x)">🚶 Vừa</button>
                            <button type="button" class="btn-tts-speed ${window.ttsAssistant && window.ttsAssistant.rate >= 1.1 ? 'active' : ''}" onclick="window.ttsSetRate(1.2, this)" title="Đọc nhanh (1.2x)">⚡ Nhanh</button>
                        </div>
                    </div>
                </div>

                <!-- TIỂU SỬ & HÀNH TRẠNG -->
                <div class="stele-section">
                    <div class="stele-sec-title">📜 TIỂU SỬ & HÀNH TRẠNG</div>
                    <div class="stele-sec-body">${member.tieu_su || "Chưa có văn bia tiểu sử chi tiết."}</div>
                </div>

                <!-- CÔNG ĐỨC & VINH DANH -->
                <div class="stele-section">
                    <div class="stele-sec-title">⭐ CÔNG ĐỨC VỚI HỌ TỘC</div>
                    <div class="stele-sec-body">${member.cong_duc || "Gìn giữ nếp nhà, phụng thờ tổ tiên chu đáo."}</div>
                </div>

                <!-- HÀNH ĐỘNG -->
                <div class="stele-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">
                    <button class="btn-royal" onclick="window.switchTab('book', '${member.id}')">📖 Xem trong Sách Gia Phả</button>
                    <button class="btn-royal-outline" onclick="window.switchTab('tree', '${member.id}')">🌲 Định vị trên Phả Đồ</button>
                    <button class="btn-quick-edit-trigger" onclick="window.openQuickEditAuth('${member.id}')">✏️ Sửa / Bổ Sung</button>
                </div>
            </div>
        `;
    }
}

window.FamilyChart = FamilyChart;
