/**
 * GIA PHẢ HỌ TRẦN - DATA MANAGER (BỘ ĐIỀU PHỐI DỮ LIỆU ĐA NHÁNH)
 * Hợp nhất dữ liệu các chi, xử lý phân cấp, kiểm tra tính toàn vẹn và cung cấp API tra cứu.
 */

class DataManager {
    constructor() {
        this.info = {};
        this.chiInfoMap = {};
        this.members = [];
        this.membersMap = new Map();
        this.isLoaded = false;
    }

    /**
     * Khởi tạo và nạp dữ liệu (ưu tiên từ IndexedDB nếu có, nếu chưa có thì nạp từ các file JS tĩnh)
     */
    async init() {
        // Kiểm tra xem đã có dữ liệu trong IndexedDB chưa
        let dbData = null;
        if (window.IDBStorage) {
            try {
                dbData = await window.IDBStorage.getAllMembers();
            } catch (e) {
                console.warn("Chưa khởi tạo hoặc không đọc được IndexedDB, nạp dữ liệu mặc định:", e);
            }
        }

        if (dbData && dbData.length > 0) {
            // Kiểm tra nếu IndexedDB chưa có Chi Lãng Nam hoặc là dữ liệu cũ cần tự động cập nhật
            const hasLangNam = dbData.some(m => m.id === "LN_23_Thuan");
            const isOldSampleData = dbData.some(m => m.id === "TRUC_01");
            const hasKhienOldName = dbData.some(m => m.id === "LN_22_Khien" && m.ho_ten === "Trần Văn Khiện");
            const hasBenOrTinOldName = dbData.some(m => m.id === "LN_24_Ben" || m.ho_ten === "Trần Văn Ben" || m.ho_ten === "Trần Văn Bên" || m.id === "LN_24_Tin" || m.ho_ten === "Trần Văn Tin");

            if (!hasLangNam || isOldSampleData || hasKhienOldName || hasBenOrTinOldName) {
                console.log("Cập nhật cơ sở dữ liệu: Nạp dữ liệu mới nhất (bao gồm cập nhật tên Cụ Trần Văn Khiên, Trần Phúc Nguyên, Trần Anh Đức)...");
                this.loadFromStaticFiles();
                if (window.IDBStorage) {
                    try {
                        await window.IDBStorage.saveAllMembers(this.members);
                        console.log("Đã lưu thành công dữ liệu cập nhật mới vào IndexedDB.");
                    } catch (e) {
                        console.warn("Lỗi ghi IndexedDB:", e);
                    }
                }
            } else {
                console.log("Đã nạp " + dbData.length + " thành viên từ IndexedDB.");
                this.members = dbData;
                this.info = (window.DATA_TRUC_CHINH && window.DATA_TRUC_CHINH.info) || {};
            }
        } else {
            // Nạp từ các tệp data tĩnh
            this.loadFromStaticFiles();
            // Lưu lần đầu vào IndexedDB để lần sau dùng offline
            if (window.IDBStorage) {
                try {
                    await window.IDBStorage.saveAllMembers(this.members);
                    console.log("Đã đồng bộ dữ liệu Đại Tộc vào IndexedDB lần đầu.");
                } catch (e) {
                    console.warn("Lưu IndexedDB thất bại:", e);
                }
            }
        }

        this.rebuildIndex();
        this.isLoaded = true;
        return this;
    }

    /**
     * Nạp dữ liệu từ các biến toàn cục (data_truc_chinh, data_chi_1, data_chi_2)
     */
    loadFromStaticFiles() {
        this.members = [];
        this.info = (window.DATA_TRUC_CHINH && window.DATA_TRUC_CHINH.info) || {};

        if (window.DATA_TRUC_CHINH && window.DATA_TRUC_CHINH.members) {
            this.members.push(...window.DATA_TRUC_CHINH.members);
        }

        if (window.DATA_CHI_1 && window.DATA_CHI_1.members) {
            this.chiInfoMap["Chi 1"] = window.DATA_CHI_1.chi_info;
            this.members.push(...window.DATA_CHI_1.members);
        }

        if (window.DATA_CHI_2 && window.DATA_CHI_2.members) {
            this.chiInfoMap["Chi 2"] = window.DATA_CHI_2.chi_info;
            this.members.push(...window.DATA_CHI_2.members);
        }

        if (window.DATA_CHI_LANG_NAM && window.DATA_CHI_LANG_NAM.members) {
            this.chiInfoMap["Chi Lãng Nam"] = window.DATA_CHI_LANG_NAM.chi_info;
            this.members.push(...window.DATA_CHI_LANG_NAM.members);
        }
    }

    /**
     * Tái tạo Map tra cứu theo ID và sắp xếp thành viên
     */
    rebuildIndex() {
        this.membersMap.clear();
        for (const m of this.members) {
            this.membersMap.set(m.id, m);
        }
    }

    /**
     * Lấy toàn bộ danh sách thành viên
     */
    getAllMembers() {
        return this.members;
    }

    /**
     * Tìm thành viên theo ID
     */
    getMemberById(id) {
        return this.membersMap.get(id) || null;
    }

    /**
     * Thêm mới hoặc cập nhật 1 thành viên đồng bộ giữa bộ nhớ RAM và IndexedDB
     */
    async putMember(member) {
        if (!member || !member.id) return null;
        const idx = this.members.findIndex(m => m.id === member.id);
        if (idx >= 0) {
            this.members[idx] = { ...this.members[idx], ...member };
        } else {
            this.members.push(member);
        }
        this.rebuildIndex();
        if (window.IDBStorage) {
            await window.IDBStorage.putMember(member);
        }
        return member;
    }

    /**
     * Xóa 1 thành viên đồng bộ giữa bộ nhớ RAM và IndexedDB
     */
    async deleteMember(id) {
        if (!id) return false;
        this.members = this.members.filter(m => m.id !== id);
        this.rebuildIndex();
        if (window.IDBStorage) {
            await window.IDBStorage.deleteMember(id);
        }
        return true;
    }

    /**
     * Lưu toàn bộ danh sách thành viên đồng bộ giữa bộ nhớ RAM và IndexedDB
     */
    async saveAll(membersList) {
        if (!Array.isArray(membersList)) return false;
        this.members = membersList;
        this.rebuildIndex();
        if (window.IDBStorage) {
            await window.IDBStorage.saveAllMembers(membersList);
        }
        return true;
    }

    /**
     * Lấy danh sách các Chi/Nhánh có trong hệ thống
     */
    getBranches() {
        const branches = new Set();
        for (const m of this.members) {
            if (m.chi_nhanh) branches.add(m.chi_nhanh);
        }
        return Array.from(branches);
    }

    /**
     * Kiểm tra thành viên có thuộc bộ lọc Chi/Nhánh đang chọn hay không
     */
    isMemberInBranch(m, branchName) {
        if (!branchName || branchName === "Tất cả") return true;

        if (branchName === "Trục chính") {
            return m.chi_nhanh === "Trục chính";
        }

        if (branchName === "Chi Lãng Nam" || branchName === "Chi Họ Trần Lãng Nam") {
            // Tổ tiên trực hệ từ Đời 1 đến Đời 5
            const ancestors = ["TK_01", "TH_02", "TL_03", "TT_04", "TL_05"];
            if (ancestors.includes(m.id)) return true;
            return (m.chi_nhanh && (m.chi_nhanh.includes("Lãng Nam") || m.chi_nhanh.includes("Chí Hòa")));
        }

        if (branchName === "Chi Cụ Chí Hòa") {
            // Chuỗi tổ tiên từ Đời 1 đến Đời 19
            const ancestors = [
                "TK_01", "TH_02", "TL_03", "TT_04", "TL_05", "LN_06_Tri", "LN_07_QuocHien",
                "LN_08_VoVi", "LN_09_DucNghi", "LN_10_ChinhDao", "LN_11_ChanTu", "LN_12_CungChinh",
                "LN_13_CungDung", "LN_14_QuangTa", "LN_15_DinhBa", "LN_16_KimLan", "LN_17_NghiPhon",
                "LN_18_HuyMao", "LN_19_QuyenTu"
            ];
            if (ancestors.includes(m.id)) return true;
            return (m.chi_nhanh && m.chi_nhanh.includes("Chí Hòa"));
        }

        if (branchName.includes("Nhánh ông Long")) {
            const ancestors = [
                "TK_01", "TH_02", "TL_03", "TT_04", "TL_05", "LN_06_Tri", "LN_07_QuocHien",
                "LN_08_VoVi", "LN_09_DucNghi", "LN_10_ChinhDao", "LN_11_ChanTu", "LN_12_CungChinh",
                "LN_13_CungDung", "LN_14_QuangTa", "LN_15_DinhBa", "LN_16_KimLan", "LN_17_NghiPhon",
                "LN_18_HuyMao", "LN_19_QuyenTu", "LN_20_ChiHoa", "LN_21_Long"
            ];
            return ancestors.includes(m.id) || (m.chi_nhanh && m.chi_nhanh.includes("Nhánh ông Long"));
        }

        if (branchName.includes("Nhánh ông Thịnh")) {
            const ancestors = [
                "TK_01", "TH_02", "TL_03", "TT_04", "TL_05", "LN_06_Tri", "LN_07_QuocHien",
                "LN_08_VoVi", "LN_09_DucNghi", "LN_10_ChinhDao", "LN_11_ChanTu", "LN_12_CungChinh",
                "LN_13_CungDung", "LN_14_QuangTa", "LN_15_DinhBa", "LN_16_KimLan", "LN_17_NghiPhon",
                "LN_18_HuyMao", "LN_19_QuyenTu", "LN_20_ChiHoa", "LN_21_Thinh"
            ];
            return ancestors.includes(m.id) || (m.chi_nhanh && m.chi_nhanh.includes("Nhánh ông Thịnh"));
        }

        if (branchName.includes("Nhánh ông Vượng")) {
            const ancestors = [
                "TK_01", "TH_02", "TL_03", "TT_04", "TL_05", "LN_06_Tri", "LN_07_QuocHien",
                "LN_08_VoVi", "LN_09_DucNghi", "LN_10_ChinhDao", "LN_11_ChanTu", "LN_12_CungChinh",
                "LN_13_CungDung", "LN_14_QuangTa", "LN_15_DinhBa", "LN_16_KimLan", "LN_17_NghiPhon",
                "LN_18_HuyMao", "LN_19_QuyenTu", "LN_20_ChiHoa", "LN_21_Vuong"
            ];
            return ancestors.includes(m.id) || (m.chi_nhanh && m.chi_nhanh.includes("Nhánh ông Vượng"));
        }

        if (branchName === "Chi 1") {
            const ancestors = ["TK_01", "TH_02", "TL_03", "TT_04"];
            return ancestors.includes(m.id) || m.chi_nhanh === "Chi 1";
        }

        if (branchName === "Chi 2") {
            const ancestors = ["TK_01", "TH_02", "TL_03", "TT_04", "TT_05"];
            return ancestors.includes(m.id) || m.chi_nhanh === "Chi 2";
        }

        return m.chi_nhanh === branchName || m.doi_thu === 1;
    }

    /**
     * Lấy danh sách thành viên lọc theo Chi
     */
    getMembersByBranch(branchName) {
        if (!branchName || branchName === "Tất cả") {
            return this.members;
        }
        return this.members.filter(m => this.isMemberInBranch(m, branchName));
    }

    /**
     * Lấy danh sách thành viên nhóm theo Đời (Thế hệ)
     */
    getMembersGroupedByGeneration(branchFilter = null) {
        const list = branchFilter && branchFilter !== "Tất cả" 
            ? this.getMembersByBranch(branchFilter) 
            : this.members;

        const groups = {};
        for (const m of list) {
            const gen = m.doi_thu || 1;
            if (!groups[gen]) groups[gen] = [];
            groups[gen].push(m);
        }
        return groups;
    }

    /**
     * Xây dựng cấu trúc cây phân cấp (Hierarchical Tree) cho D3.js
     * Hỗ trợ lọc theo Chi/Nhánh
     */
    buildTreeHierarchy(branchFilter = null) {
        // Tìm cụ Khởi Tổ (parent_id == null)
        const rootMember = this.members.find(m => !m.parent_id);
        if (!rootMember) return null;

        // Tạo danh sách ID hợp lệ nếu có lọc theo nhánh
        let allowedIds = null;
        if (branchFilter && branchFilter !== "Tất cả") {
            allowedIds = new Set();
            for (const m of this.members) {
                if (this.isMemberInBranch(m, branchFilter)) {
                    allowedIds.add(m.id);
                }
            }
        }

        // Đệ quy dựng nút cây
        const buildNode = (member) => {
            const node = {
                ...member,
                children: []
            };

            // Tìm các con trực tiếp
            const children = this.members.filter(m => m.parent_id === member.id);
            for (const child of children) {
                if (!allowedIds || allowedIds.has(child.id)) {
                    node.children.push(buildNode(child));
                }
            }

            if (node.children.length === 0) {
                delete node.children;
            }

            return node;
        };

        return buildNode(rootMember);
    }

    /**
     * Bỏ dấu tiếng Việt phục vụ tìm kiếm thông minh không dấu
     */
    removeVietnameseTones(str) {
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
     * Tìm kiếm thành viên đa năng (Hỗ trợ cả Tiếng Việt có dấu, không dấu và khớp từ khóa rời như "Trần Hưng Đạo")
     */
    searchMembers(query, privacyMode = false) {
        if (!query || !query.trim()) return [];
        const rawQ = query.toLowerCase().trim();
        const cleanQ = this.removeVietnameseTones(query);
        const queryTokens = cleanQ.split(/\s+/).filter(Boolean);

        return this.members.filter(m => {
            const nameRaw = (m.ho_ten || "").toLowerCase();
            const nameClean = this.removeVietnameseTones(m.ho_ten || "");
            const titleRaw = (m.ten_hieu || "").toLowerCase();
            const titleClean = this.removeVietnameseTones(m.ten_hieu || "");
            const honorRaw = (m.danh_hieu || "").toLowerCase();
            const honorClean = this.removeVietnameseTones(m.danh_hieu || "");
            const bioRaw = (m.tieu_su || "").toLowerCase();
            const bioClean = this.removeVietnameseTones(m.tieu_su || "");
            const spouseRaw = (m.vo_chong || "").toLowerCase();
            const spouseClean = this.removeVietnameseTones(m.vo_chong || "");
            const tombRaw = (m.mo_phan || "").toLowerCase();
            const tombClean = this.removeVietnameseTones(m.mo_phan || "");
            const branchRaw = (m.chi_nhanh || "").toLowerCase();
            const branchClean = this.removeVietnameseTones(m.chi_nhanh || "");
            const meritRaw = (m.cong_duc || "").toLowerCase();
            const meritClean = this.removeVietnameseTones(m.cong_duc || "");
            const idRaw = (m.id || "").toLowerCase();

            const matchAccented = nameRaw.includes(rawQ) || titleRaw.includes(rawQ) || honorRaw.includes(rawQ) ||
                                  bioRaw.includes(rawQ) || spouseRaw.includes(rawQ) || tombRaw.includes(rawQ) ||
                                  branchRaw.includes(rawQ) || meritRaw.includes(rawQ) || idRaw.includes(rawQ);

            const matchUnaccented = nameClean.includes(cleanQ) || titleClean.includes(cleanQ) || honorClean.includes(cleanQ) ||
                                    bioClean.includes(cleanQ) || spouseClean.includes(cleanQ) || tombClean.includes(cleanQ) ||
                                    branchClean.includes(cleanQ) || meritClean.includes(cleanQ);

            if (matchAccented || matchUnaccented) return true;

            if (queryTokens.length > 1) {
                const combinedIdentity = `${nameClean} ${titleClean} ${honorClean} ${branchClean}`;
                return queryTokens.every(tok => combinedIdentity.includes(tok));
            }

            return false;
        });
    }

    /**
     * Lấy danh sách thành viên vinh danh trong Sổ Vàng
     */
    getHonorList() {
        return this.members.filter(m => m.so_vang || (m.cong_duc && m.cong_duc.length > 10));
    }

    /**
     * Lấy danh sách các ngày giỗ kỵ nhật (bao gồm cả thành viên và phối ngẫu phu nhân)
     */
    getAnniversaries() {
        const list = [];

        for (const m of this.members) {
            // 1. Ngày giỗ trực tiếp của thành viên
            if (!m.con_song && m.ngay_mat_am && m.ngay_mat_am.trim() !== "") {
                const parts = m.ngay_mat_am.split("/");
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                if (!isNaN(day) && !isNaN(month)) {
                    list.push({
                        member: m,
                        lunarDay: day,
                        lunarMonth: month,
                        lunarDateStr: `${day} tháng ${month} Âm lịch`
                    });
                }
            }

            // 2. Ngày giỗ của phối ngẫu (Cụ bà) được ghi trong thông tin vo_chong
            if (m.vo_chong && (m.vo_chong.includes("Kỵ") || m.vo_chong.includes("giỗ") || m.vo_chong.includes("Mất"))) {
                const regex = /(?:Kỵ|giỗ|Mất)\s*(?:nhật)?\s*(\d{1,2})[\/\-](\d{1,2})/gi;
                let match;
                while ((match = regex.exec(m.vo_chong)) !== null) {
                    const d = parseInt(match[1], 10);
                    const mo = parseInt(match[2], 10);
                    if (!isNaN(d) && !isNaN(mo)) {
                        list.push({
                            member: {
                                ...m,
                                ho_ten: `Phu Nhân (Phối ngẫu Cụ ${m.ho_ten})`,
                                danh_hieu: `Kính tưởng niệm Cụ Bà • ${m.chi_nhanh}`
                            },
                            lunarDay: d,
                            lunarMonth: mo,
                            lunarDateStr: `${d} tháng ${mo} Âm lịch`
                        });
                    }
                }
            }
        }

        return list;
    }

    /**
     * Tính toán Tổ phụ chung gần nhất (LCA) và xác định vai vế xưng hô giữa 2 người
     */
    calculateKinship(idA, idB) {
        if (idA === idB) {
            return { error: "Hai người được chọn là một người." };
        }

        const personA = this.getMemberById(idA);
        const personB = this.getMemberById(idB);
        if (!personA || !personB) {
            return { error: "Không tìm thấy thông tin một trong hai người." };
        }

        // Lấy chuỗi tổ tiên của A
        const ancestorsA = [];
        let curr = personA;
        while (curr) {
            ancestorsA.push(curr);
            curr = curr.parent_id ? this.getMemberById(curr.parent_id) : null;
        }

        // Lấy chuỗi tổ tiên của B
        const ancestorsB = [];
        curr = personB;
        while (curr) {
            ancestorsB.push(curr);
            curr = curr.parent_id ? this.getMemberById(curr.parent_id) : null;
        }

        // Tìm tổ phụ chung gần nhất (LCA)
        let lca = null;
        for (const ancA of ancestorsA) {
            const foundInB = ancestorsB.find(b => b.id === ancA.id);
            if (foundInB) {
                lca = ancA;
                break;
            }
        }

        if (!lca) {
            return {
                personA,
                personB,
                lca: null,
                relationship: "Khác nguồn gốc tổ phụ hoặc chưa kết nối chung trong cây phả hệ.",
                formOfAddress: "Đồng tộc hảo hữu"
            };
        }

        const genDiff = (personA.doi_thu || 1) - (personB.doi_thu || 1);
        let relationshipDesc = "";
        let addressAtoB = ""; // A gọi B là gì
        let addressBtoA = ""; // B gọi A là gì

        if (personA.id === lca.id) {
            // A là tổ tiên trực hệ của B
            const dist = (personB.doi_thu || 1) - (personA.doi_thu || 1);
            if (dist === 1) {
                addressAtoB = personB.gioi_tinh === "Nam" ? "Con trai" : "Con gái";
                addressBtoA = personA.gioi_tinh === "Nam" ? "Cha / Bố" : "Mẹ";
                relationshipDesc = `${personA.ho_ten} là Cha/Mẹ của ${personB.ho_ten}.`;
            } else if (dist === 2) {
                addressAtoB = "Cháu nội/ngoại";
                addressBtoA = personA.gioi_tinh === "Nam" ? "Ông nội" : "Bà nội";
                relationshipDesc = `${personA.ho_ten} là Ông/Bà của ${personB.ho_ten}.`;
            } else if (dist === 3) {
                addressAtoB = "Chắt";
                addressBtoA = personA.gioi_tinh === "Nam" ? "Cụ cố" : "Cụ bà";
                relationshipDesc = `${personA.ho_ten} là Cụ cố của ${personB.ho_ten}.`;
            } else {
                addressAtoB = "Hậu duệ đời thứ " + dist;
                addressBtoA = "Cụ Tổ đời thứ " + (personA.doi_thu || 1);
                relationshipDesc = `${personA.ho_ten} là Tiền nhân bậc cao hơn ${dist} đời so với ${personB.ho_ten}.`;
            }
        } else if (personB.id === lca.id) {
            // B là tổ tiên trực hệ của A (đảo ngược lại)
            const res = this.calculateKinship(idB, idA);
            return {
                personA,
                personB,
                lca,
                genDiff,
                relationship: `${personB.ho_ten} là bậc tiền bối trực hệ của ${personA.ho_ten}.`,
                addressAtoB: res.addressBtoA,
                addressBtoA: res.addressAtoB
            };
        } else {
            // Cùng thế hệ hoặc anh em họ
            const distA = (personA.doi_thu || 1) - (lca.doi_thu || 1);
            const distB = (personB.doi_thu || 1) - (lca.doi_thu || 1);

            if (genDiff === 0) {
                // Cùng đời
                if (distA === 1 && distB === 1) {
                    relationshipDesc = "Anh/Chị/Em ruột";
                    addressAtoB = "Anh/Chị/Em ruột";
                    addressBtoA = "Anh/Chị/Em ruột";
                } else {
                    relationshipDesc = `Anh/Chị/Em họ cùng đời thứ ${personA.doi_thu} (Chung Cụ ${lca.ho_ten}).`;
                    addressAtoB = "Anh / Chị / Em họ";
                    addressBtoA = "Anh / Chị / Em họ";
                }
            } else if (genDiff === 1) {
                // A hơn B 1 đời (A là chú/bác/cô họ của B)
                relationshipDesc = `${personA.ho_ten} thuộc hàng Chú/Bác/Cô họ của ${personB.ho_ten}.`;
                addressAtoB = "Cháu họ";
                addressBtoA = personA.gioi_tinh === "Nam" ? "Chú họ / Bác họ" : "Cô họ / Thím họ";
            } else if (genDiff === -1) {
                // A kém B 1 đời (B là chú/bác/cô họ của A)
                relationshipDesc = `${personB.ho_ten} thuộc hàng Chú/Bác/Cô họ của ${personA.ho_ten}.`;
                addressAtoB = personB.gioi_tinh === "Nam" ? "Chú họ / Bác họ" : "Cô họ / Thím họ";
                addressBtoA = "Cháu họ";
            } else if (genDiff > 1) {
                relationshipDesc = `${personA.ho_ten} là hàng Ông/Bà họ (hơn ${genDiff} đời) của ${personB.ho_ten}.`;
                addressAtoB = "Cháu họ";
                addressBtoA = personA.gioi_tinh === "Nam" ? "Ông họ" : "Bà họ";
            } else {
                const absGen = Math.abs(genDiff);
                relationshipDesc = `${personB.ho_ten} là hàng Ông/Bà họ (hơn ${absGen} đời) của ${personA.ho_ten}.`;
                addressAtoB = personB.gioi_tinh === "Nam" ? "Ông họ" : "Bà họ";
                addressBtoA = "Cháu họ";
            }
        }

        return {
            personA,
            personB,
            lca,
            genDiff,
            relationship: relationshipDesc,
            addressAtoB,
            addressBtoA
        };
    }

    /**
     * Kiểm tra tính toàn vẹn của danh sách thành viên (Validation)
     */
    validateIntegrity(membersList = null) {
        const list = membersList || this.members;
        const errors = [];
        const warnings = [];
        const idSet = new Set();

        for (const m of list) {
            // Kiểm tra ID
            if (!m.id || !m.id.trim()) {
                errors.push(`Có thành viên thiếu mã ID (Họ tên: ${m.ho_ten || 'Chưa đặt tên'}).`);
                continue;
            }
            if (idSet.has(m.id)) {
                errors.push(`Trùng lặp mã ID: "${m.id}" (Họ tên: ${m.ho_ten}).`);
            }
            idSet.add(m.id);

            // Kiểm tra Họ tên
            if (!m.ho_ten || !m.ho_ten.trim()) {
                errors.push(`Thành viên ID "${m.id}" thiếu Họ tên.`);
            }

            // Kiểm tra Đời thứ
            if (!m.doi_thu || isNaN(m.doi_thu) || m.doi_thu < 1) {
                errors.push(`Thành viên "${m.ho_ten}" (ID: ${m.id}) có đời thứ không hợp lệ.`);
            }
        }

        // Kiểm tra Parent_ID
        for (const m of list) {
            if (m.parent_id) {
                if (!idSet.has(m.parent_id)) {
                    errors.push(`Thành viên "${m.ho_ten}" (ID: ${m.id}) có Parent_ID "${m.parent_id}" không tồn tại trong danh sách.`);
                } else {
                    const parent = list.find(p => p.id === m.parent_id);
                    if (parent && m.doi_thu && parent.doi_thu && m.doi_thu <= parent.doi_thu) {
                        warnings.push(`Thành viên "${m.ho_ten}" (Đời ${m.doi_thu}) có đời thứ nhỏ hơn hoặc bằng cha/mẹ "${parent.ho_ten}" (Đời ${parent.doi_thu}).`);
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Xuất dữ liệu của một Chi thành chuỗi JavaScript (data_chi_X.js)
     */
    exportBranchJS(branchName) {
        const branchMembers = this.members.filter(m => m.chi_nhanh === branchName);
        const info = this.chiInfoMap[branchName] || {
            ten_chi: branchName,
            ngay_xuat: new Date().toLocaleDateString("vi-VN")
        };

        const varName = branchName.replace(/\s+/g, "_").toUpperCase();
        const content = `/**
 * GIA PHẢ HỌ TRẦN - DỮ LIỆU ${branchName.toUpperCase()}
 * Xuất tự động từ Hệ thống Gia Phả Số Đa Nhánh lúc: ${new Date().toLocaleString("vi-VN")}
 */

window.DATA_${varName} = {
    chi_info: ${JSON.stringify(info, null, 4)},
    members: ${JSON.stringify(branchMembers, null, 4)}
};
`;
        return content;
    }
}

// Gắn đối tượng vào window
window.familyDataManager = new DataManager();
