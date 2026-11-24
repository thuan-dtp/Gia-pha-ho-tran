/**
 * HỆ THỐNG PHÂN QUYỀN CÂY PHẢ HỆ 4 TẦNG & BẢO MẬT SERVERLESS (AUTH MANAGER)
 * - 100% Client-Side, Không phụ thuộc Server trả phí.
 * - Mã hóa một chiều SHA-256 bằng Web Crypto API tiêu chuẩn quốc tế.
 * - Phân quyền thừa kế theo cấu trúc cây phả hệ (Tổng Quản -> Trưởng Chi -> Trưởng Cành -> Người Ghi Chép).
 * - Cơ chế tự đặt lại PIN an toàn khi quên (Câu hỏi bí mật + Mã khôi phục 6 ký tự).
 * - Quản lý Audit Log (Nhật ký chỉnh sửa) bảo vệ tính trung thực của phả hệ.
 * - Tạo gói xuất/nhập đồng bộ qua Zalo cho các chi cành gửi về Tổng Quản.
 */

class FamilyAuthManager {
    constructor() {
        this.STORAGE_KEY = "admin_accounts_v5";
        this.AUDIT_LOG_KEY = "family_audit_logs_v5";
        this.currentSession = null;
        this.initialized = false;

        // Bảng tài khoản khởi tạo mặc định (Mã PIN gốc được băm SHA-256)
        this.DEFAULT_ACCOUNTS = [
            {
                id: "tong_quan",
                holder: "Trần Văn Thuần",
                role: "tong_quan",
                role_title: "Tổng Quản Đại Tộc Họ Trần Việt Nam",
                scope_branch: "Tất cả",
                parent_account_id: null,
                pin_hash: "80ecff018212393ad669c431f0433a41b18befdca86cbef97884c175c3b534d5", // T051981
                is_default_pin: true,
                security_question: "Quê gốc Thủy Tổ Họ Trần Việt Nam ở đâu?",
                security_answer_hash: null, // Sẽ thiết lập lần đầu
                recovery_code_hash: null,
                recovery_code_plain: "TR8888", // Mã khởi tạo cấp cứu
                created_at: "2026-01-01T00:00:00.000Z",
                status: "active"
            },
            {
                id: "truong_chi_langnam",
                holder: "Trưởng Chi Họ Trần Lãng Nam",
                role: "truong_chi",
                role_title: "Trưởng Chi Họ Trần Lãng Nam",
                scope_branch: "Chi Lãng Nam",
                parent_account_id: "tong_quan",
                pin_hash: "68487dc295052aa79c530e283ce698b8c6bb1b42ff0944252e1910dbecdc5425", // 333333
                is_default_pin: true,
                security_question: "Thủy Tổ Chi Họ Trần Lãng Nam là ai?",
                security_answer_hash: null,
                recovery_code_hash: null,
                recovery_code_plain: "LN3333",
                created_at: "2026-01-01T00:00:00.000Z",
                status: "active"
            },
            {
                id: "canh_long",
                holder: "Trưởng Cành Cụ Long",
                role: "truong_canh",
                role_title: "Trưởng Cành Cụ Long (Đời 21)",
                scope_branch: "Chi Cụ Chí Hòa - Nhánh ông Long",
                parent_account_id: "truong_chi_langnam",
                pin_hash: "bcb15f821479b4d5772bd0ca866c00ad5f926e3580720659cc80d39c9d09802a", // 111111
                is_default_pin: true,
                security_question: "Tên chi nhánh cụ tổ trực hệ của cành mình là gì?",
                security_answer_hash: null,
                recovery_code_hash: null,
                recovery_code_plain: "CL1111",
                created_at: "2026-01-01T00:00:00.000Z",
                status: "active"
            },
            {
                id: "canh_thinh",
                holder: "Trưởng Cành Cụ Thịnh",
                role: "truong_canh",
                role_title: "Trưởng Cành Cụ Thịnh (Đời 21)",
                scope_branch: "Chi Cụ Chí Hòa - Nhánh ông Thịnh",
                parent_account_id: "truong_chi_langnam",
                pin_hash: "4cc8f4d609b717356701c57a03e737e5ac8fe885da8c7163d3de47e01849c635", // 222222
                is_default_pin: true,
                security_question: "Tên người con trưởng đời 22 của cụ Thịnh là gì?",
                security_answer_hash: null,
                recovery_code_hash: null,
                recovery_code_plain: "CT2222",
                created_at: "2026-01-01T00:00:00.000Z",
                status: "active"
            },
            {
                id: "canh_vuong",
                holder: "Trưởng Cành Cụ Vượng",
                role: "truong_canh",
                role_title: "Trưởng Cành Cụ Vượng (Đời 21)",
                scope_branch: "Chi Cụ Chí Hòa - Nhánh ông Vượng",
                parent_account_id: "truong_chi_langnam",
                pin_hash: "0ac40d976122b3fee3d9319ca58d77586ef4252394a443426f815b73ae5ec9bd", // 369369
                is_default_pin: true,
                security_question: "Tên cụ thân sinh của đời 21 là ai?",
                security_answer_hash: null,
                recovery_code_hash: null,
                recovery_code_plain: "CV4444",
                created_at: "2026-01-01T00:00:00.000Z",
                status: "active"
            }
        ];
    }

    /**
     * Khởi tạo hệ thống tài khoản và nạp phiên làm việc nếu có
     */
    async init() {
        if (this.initialized) return;

        // Đảm bảo IndexedDB đã sẵn sàng
        if (window.IDBStorage) {
            await window.IDBStorage.open();
            let accounts = await window.IDBStorage.getSetting(this.STORAGE_KEY, null);
            if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
                // Khởi tạo lần đầu
                await window.IDBStorage.setSetting(this.STORAGE_KEY, this.DEFAULT_ACCOUNTS);
            } else {
                // TỰ ĐỘNG ĐỒNG BỘ MẬT KHẨU MỚI: T051981 (Tổng Quản) và 369369 (Nhánh Cụ Vượng)
                let needUpdate = false;
                const oldTqHash = "92925488b28ab12584ac8fcaa8a27a0f497b2c62940c8f4fbc8ef19ebc87c43e"; // 888888
                const newTqHash = "80ecff018212393ad669c431f0433a41b18befdca86cbef97884c175c3b534d5"; // T051981
                const tqAcc = accounts.find(a => a.id === "tong_quan");

                if (tqAcc && (tqAcc.pin_hash === oldTqHash || tqAcc.is_default_pin)) {
                    tqAcc.pin_hash = newTqHash;
                    tqAcc.is_default_pin = true;
                    needUpdate = true;
                }

                const oldVuongHash = "69f7f7a7f8bca9970fa6f9c0b8dad06901d3ef23fd599d3213aa5eee5621c3e3"; // 444444
                const newVuongHash = "0ac40d976122b3fee3d9319ca58d77586ef4252394a443426f815b73ae5ec9bd"; // 369369
                const vuongAcc = accounts.find(a => a.id === "canh_vuong");

                if (vuongAcc && (vuongAcc.pin_hash === oldVuongHash || vuongAcc.is_default_pin)) {
                    vuongAcc.pin_hash = newVuongHash;
                    vuongAcc.is_default_pin = true;
                    needUpdate = true;
                }

                if (needUpdate) {
                    await window.IDBStorage.setSetting(this.STORAGE_KEY, accounts);
                }
            }
        }

        // Khôi phục session từ sessionStorage nếu có
        const savedSession = sessionStorage.getItem("family_auth_session_v5");
        if (savedSession) {
            try {
                this.currentSession = JSON.parse(savedSession);
            } catch (e) {
                sessionStorage.removeItem("family_auth_session_v5");
                this.currentSession = null;
            }
        }

        this.initialized = true;
    }

    /* =================== CÁC HÀM MÃ HÓA SHA-256 TIÊU CHUẨN =================== */

    /**
     * Băm chuỗi bất kỳ bằng thuật toán SHA-256 (Web Crypto API)
     */
    async sha256(text) {
        if (text === null || text === undefined) return "";
        const str = String(text);
        const msgBuffer = new TextEncoder().encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
        return hashHex;
    }

    /**
     * Băm mã PIN (6 số)
     */
    async hashPin(pin) {
        const cleaned = String(pin || "").trim();
        return await this.sha256(cleaned);
    }

    /**
     * Chuẩn hóa và băm câu trả lời bí mật (bỏ dấu tiếng Việt, lowercase, trim)
     */
    async hashSecurityAnswer(answer) {
        if (!answer) return "";
        const normalized = this.normalizeTextForAuth(answer);
        return await this.sha256(normalized);
    }

    /**
     * Băm mã khôi phục 6 ký tự (uppercase, trim)
     */
    async hashRecoveryCode(code) {
        const cleaned = String(code || "").trim().toUpperCase();
        return await this.sha256(cleaned);
    }

    /**
     * Chuẩn hóa văn bản tiếng Việt để so sánh câu trả lời bí mật không phân biệt dấu/hoa/thường
     */
    normalizeTextForAuth(str) {
        if (!str) return "";
        let s = String(str).toLowerCase().trim();
        s = s.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        s = s.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        s = s.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        s = s.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        s = s.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        s = s.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        s = s.replace(/đ/g, "d");
        s = s.replace(/[^a-z0-9]/g, ""); // Chỉ giữ chữ và số liền nhau
        return s;
    }

    /* =================== QUẢN LÝ TÀI KHOẢN VÀ ĐĂNG NHẬP =================== */

    /**
     * Lấy danh sách toàn bộ tài khoản
     */
    async getAllAccounts() {
        await this.init();
        if (!window.IDBStorage) return this.DEFAULT_ACCOUNTS;
        const list = await window.IDBStorage.getSetting(this.STORAGE_KEY, this.DEFAULT_ACCOUNTS);
        return Array.isArray(list) ? list : this.DEFAULT_ACCOUNTS;
    }

    /**
     * Lưu danh sách tài khoản vào IDB
     */
    async saveAllAccounts(accounts) {
        await this.init();
        if (window.IDBStorage) {
            await window.IDBStorage.setSetting(this.STORAGE_KEY, accounts);
        }
    }

    /**
     * Tìm tài khoản theo ID
     */
    async getAccountById(accountId) {
        const accounts = await this.getAllAccounts();
        return accounts.find(a => a.id === accountId) || null;
    }

    /**
     * Đăng nhập bằng mã PIN
     * Trả về { success: true, account, mustSetup: boolean } hoặc { success: false, message: string }
     */
    async loginWithPin(pin) {
        await this.init();
        const pinHash = await this.hashPin(pin);
        const accounts = await this.getAllAccounts();

        const account = accounts.find(a => a.pin_hash === pinHash && a.status !== "revoked");
        if (account) {
            this.currentSession = {
                id: account.id,
                holder: account.holder,
                role: account.role,
                role_title: account.role_title,
                scope_branch: account.scope_branch,
                is_default_pin: !!account.is_default_pin,
                parent_account_id: account.parent_account_id,
                logged_in_at: new Date().toISOString()
            };

            sessionStorage.setItem("family_auth_session_v5", JSON.stringify(this.currentSession));

            // Ghi nhật ký đăng nhập
            await this.logAudit("LOGIN", `Đăng nhập thành công vào quyền ${account.role_title}`, account.holder);

            return {
                success: true,
                account: this.currentSession,
                mustSetup: false // Bỏ màn hình chặn thiết lập 3 lớp, vào thẳng làm việc ngay
            };
        } else {
            return {
                success: false,
                message: "Mật khẩu không chính xác hoặc quyền đã bị thu hồi!"
            };
        }
    }

    /**
     * Đổi mật khẩu cá nhân đơn giản (Chỉ cần Mật khẩu cũ + Mật khẩu mới)
     */
    async changePasswordSimple(accountId, oldPassword, newPassword) {
        await this.init();
        const accounts = await this.getAllAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) {
            return { success: false, message: "Không tìm thấy tài khoản để đổi mật khẩu." };
        }

        const oldHash = await this.hashPin(oldPassword);
        if (acc.pin_hash !== oldHash) {
            return { success: false, message: "Mật khẩu hiện tại không chính xác!" };
        }

        const cleanNew = String(newPassword || "").trim();
        if (!cleanNew || cleanNew.length < 6 || cleanNew.length > 16) {
            return { success: false, message: "Mật khẩu mới phải từ 6 đến 16 ký tự!" };
        }

        const newHash = await this.hashPin(cleanNew);
        acc.pin_hash = newHash;
        acc.is_default_pin = false;
        acc.updated_at = new Date().toISOString();

        await this.saveAllAccounts(accounts);
        await this.logAudit("CHANGE_PIN", `Đổi mật khẩu cá nhân thành công cho ${acc.holder}`, acc.holder);

        return { success: true, message: "Đã đổi mật khẩu cá nhân thành công!" };
    }

    /**
     * Đăng xuất phiên làm việc hiện tại
     */
    logout() {
        if (this.currentSession) {
            this.logAudit("LOGOUT", "Đăng xuất khỏi hệ thống", this.currentSession.holder);
        }
        this.currentSession = null;
        sessionStorage.removeItem("family_auth_session_v5");
    }

    /**
     * Lấy phiên đăng nhập hiện tại
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /* =================== THIẾT LẬP LẦN ĐẦU & TỰ ĐỔI PIN / KHÔI PHỤC =================== */

    /**
     * Sinh mã khôi phục 6 ký tự dễ nhớ nhưng ngẫu nhiên bảo mật cao (ví dụ: TR9482, LN7183)
     */
    generateRecoveryCode(prefix = "TR") {
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const digits = "23456789";
        let code = prefix.slice(0, 2).toUpperCase();
        for (let i = 0; i < 4; i++) {
            code += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return code;
    }

    /**
     * Thiết lập an toàn lần đầu hoặc cập nhật bảo mật cho tài khoản:
     * - Đặt mã PIN 6 số mới
     * - Đặt câu hỏi bí mật + câu trả lời
     * - Tự sinh hoặc nạp mã khôi phục 6 ký tự
     * Trả về mã khôi phục dạng chuỗi để người dùng tải thẻ lưu trữ
     */
    async setupAccountSecurity(accountId, newPin, question, answer, customRecoveryCode = null) {
        const accounts = await this.getAllAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) throw new Error("Không tìm thấy tài khoản để thiết lập");

        const pinHash = await this.hashPin(newPin);
        const answerHash = await this.hashSecurityAnswer(answer);
        
        const recoveryCode = customRecoveryCode || this.generateRecoveryCode(acc.role === "tong_quan" ? "TQ" : (acc.scope_branch.includes("Lãng Nam") ? "LN" : "TR"));
        const recoveryCodeHash = await this.hashRecoveryCode(recoveryCode);

        acc.pin_hash = pinHash;
        acc.is_default_pin = false;
        acc.security_question = question.trim();
        acc.security_answer_hash = answerHash;
        acc.recovery_code_hash = recoveryCodeHash;
        acc.updated_at = new Date().toISOString();

        await this.saveAllAccounts(accounts);

        // Cập nhật session hiện tại nếu trùng accountId
        if (this.currentSession && this.currentSession.id === accountId) {
            this.currentSession.is_default_pin = false;
            sessionStorage.setItem("family_auth_session_v5", JSON.stringify(this.currentSession));
        }

        await this.logAudit("SETUP_SECURITY", `Thiết lập mã PIN mới và phương thức khôi phục dự phòng`, acc.holder);

        return {
            success: true,
            recoveryCode: recoveryCode
        };
    }

    /**
     * Quên mã PIN: Xác minh bằng Câu hỏi bí mật và đặt lại PIN mới
     */
    async resetPinWithSecurityQuestion(accountId, answer, newPin) {
        const accounts = await this.getAllAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return { success: false, message: "Không tìm thấy tài khoản" };

        if (!acc.security_answer_hash) {
            return { success: false, message: "Tài khoản chưa từng thiết lập câu hỏi bí mật. Vui lòng liên hệ cấp trên hoặc Tổng Quản." };
        }

        const inputHash = await this.hashSecurityAnswer(answer);
        if (inputHash !== acc.security_answer_hash) {
            return { success: false, message: "Câu trả lời bí mật không chính xác!" };
        }

        acc.pin_hash = await this.hashPin(newPin);
        acc.is_default_pin = false;
        acc.updated_at = new Date().toISOString();
        await this.saveAllAccounts(accounts);

        await this.logAudit("RESET_PIN", `Đặt lại mã PIN qua Câu hỏi bí mật thành công`, acc.holder);
        return { success: true, message: "Đặt lại mã PIN thành công! Bạn có thể đăng nhập ngay với PIN mới." };
    }

    /**
     * Quên mã PIN: Xác minh bằng Mã khôi phục 6 ký tự và đặt lại PIN mới
     */
    async resetPinWithRecoveryCode(accountId, recoveryCode, newPin) {
        const accounts = await this.getAllAccounts();
        const acc = accounts.find(a => a.id === accountId);
        if (!acc) return { success: false, message: "Không tìm thấy tài khoản" };

        const inputHash = await this.hashRecoveryCode(recoveryCode);
        
        // Kiểm tra hash hoặc mã khôi phục dự phòng ban đầu
        const isMatch = (acc.recovery_code_hash && acc.recovery_code_hash === inputHash) ||
                        (acc.recovery_code_plain && acc.recovery_code_plain === String(recoveryCode).trim().toUpperCase());

        if (!isMatch) {
            return { success: false, message: "Mã khôi phục 6 ký tự không chính xác!" };
        }

        acc.pin_hash = await this.hashPin(newPin);
        acc.is_default_pin = false;
        // Sinh luôn mã khôi phục mới thay thế mã cũ để đảm bảo an toàn tuyệt đối
        const newRecoveryCode = this.generateRecoveryCode(acc.role === "tong_quan" ? "TQ" : "TR");
        acc.recovery_code_hash = await this.hashRecoveryCode(newRecoveryCode);
        acc.recovery_code_plain = null;
        acc.updated_at = new Date().toISOString();

        await this.saveAllAccounts(accounts);

        await this.logAudit("RESET_PIN", `Đặt lại mã PIN qua Mã khôi phục khẩn cấp thành công`, acc.holder);
        return { 
            success: true, 
            message: "Đặt lại mã PIN thành công!", 
            newRecoveryCode: newRecoveryCode 
        };
    }

    /**
     * Cấp trên hoặc Tổng Quản cấp lại mã kích hoạt cho tài khoản cấp dưới (khi họ quên sạch cả 2)
     */
    async reissueActivationCode(managerSession, targetAccountId, tempPin = "999999") {
        if (!managerSession) throw new Error("Chưa đăng nhập");
        
        const accounts = await this.getAllAccounts();
        const targetAcc = accounts.find(a => a.id === targetAccountId);
        if (!targetAcc) throw new Error("Không tìm thấy tài khoản cần cấp lại mã");

        // Kiểm tra quyền: Tổng Quản hoặc Cấp trên trực tiếp
        const isSuperAdmin = managerSession.role === "tong_quan";
        const isDirectParent = targetAcc.parent_account_id === managerSession.id;

        if (!isSuperAdmin && !isDirectParent) {
            throw new Error("Bạn không có quyền cấp lại mã kích hoạt cho tài khoản này");
        }

        targetAcc.pin_hash = await this.hashPin(tempPin);
        targetAcc.is_default_pin = true;
        targetAcc.security_answer_hash = null;
        targetAcc.recovery_code_plain = this.generateRecoveryCode("KP");
        targetAcc.recovery_code_hash = null;
        targetAcc.updated_at = new Date().toISOString();

        await this.saveAllAccounts(accounts);

        await this.logAudit("REISSUE_CODE", `Cấp lại mã kích hoạt tạm thời [${tempPin}] cho ${targetAcc.holder}`, managerSession.holder);

        return {
            success: true,
            tempPin: tempPin,
            recoveryCode: targetAcc.recovery_code_plain
        };
    }

    /* =================== CƠ CHẾ PHÂN QUYỀN THỪA KẾ CÂY PHẢ HỆ =================== */

    /**
     * Kiểm tra xem phiên đăng nhập hiện tại có quyền Thêm/Sửa/Xóa thành viên cụ thể này hay không
     * Trả về: { allowed: boolean, reason?: string, managerContact?: string }
     */
    canModifyMember(session, member) {
        if (!session) {
            return {
                allowed: false,
                reason: "Chưa đăng nhập quyền quản trị.",
                managerContact: "Tổng Quản Đại Tộc Trần Văn Thuần"
            };
        }

        // 1. Cấp 1: Tổng Quản Đại Tộc (Trần Văn Thuần) -> Toàn quyền
        if (session.role === "tong_quan" || session.scope_branch === "Tất cả") {
            return { allowed: true };
        }

        const memberBranch = member.chi_nhanh || "";
        const sessionBranch = session.scope_branch || "";

        // 2. Cấp 2: Trưởng Chi (Ví dụ: Trưởng Chi Lãng Nam)
        if (session.role === "truong_chi") {
            // Quản lý toàn bộ 24 đời Chi Lãng Nam và nhánh con Cụ Chí Hòa
            if (sessionBranch.includes("Lãng Nam")) {
                if (memberBranch.includes("Lãng Nam") || memberBranch.includes("Chí Hòa")) {
                    return { allowed: true };
                }
                // Các vị tổ trực hệ gốc dẫn về Lãng Nam
                const directAncestors = ["TK_01", "TH_02", "TL_03", "TT_04", "TL_05"];
                if (directAncestors.includes(member.id)) {
                    return { allowed: true };
                }
            } else if (memberBranch.includes(sessionBranch)) {
                return { allowed: true };
            }

            return {
                allowed: false,
                reason: `Thành viên này thuộc "${memberBranch}", nằm ngoài phạm vi Chi "${sessionBranch}".`,
                managerContact: "Tổng Quản Đại Tộc Trần Văn Thuần"
            };
        }

        // 3. Cấp 3: Trưởng Cành / Phân Nhánh
        if (session.role === "truong_canh" || session.role === "nguoi_ghi_chep") {
            // Khớp chính xác cành
            if (memberBranch === sessionBranch) {
                return { allowed: true };
            }

            // Xử lý các vị tổ đầu cành
            if (sessionBranch.includes("Nhánh ông Long") && (memberBranch.includes("Nhánh ông Long") || member.id === "LN_21_Long")) return { allowed: true };
            if (sessionBranch.includes("Nhánh ông Thịnh") && (memberBranch.includes("Nhánh ông Thịnh") || member.id === "LN_21_Thinh")) return { allowed: true };
            if (sessionBranch.includes("Nhánh ông Vượng") && (memberBranch.includes("Nhánh ông Vượng") || member.id === "LN_21_Vuong")) return { allowed: true };

            // Tìm Trưởng Cành của nhánh này để hiển thị thông tin liên hệ
            let targetLeader = "Trưởng Chi hoặc Trưởng Cành phụ trách";
            if (memberBranch.includes("Nhánh ông Long")) targetLeader = "Trưởng Cành Cụ Long";
            else if (memberBranch.includes("Nhánh ông Thịnh")) targetLeader = "Trưởng Cành Cụ Thịnh";
            else if (memberBranch.includes("Nhánh ông Vượng")) targetLeader = "Trưởng Cành Cụ Vượng";
            else if (memberBranch.includes("Lãng Nam")) targetLeader = "Trưởng Chi Họ Trần Lãng Nam";

            return {
                allowed: false,
                reason: `Bạn chỉ có quyền quản trị trong "${sessionBranch}". Thành viên này thuộc "${memberBranch}".`,
                managerContact: targetLeader
            };
        }

        return {
            allowed: false,
            reason: "Không có quyền chỉnh sửa mục này.",
            managerContact: "Tổng Quản Đại Tộc Trần Văn Thuần"
        };
    }

    /**
     * Kiểm tra xem người dùng hiện tại có quyền ủy quyền / tạo tài khoản cấp dưới hay không
     */
    canDelegateSubAccount(parentSession, targetRole, targetBranch) {
        if (!parentSession) return false;

        // Tổng Quản: Tạo được mọi vai trò
        if (parentSession.role === "tong_quan") return true;

        // Trưởng Chi: Được tạo Trưởng Cành và Người Ghi Chép trong phạm vi chi của mình
        if (parentSession.role === "truong_chi") {
            if (targetRole === "tong_quan" || targetRole === "truong_chi") return false;
            return targetBranch.includes("Lãng Nam") || targetBranch.includes("Chí Hòa");
        }

        // Trưởng Cành: Chỉ được tạo Người Ghi Chép trong chính cành của mình
        if (parentSession.role === "truong_canh") {
            if (targetRole !== "nguoi_ghi_chep") return false;
            return targetBranch === parentSession.scope_branch;
        }

        return false;
    }

    /**
     * Cấp tài khoản mới cho con cháu / người ghi chép
     */
    async createSubAccount(parentSession, { holder, role, role_title, scope_branch, initialPin }) {
        if (!this.canDelegateSubAccount(parentSession, role, scope_branch)) {
            throw new Error(`Bạn không có quyền cấp tài khoản vai trò "${role_title}" cho nhánh "${scope_branch}"`);
        }

        const accounts = await this.getAllAccounts();
        const newId = "acc_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 4);
        const pinHash = await this.hashPin(initialPin);
        const recoveryCodePlain = this.generateRecoveryCode("TV");

        const newAccount = {
            id: newId,
            holder: holder.trim(),
            role: role,
            role_title: role_title.trim(),
            scope_branch: scope_branch.trim(),
            parent_account_id: parentSession.id,
            pin_hash: pinHash,
            is_default_pin: true,
            security_question: "Mã định danh kích hoạt thành viên của bạn là gì?",
            security_answer_hash: null,
            recovery_code_hash: null,
            recovery_code_plain: recoveryCodePlain,
            created_at: new Date().toISOString(),
            status: "active"
        };

        accounts.push(newAccount);
        await this.saveAllAccounts(accounts);

        await this.logAudit(
            "DELEGATE_PERMISSION", 
            `Cấp quyền [${role_title}] cho ${holder} (Nhánh: ${scope_branch})`, 
            parentSession.holder
        );

        return {
            success: true,
            account: newAccount,
            initialPin: initialPin,
            recoveryCode: recoveryCodePlain
        };
    }

    /**
     * Thu hồi quyền tài khoản cấp dưới
     */
    async revokeAccount(parentSession, targetAccountId) {
        if (!parentSession) throw new Error("Chưa đăng nhập");

        const accounts = await this.getAllAccounts();
        const targetAcc = accounts.find(a => a.id === targetAccountId);
        if (!targetAcc) throw new Error("Không tìm thấy tài khoản");

        const isSuperAdmin = parentSession.role === "tong_quan";
        const isDirectParent = targetAcc.parent_account_id === parentSession.id;

        if (!isSuperAdmin && !isDirectParent) {
            throw new Error("Bạn không có quyền thu hồi tài khoản này");
        }

        targetAcc.status = "revoked";
        targetAcc.revoked_at = new Date().toISOString();
        targetAcc.revoked_by = parentSession.holder;

        await this.saveAllAccounts(accounts);

        await this.logAudit("REVOKE_PERMISSION", `Thu hồi quyền quản trị của ${targetAcc.holder}`, parentSession.holder);
        return { success: true };
    }

    /* =================== AUDIT LOG (NHẬT KÝ KIỂM TOÁN HOẠT ĐỘNG) =================== */

    /**
     * Ghi nhật ký hoạt động
     */
    async logAudit(action, details, targetName = "") {
        try {
            const logs = await this.getAuditLogs();
            const session = this.currentSession;

            const entry = {
                id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
                timestamp: new Date().toISOString(),
                actor_id: session ? session.id : "he_thong",
                actor_name: session ? session.holder : "Hệ thống",
                actor_role: session ? session.role_title : "Khách / Ngoại tuyến",
                action: action,
                target: targetName,
                details: details
            };

            logs.unshift(entry); // Thêm lên đầu danh sách
            if (logs.length > 250) logs.pop(); // Giới hạn 250 log mới nhất

            if (window.IDBStorage) {
                await window.IDBStorage.setSetting(this.AUDIT_LOG_KEY, logs);
            }
        } catch (e) {
            console.warn("Không thể ghi Audit Log:", e);
        }
    }

    /**
     * Lấy toàn bộ nhật ký
     */
    async getAuditLogs() {
        if (!window.IDBStorage) return [];
        const logs = await window.IDBStorage.getSetting(this.AUDIT_LOG_KEY, []);
        return Array.isArray(logs) ? logs : [];
    }

    /**
     * Xóa sạch nhật ký (chỉ Tổng Quản Đại Tộc mới có quyền)
     */
    async clearAuditLogs(superAdminSession) {
        if (!superAdminSession || superAdminSession.role !== "tong_quan") {
            throw new Error("Chỉ có Tổng Quản Đại Tộc mới có quyền làm mới Nhật Ký Kiểm Toán");
        }
        if (window.IDBStorage) {
            await window.IDBStorage.setSetting(this.AUDIT_LOG_KEY, []);
        }
        return true;
    }

    /* =================== XUẤT / NHẬP GÓI ĐỒNG BỘ QUA ZALO =================== */

    /**
     * Xuất gói dữ liệu cập nhật của Chi/Nhánh để gửi Zalo cho Tổng Quản
     */
    async exportZaloPackage(session) {
        if (!session) throw new Error("Vui lòng đăng nhập để xuất gói đồng bộ");
        if (!window.familyDataManager) throw new Error("Chưa nạp CSDL phả hệ");

        const allMembers = window.familyDataManager.getAllMembers();
        let targetMembers = [];

        if (session.role === "tong_quan") {
            targetMembers = allMembers;
        } else {
            targetMembers = allMembers.filter(m => {
                const check = this.canModifyMember(session, m);
                return check.allowed;
            });
        }

        const pkg = {
            format: "GIA_PHA_HO_TRAN_VIET_NAM_SYNC_PACKAGE",
            schema_version: "5.0.0",
            exported_at: new Date().toISOString(),
            sender: {
                account_id: session.id,
                holder: session.holder,
                role_title: session.role_title,
                scope_branch: session.scope_branch
            },
            summary: {
                total_records: targetMembers.length,
                branch: session.scope_branch
            },
            data: targetMembers
        };

        const jsonStr = JSON.stringify(pkg, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const cleanBranchName = session.scope_branch.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/g, "_");
        a.href = url;
        a.download = `DongBo_GiaPha_${cleanBranchName}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await this.logAudit("EXPORT_ZALO_PACKAGE", `Xuất gói đồng bộ Zalo gồm ${targetMembers.length} người`, session.holder);
        return pkg;
    }

    /**
     * Tổng Quản tiếp nhận và nạp gói cập nhật Zalo vào CSDL chung
     */
    async importZaloPackage(superAdminSession, jsonData) {
        if (!superAdminSession || superAdminSession.role !== "tong_quan") {
            throw new Error("Chỉ Tổng Quản Đại Tộc mới có quyền nạp và phê duyệt gói đồng bộ Zalo");
        }

        let pkg;
        try {
            pkg = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
        } catch (e) {
            throw new Error("Tệp dữ liệu không đúng định dạng JSON chuẩn");
        }

        if (pkg.format !== "GIA_PHA_HO_TRAN_VIET_NAM_SYNC_PACKAGE" || !Array.isArray(pkg.data)) {
            throw new Error("Tệp này không phải là Gói Đồng Bộ Gia Phả Họ Trần chuẩn");
        }

        const incomingMembers = pkg.data;
        const currentMembers = window.familyDataManager.getAllMembers();
        const mapCurrent = new Map(currentMembers.map(m => [m.id, m]));

        let addedCount = 0;
        let updatedCount = 0;

        for (const inc of incomingMembers) {
            if (mapCurrent.has(inc.id)) {
                mapCurrent.set(inc.id, { ...mapCurrent.get(inc.id), ...inc });
                updatedCount++;
            } else {
                mapCurrent.set(inc.id, inc);
                addedCount++;
            }
        }

        const mergedList = Array.from(mapCurrent.values());
        await window.familyDataManager.saveAll(mergedList);

        await this.logAudit(
            "IMPORT_ZALO_PACKAGE", 
            `Đã nạp gói từ [${pkg.sender.holder} - ${pkg.sender.role_title}]: Thêm mới ${addedCount}, Cập nhật ${updatedCount} thành viên`, 
            superAdminSession.holder
        );

        return {
            success: true,
            sender: pkg.sender,
            addedCount: addedCount,
            updatedCount: updatedCount,
            totalRecords: incomingMembers.length
        };
    }
}

// Khởi tạo instance toàn cục
window.FamilyAuth = new FamilyAuthManager();
