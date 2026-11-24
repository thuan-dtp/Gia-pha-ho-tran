/**
 * TAB 1: SÁCH GIA PHẢ CỔ TRUYỀN (TRADITIONAL BOOK VIEW)
 * Trình bày dạng văn thư phả hệ theo từng đời, có mục lục điều hướng nhanh,
 * bia ký, công đức, mộ phần và tiểu sử chi tiết.
 */

class BookView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.selectedBranch = "Tất cả";
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    setFilter(branch) {
        this.selectedBranch = branch;
        this.render();
    }

    render() {
        if (!window.familyDataManager) return;

        const dm = window.familyDataManager;
        const groups = dm.getMembersGroupedByGeneration(this.selectedBranch);
        const info = (window.DATA_TRUC_CHINH && window.DATA_TRUC_CHINH.info) || {};

        const genNumbers = Object.keys(groups).map(k => parseInt(k, 10)).sort((a, b) => a - b);

        this.container.innerHTML = `
            <div class="book-layout">
                <!-- MỤC LỤC BÊN CẠNH (SIDEBAR TOC) -->
                <aside class="book-toc">
                    <div class="toc-header">
                        <span class="toc-icon">📜</span>
                        <span class="toc-title">MỤC LỤC PHẢ KÝ</span>
                    </div>

                    <!-- Ô TÌM NHANH THÀNH VIÊN TRONG SÁCH GIA PHẢ -->
                    <div style="padding: 10px 12px; border-bottom: 1px dashed var(--gold); background: rgba(212, 175, 55, 0.08);">
                        <input type="text" id="book-quick-filter" placeholder="🔍 Tìm tên cụ / người trong sách..." style="width: 100%; border: 1.5px solid var(--gold); border-radius: 4px; padding: 7px 10px; font-size: 13px; background: var(--paper-bg); color: var(--text-dark); outline: none; font-family: inherit;" />
                    </div>

                    <ul class="toc-list">
                        <li class="toc-item"><a href="#book-preface">✦ Lời Tựa Đại Tộc</a></li>
                        <li class="toc-item"><a href="#book-langnam-preface">🌾 Chi Họ Trần Lãng Nam</a></li>
                        ${genNumbers.map(gen => `
                            <li class="toc-item">
                                <a href="#gen-sec-${gen}">
                                    ❖ Thế Hệ Đời Thứ ${this.toRoman(gen)} (${groups[gen].length} Vị)
                                </a>
                            </li>
                        `).join("")}
                        <li class="toc-item"><a href="#book-missing-history">🔍 Sử Liệu Còn Khuyết &amp; Đối Chiếu</a></li>
                        <li class="toc-item"><a href="#book-sources">📜 Nguồn Sử Liệu Tham Chiếu</a></li>
                    </ul>
                    <div class="toc-footer">
                        <button class="btn-royal-outline w-100" onclick="window.print()">🖨️ In Cuốn Sách Này</button>
                    </div>
                </aside>

                <!-- NỘI DUNG TRANG SÁCH PHẢ -->
                <main class="book-pages-wrapper">
                    <!-- TRANG BÌA & LỜI TỰA ĐẠI TỘC -->
                    <article class="book-page book-cover" id="book-preface">
                        <div class="book-cover-border">
                            <div class="cover-ornament-top">❖ TRẦN TỘC VẠN THẾ LƯU PHƯƠNG ❖</div>
                            <h1 class="cover-title">GIA PHẢ ĐẠI TỘC HỌ TRẦN VIỆT NAM</h1>
                            <div class="cover-subtitle">Tinh Hoa Truyền Thừa & Kết Nối Các Chi Phái Toàn Quốc</div>
                            
                            <!-- NÚT TRỢ LÝ GIỌNG ĐỌC LỜI TỰA ĐẠI TỘC -->
                            <div style="text-align: center; margin: 12px 0 16px;">
                                <button class="btn-tts-listen" onclick="window.ttsSpeakPreface('great')" title="Nghe đọc toàn bộ Lời Tựa Đại Tộc bằng giọng tiếng Việt chuẩn">
                                    🔊 Nghe Đọc Phả Ký Đại Tộc
                                </button>
                            </div>

                            <div class="cover-couplet">
                                <p class="couplet-line">"Tổ đức lưu quang vạn đại thịnh"</p>
                                <p class="couplet-line">"Tông công đống thảo cửu trùng xuân"</p>
                            </div>

                            <div class="cover-intro">
                                <p><strong>Khởi nguyên:</strong> ${info.nguon_goc || "Hào khí Đông A, trăm năm thịnh vượng."}</p>
                                <p><strong>Từ đường linh từ:</strong> ${info.nha_tho_to || "Từ đường họ Trần"} <button class="btn-gps-inline" onclick="window.openGpsMap('Đền Trần, Phường Lộc Vượng, Thành phố Nam Định', 'Đền Trần Thiên Trường')" title="Chỉ đường Google Maps tới Đền Trần">📍 Chỉ đường bản đồ</button></p>
                                <p><strong>Ngày Kỵ Tổ hằng niên:</strong> ${info.ngay_gio_to || "18 tháng Giêng âm lịch"}</p>
                            </div>

                            <!-- ĐÓNG TRIỆN LẠC KHOẢN TÁC GIẢ DUY NHẤT (QUY CÁCH CỔ THƯ) -->
                            <div class="colophon-signature-block">
                                <div class="colophon-text-side">
                                    <div class="colophon-inscription">
                                        Hậu duệ Đời 23 — <strong>Trần Văn Thuần</strong> kính biên &amp; số hóa lưu truyền hậu thế (Năm Bính Ngọ 2026)
                                    </div>
                                </div>
                                <div class="colophon-seal-side" title="Ấn triện: Trần Văn Thuần">
                                    <div class="ancient-red-seal-wrap">
                                        <svg class="ancient-red-seal-svg" width="74" height="74" viewBox="0 0 74 74" xmlns="http://www.w3.org/2000/svg">
                                            <!-- Nền đỏ chu sa thấm giấy nhẹ -->
                                            <rect x="2" y="2" width="70" height="70" rx="4" ry="4" fill="rgba(185, 28, 28, 0.06)" />
                                            <!-- Viền ngoài dày 2.5px màu đỏ chu sa -->
                                            <rect x="2" y="2" width="70" height="70" rx="4" ry="4" fill="none" stroke="#b91c1c" stroke-width="2.5" />
                                            <!-- Viền trong mảnh 1px màu đỏ chu sa (cách viền ngoài 2.5px) -->
                                            <rect x="7" y="7" width="60" height="60" rx="2" ry="2" fill="none" stroke="#b91c1c" stroke-width="1" stroke-opacity="0.85" />
                                            <!-- Dòng trên: TRẦN VĂN (cách viền trong >8px, lọt thỏm chính giữa) -->
                                            <text x="37" y="31" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', 'Noto Serif', serif" font-weight="800" font-size="9.5" fill="#b91c1c" letter-spacing="0.5">TRẦN VĂN</text>
                                            <!-- Dòng dưới: THUẦN (cách viền trong >8px, lọt thỏm chính giữa) -->
                                            <text x="37" y="47" text-anchor="middle" font-family="'Cinzel', 'Times New Roman', 'Noto Serif', serif" font-weight="800" font-size="9.5" fill="#b91c1c" letter-spacing="0.5">THUẦN</text>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>

                    <!-- CHUYÊN MỤC: LỊCH SỬ & LỜI TỰA CHI HỌ TRẦN LÃNG NAM -->
                    <article class="book-page" id="book-langnam-preface" style="border: 2px solid var(--gold); background: var(--paper-card);">
                        <div class="gen-header">
                            <div class="gen-ribbon" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); border-color: #60a5fa;">
                                <span>🌾 CHI HỌ TRẦN LÃNG NAM (ĐỒNG THÁI, NINH CƯỜNG)</span>
                            </div>
                            <div class="gen-summary">Nhánh trực hệ nối liền 24 đời từ Thủy Tổ Trần Kinh • Cội nguồn Trực Cường, Trực Ninh, Nam Định</div>
                        </div>

                        <!-- NÚT TRỢ LÝ GIỌNG ĐỌC LỜI TỰA CHI LÃNG NAM -->
                        <div style="text-align: center; margin: 12px 0 14px;">
                            <button class="btn-tts-listen" onclick="window.ttsSpeakPreface('langnam')" title="Nghe đọc toàn bộ Phả Ký Chi Lãng Nam bằng giọng tiếng Việt chuẩn">
                                🔊 Nghe Đọc Phả Ký Chi Lãng Nam
                            </button>
                        </div>

                        <!-- CHỈ ĐƯỜNG GPS VỀ TỪ ĐƯỜNG CHI LÃNG NAM -->
                        <div style="background: rgba(212, 175, 55, 0.1); border: 1px dashed var(--gold); border-radius: 6px; padding: 10px 16px; margin: 12px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                            <span style="font-size: 13.5px; color: var(--text-dark);">
                                🏛️ <strong>Từ đường Chi Họ Trần Lãng Nam:</strong> Thôn Đồng Thái, Xã Ninh Cường, Huyện Trực Ninh, Nam Định
                            </span>
                            <button class="btn-gps-inline" onclick="window.openGpsMap('Từ đường họ Trần Đồng Thái, Ninh Cường, Trực Ninh, Nam Định', 'Từ đường Chi Lãng Nam')" title="Chỉ đường Google Maps về Từ đường Chi Họ Trần Lãng Nam">
                                📍 Chỉ đường bản đồ
                            </button>
                        </div>

                        <div style="text-align: center; margin: 16px 0;">
                            <div style="font-size: 18px; font-weight: bold; color: var(--primary-red); font-style: italic;">
                                "Hiếu kính dâng lên tông tổ — Điều lành tụ lại ở cháu, con"
                            </div>
                        </div>

                        <div style="font-size: 14.5px; line-height: 1.8; text-align: justify; margin-top: 14px;">
                            <h4 style="color: var(--primary-red); margin-bottom: 8px;">📜 Lời Tựa Về Đạo Hiếu & Mục Đích Lập Phả:</h4>
                            <p style="margin-bottom: 12px;">
                                Cây có cội mới trổ cành xanh lá, nước có nguồn mới biển rộng sông sâu. Người sinh ra ở đời nhờ phúc ấm của Tiên Tổ mà được vuông tròn hình vóc, học hành tấn tới, dựng nghiệp thành gia. Gia phả này lập nên nhằm mục đích phụng sự đạo hiếu, kết nối muôn đời con cháu cụ <strong>Chí Hòa (Tiền chi Trần Văn Hòa)</strong> và các thế hệ con cháu Chi Họ Trần Lãng Nam nhớ về nguồn cội, biết rõ vai vế tôn ty, giữ gìn giềng mối gia phong, tương thân tương ái.
                            </p>

                            <h4 style="color: var(--primary-red); margin-bottom: 8px;">🗺️ Lịch Sử Khai Khẩn Vùng Đất Lãng Nam:</h4>
                            <p style="margin-bottom: 12px;">
                                Cụ Quốc Hiển (con cụ Trần Trí, cháu nội An Sinh Vương Trần Liễu) vào năm Tân Dậu (1381) đã dời về Cồn Cả (xã Cát Thành, Trực Ninh) khai hoang lập ấp. Con cháu cụ đời đời cần lao quai đê lấn biển, tách từ làng Văn Lãng lập nên thôn <strong>Lãng Nam</strong> (nằm trong tổng Ninh Cường xưa, nay là thôn Đồng Thái, xã Ninh Cường, tỉnh Ninh Bình; nguyên là xã Trực Cường, Trực Ninh, Nam Định). Vùng đất bãi bồi ven sông phù sa trù phú, rực rỡ khí thiêng sông biển.
                            </p>

                            <div style="background: rgba(212, 175, 55, 0.12); border-left: 4px solid var(--gold); padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 16px 0;">
                                <h5 style="color: #92400e; font-size: 14px; margin-bottom: 6px;">📜 BÀI THƠ CỔ CỦA CỤ TỔ BÌNH HOÀN (Ngày 29/9 năm Kỷ Tỵ - 1629):</h5>
                                <div style="font-style: italic; color: #451a03; line-height: 1.9; font-size: 14.5px;">
                                    "Thôn Cường đất lịch quê ta<br/>
                                    Xung quanh lau sậy bao thành núi cao<br/>
                                    Gió đưa phảng phất dạt dào<br/>
                                    Dập dìu như thể khác nào tầng cao<br/>
                                    Gần xa thấp thoáng tựa hồ quân reo<br/>
                                    Đèn dầu lấp lánh cheo leo<br/>
                                    Nhìn sao Bắc đẩu, chiếu sông ngân hà<br/>
                                    Bầy cây với bãi phù sa<br/>
                                    Trùng trùng điệp điệp tiếng đà âm thanh."
                                </div>
                            </div>

                            <p style="font-style: italic; color: var(--text-muted); font-size: 13.5px; text-align: right; margin-top: 14px;">
                                — Trích Phả Ký Chi Họ Trần Lãng Nam (Đồng Thái, Ninh Cường) —
                            </p>
                        </div>
                    </article>

                    <!-- CÁC THẾ HỆ NỐI TIẾP -->
                    ${genNumbers.map(gen => this.renderGenerationSection(gen, groups[gen])).join("")}

                    <!-- CHUYÊN MỤC: SỬ LIỆU CÒN KHUYẾT & ĐIỂM CẦN ĐỐI CHIẾU BỒI ĐẮP -->
                    ${this.renderMissingHistorySection(this.selectedBranch)}

                    <!-- MỤC NGUỒN SỬ LIỆU THAM CHIẾU CHÍNH THỐNG -->
                    <article class="book-page book-sources-section" id="book-sources">
                        <div class="gen-header">
                            <div class="gen-ribbon">
                                <span>📚 NGUỒN SỬ LIỆU THAM CHIẾU CHÍNH THỐNG</span>
                            </div>
                            <div class="gen-summary">Cơ sở tư liệu lịch sử quốc gia thẩm định độ xác thực của Hệ thống Phả Hệ Họ Trần</div>
                        </div>

                        <div class="sources-content" style="background: rgba(255,255,255,0.6); border: 1.5px solid var(--gold); border-radius: 8px; padding: 24px; font-size: 14.5px; line-height: 1.8;">
                            <p style="margin-bottom: 14px;">Toàn bộ thế thứ, năm sinh, năm mất, thụy hiệu, phẩm hàm và công nghiệp hộ quốc của các bậc Tiền nhân và Hoàng đế triều Trần trong phả hệ này được khảo cứu, đối chiếu và tổng hợp nghiêm cẩn từ các bộ chính sử và văn bia cổ đã được Nhà nước và giới sử học công bố:</p>
                            
                            <ol style="margin-left: 24px; display: flex; flex-direction: column; gap: 10px;">
                                <li>
                                    <strong>Đại Việt Sử Ký Toàn Thư (Bản Kỷ Toàn Thư - Quyển V, VI, VII, VIII):</strong><br/>
                                    <em>Tác giả:</em> Quốc sử quán Đại Việt & Sử thần Ngô Sĩ Liên (hoàn thành năm 1479).<br/>
                                    <em>Nội dung khảo chứng:</em> Ghi chép chi tiết thế thứ từ Thủy Tổ Trần Kinh, Thái Tổ Trần Thừa đến các triều vua Trần Thái Tông, Thánh Tông, Nhân Tông, Anh Tông, Minh Tông... cùng toàn văn Hịch Tướng Sĩ và diễn biến 3 lần đại phá quân Nguyên Mông.
                                </li>
                                <li>
                                    <strong>Khâm Định Việt Sử Thông Giám Cương Mục (Chính Biên - Quyển V đến XII):</strong><br/>
                                    <em>Tác giả:</em> Quốc Sử Quán Triều Nguyễn (thời vua Tự Đức).<br/>
                                    <em>Nội dung khảo chứng:</em> Khảo đính niên biểu, đối chiếu các thuyết về quê quán Tức Mặc, Long Hưng, lăng tẩm và chức vị của vương thất họ Trần.
                                </li>
                                <li>
                                    <strong>Trần Triều Thế Phả Hành Trạng & Phả Điệp Đền Trần:</strong><br/>
                                    <em>Xuất xứ:</em> Bản chép tay lưu trữ tại Từ Đường Đền Trần - Chùa Tháp (Thiên Trường, Nam Định) và Ban liên lạc Họ Trần Việt Nam.<br/>
                                    <em>Nội dung khảo chứng:</em> Ghi chép ngày húy kỵ âm lịch, mộ phần, các chi cành An Sinh Vương, Chiêu Minh Đại Vương, Chiêu Văn Vương.
                                </li>
                                <li>
                                    <strong>Việt Sử Tiêu Án:</strong><br/>
                                    <em>Tác giả:</em> Danh sĩ Ngô Thời Sĩ (thế kỷ XVIII). Luận bàn sâu sắc về đạo trị quốc khoan dung, chế độ Thượng Hoàng truyền ngôi và tài đức của Quốc Công Tiết Chế Hưng Đạo Đại Vương.
                                </li>
                                <li>
                                    <strong>Hệ Thống Văn Bia Cổ & Khảo Cổ Học:</strong><br/>
                                    Văn bia tại Đền Kiếp Bạc (Chí Linh, Hải Dương), Văn bia Tháp Huệ Quang (Chùa Hoa Yên, non thiêng Yên Tử), Văn bia lăng mộ các vua Trần tại Tam Đường (Hưng Hà, Thái Bình) và An Sinh (Đông Triều, Quảng Ninh).
                                </li>
                                <li>
                                    <strong>Di Sản Thi Ca & Phật Học Thời Trần:</strong><br/>
                                    Bộ tác phẩm <em>Khóa Hư Lục</em> (Trần Thái Tông), <em>Cư Trần Lạc Đạo Phú</em> (Trần Nhân Tông), <em>Tuệ Trung Thượng Sĩ Ngữ Lục</em> (Trần Tung), <em>Băng Hồ Ngọc Lập Tập</em> (Trần Nguyên Đán).
                                </li>
                            </ol>

                            <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--gold); font-style: italic; color: var(--gold-dark); text-align: center; font-weight: bold;">
                                "Uống nước nhớ nguồn - Chim có tổ người có tông - Ngàn năm rạng rỡ dòng dõi Rồng Tiên"
                            </div>
                        </div>
                    </article>
                </main>
            </div>
        `;

        // Gắn sự kiện tìm nhanh trực tiếp trong Sách Gia Phả
        this.attachBookQuickFilter();
    }

    attachBookQuickFilter() {
        const filterInput = document.getElementById("book-quick-filter");
        if (!filterInput || !window.familyDataManager) return;

        const dm = window.familyDataManager;
        filterInput.addEventListener("input", (e) => {
            const rawVal = e.target.value.trim();
            const q = dm.removeVietnameseTones(rawVal);
            const entries = this.container.querySelectorAll(".member-entry");
            const genSections = this.container.querySelectorAll(".gen-section");

            if (!q) {
                entries.forEach(el => el.style.display = "");
                genSections.forEach(sec => sec.style.display = "");
                return;
            }

            let firstMatch = null;
            genSections.forEach(sec => {
                let hasVisible = false;
                const secEntries = sec.querySelectorAll(".member-entry");
                secEntries.forEach(entry => {
                    const nameEl = entry.querySelector(".entry-name");
                    const aliasEl = entry.querySelector(".entry-alias");
                    const nameText = nameEl ? dm.removeVietnameseTones(nameEl.innerText) : "";
                    const aliasText = aliasEl ? dm.removeVietnameseTones(aliasEl.innerText) : "";

                    if (nameText.includes(q) || aliasText.includes(q)) {
                        entry.style.display = "";
                        hasVisible = true;
                        if (!firstMatch) firstMatch = entry;
                    } else {
                        entry.style.display = "none";
                    }
                });
                sec.style.display = hasVisible ? "" : "none";
            });

            if (firstMatch) {
                firstMatch.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });
    }

    renderGenerationSection(gen, members) {
        return `
            <section class="book-page gen-section" id="gen-sec-${gen}">
                <div class="gen-header">
                    <div class="gen-ribbon">
                        <span class="gen-roman">THẾ HỆ ĐỜI THỨ ${this.toRoman(gen)}</span>
                    </div>
                    <div class="gen-summary">Gồm ${members.length} vị tiền nhân & hậu duệ nối tiếp phụng dưỡng gia phong</div>
                </div>

                <div class="gen-members-list">
                    ${members.map(m => this.renderMemberArticle(m)).join("")}
                </div>
            </section>
        `;
    }

    renderMemberArticle(m) {
        const isDead = !m.con_song;
        const privacy = window.isPrivacyMode && m.con_song;

        return `
            <article class="member-entry ${m.con_song ? 'entry-alive' : 'entry-deceased'}" id="member-entry-${m.id}">
                <div class="entry-header">
                    <div class="entry-title-wrap">
                        <span class="entry-badge">Đời ${m.doi_thu} • ${m.chi_nhanh}</span>
                        <h3 class="entry-name">${m.ho_ten}</h3>
                        ${m.ten_hieu ? `<span class="entry-alias">(${m.ten_hieu})</span>` : ''}
                    </div>
                    <div class="entry-status-badge ${m.con_song ? 'badge-alive' : 'badge-deceased'}">
                        ${m.con_song ? '● Còn tại thế' : '✦ Đã quy tiên'}
                    </div>
                </div>

                <div class="entry-grid">
                    <div class="entry-meta">
                        <div class="meta-row"><strong>Giới tính:</strong> ${m.gioi_tinh}</div>
                        <div class="meta-row"><strong>Năm sinh:</strong> ${privacy ? 'Bảo mật riêng tư' : (m.ngay_sinh || 'Chưa rõ')}</div>
                        ${!m.con_song ? `
                            <div class="meta-row text-red"><strong>Ngày giỗ (Âm lịch):</strong> ${m.ngay_mat_am || 'Chưa rõ'}</div>
                            <div class="meta-row"><strong>Ngày mất (Dương lịch):</strong> ${m.ngay_mat_duong || 'Chưa rõ'}</div>
                        ` : ''}
                        <div class="meta-row"><strong>Phối ngẫu:</strong> ${m.vo_chong || 'Chưa ghi nhận'}</div>
                        <div class="meta-row">
                            <strong>Mộ phần / Nơi an nghỉ:</strong> ${m.mo_phan || 'Còn sinh thời'}
                            ${(!m.con_song && m.mo_phan && !m.mo_phan.includes("Còn sinh thời") && !m.mo_phan.toLowerCase().includes("chưa rõ") && !m.mo_phan.toLowerCase().includes("thất lạc")) ? `
                                <button class="btn-gps-inline" onclick="window.openGpsMap('${(m.mo_phan || '').replace(/'/g, "\\'")}', '${m.ho_ten.replace(/'/g, "\\'")}')" title="Mở chỉ đường Google Maps tới nơi an nghỉ">
                                    📍 Chỉ đường bản đồ
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="entry-biography">
                        ${m.danh_hieu ? `<div class="entry-honor">🏅 <strong>Phẩm hàm / Danh vị:</strong> ${m.danh_hieu}</div>` : ''}
                        <div class="entry-text">
                            <strong>Tiểu sử & Sự nghiệp:</strong><br/>
                            ${m.tieu_su || 'Đức độ hiền hòa, trọn đạo làm con, giữ gìn nền nếp gia môn.'}
                        </div>
                        ${m.cong_duc ? `
                            <div class="entry-merit">
                                <strong>⭐ Công đức với dòng họ & quê hương:</strong><br/>
                                ${m.cong_duc}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="entry-actions" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                    <button class="btn-royal-sm" onclick="window.switchTab('family', '${m.id}')">👨‍👩‍👧‍👦 Xem Cây Gia Đình Vợ Chồng</button>
                    <button class="btn-royal-sm-outline" onclick="window.switchTab('tree', '${m.id}')">🌲 Xem Trên Phả Đồ</button>
                    <button class="btn-royal-sm-tts" onclick="window.ttsSpeakMember('${m.id}')" title="Nghe giọng đọc tiếng Việt tiểu sử của vị tiền nhân này">🔊 Nghe Đọc Tiểu Sử</button>
                    <button class="btn-quick-edit-trigger" onclick="window.openQuickEditAuth('${m.id}')">✏️ Sửa / Bổ Sung</button>
                </div>
            </article>
        `;
    }

    renderMissingHistorySection(branchFilter) {
        if (!window.familyDataManager) return "";
        const allMembers = window.familyDataManager.getAllMembers();
        const filtered = branchFilter === "Tất cả" 
            ? allMembers 
            : allMembers.filter(m => m.chi_nhanh && m.chi_nhanh.includes(branchFilter));

        // Lọc các vị đã khuất (!m.con_song) khuyết thông tin
        const missingList = filtered.filter(m => {
            if (m.con_song) return false;
            const lackBirth = !m.ngay_sinh || m.ngay_sinh === "Chưa rõ" || m.ngay_sinh === "—";
            const lackDeath = !m.ngay_mat_am || m.ngay_mat_am === "Chưa rõ";
            const lackGrave = !m.mo_phan || m.mo_phan.toLowerCase().includes("chưa rõ") || m.mo_phan.toLowerCase().includes("thất lạc") || m.mo_phan.toLowerCase().includes("chưa xác định");
            return lackBirth || lackDeath || lackGrave;
        });

        const countLackBirth = missingList.filter(m => !m.ngay_sinh || m.ngay_sinh === "Chưa rõ" || m.ngay_sinh === "—").length;
        const countLackDeath = missingList.filter(m => !m.ngay_mat_am || m.ngay_mat_am === "Chưa rõ").length;
        const countLackGrave = missingList.filter(m => !m.mo_phan || m.mo_phan.toLowerCase().includes("chưa rõ") || m.mo_phan.toLowerCase().includes("thất lạc")).length;

        return `
            <article class="book-page missing-history-card" id="book-missing-history">
                <div class="gen-header">
                    <div class="gen-ribbon" style="background: linear-gradient(135deg, #78350f 0%, #b45309 100%); border-color: #f59e0b;">
                        <span>🔍 SỬ LIỆU CÒN KHUYẾT &amp; ĐIỂM CẦN ĐỐI CHIẾU</span>
                    </div>
                    <div class="gen-summary">Tổng hợp các bậc tiền nhân còn thiếu năm sinh, ngày kỵ giỗ hoặc mộ phần để con cháu cùng bồi đắp</div>
                </div>

                <div style="font-size: 14.5px; line-height: 1.8; margin-top: 14px; text-align: justify;">
                    <p>
                        Cổ nhân từng dạy: <em>"Phả hệ lập nên vì lòng hiếu kính, nhưng trải qua bao biến thiên dâu bể và binh lửa thời gian, không tránh khỏi những chỗ còn khuyết thiếu"</em>. Dưới đây là danh sách được hệ thống tự động rà soát, ghi nhận những điểm sử liệu cần được các bậc cao niên, các chi phái và thế hệ con cháu tiếp tục sưu tầm, cung cấp tư liệu chuẩn xác để phụng sự đạo hiếu vẹn toàn.
                    </p>

                    <div class="missing-summary-stats">
                        <div class="stat-pill">Tổng số tiền nhân cần bồi đắp: <strong>${missingList.length} vị</strong></div>
                        <div class="stat-pill">Khuyết năm sinh: <strong>${countLackBirth} vị</strong></div>
                        <div class="stat-pill">Khuyết ngày kỵ giỗ: <strong>${countLackDeath} vị</strong></div>
                        <div class="stat-pill">Khuyết nơi an táng/mộ phần: <strong>${countLackGrave} vị</strong></div>
                    </div>

                    <div style="overflow-x: auto; margin-top: 16px;">
                        <table class="missing-table">
                            <thead>
                                <tr>
                                    <th style="width: 14%;">Đời Thứ</th>
                                    <th style="width: 26%;">Tiền Nhân / Danh Hiệu</th>
                                    <th style="width: 25%;">Chi Nhánh</th>
                                    <th style="width: 20%;">Sử Liệu Cần Bổ Sung</th>
                                    <th style="width: 15%; text-align: center;">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${missingList.map(m => {
                                    const lackB = !m.ngay_sinh || m.ngay_sinh === "Chưa rõ" || m.ngay_sinh === "—";
                                    const lackD = !m.ngay_mat_am || m.ngay_mat_am === "Chưa rõ";
                                    const lackG = !m.mo_phan || m.mo_phan.toLowerCase().includes("chưa rõ") || m.mo_phan.toLowerCase().includes("thất lạc");
                                    return `
                                        <tr>
                                            <td><span class="entry-badge" style="font-size: 11px;">Đời ${m.doi_thu}</span></td>
                                            <td>
                                                <strong style="color: var(--primary-red); font-size: 14px;">${m.ho_ten}</strong>
                                                ${m.ten_hieu ? `<br/><small style="color: var(--gold-dark);">(${m.ten_hieu})</small>` : ''}
                                            </td>
                                            <td style="font-size: 12.5px;">${m.chi_nhanh}</td>
                                            <td>
                                                ${lackB ? `<span class="badge-missing badge-missing-birth">📅 Năm sinh</span>` : ''}
                                                ${lackD ? `<span class="badge-missing badge-missing-death">🕯️ Ngày giỗ</span>` : ''}
                                                ${lackG ? `<span class="badge-missing badge-missing-grave">📍 Mộ phần</span>` : ''}
                                            </td>
                                            <td style="text-align: center;">
                                                <button class="btn-contribute-trigger" onclick="window.openContributeHistoryModal('${m.id}')" title="Gửi thông tin sử liệu bổ sung cho vị tiền nhân này">
                                                    ✍️ Bổ sung
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </article>
        `;
    }

    toRoman(num) {
        const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
        let str = '';
        for (let i of Object.keys(roman)) {
            let q = Math.floor(num / roman[i]);
            num -= q * roman[i];
            str += i.repeat(q);
        }
        return str || 'I';
    }
}

window.BookView = BookView;
