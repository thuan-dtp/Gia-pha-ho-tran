/**
 * TAB 2: PHẢ ĐỒ CỔ ĐIỂN (D3.js TREE ENGINE)
 * Sơ đồ cây sơn son thiếp vàng, thu phóng đa chiều, chuyển đổi Ngang/Dọc,
 * gập mở từng nhánh, lọc theo chi nhánh và xuất ảnh in ấn.
 */

class ClassicTree {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.orientation = "horizontal"; // "horizontal" (Ngang) hoặc "vertical" (Dọc)
        this.branchFilter = "Tất cả";
        this.svg = null;
        this.g = null;
        this.zoom = null;
        this.rootData = null;
        this.treeLayout = null;
        this.nodeWidth = 205;
        this.nodeHeight = 78;
        this.duration = 450;
        this.i = 0;
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    setFilter(branch) {
        this.branchFilter = branch;
        this.render();
    }

    setOrientation(orientation) {
        this.orientation = orientation;
        this.render();
    }

    render() {
        if (!window.d3 || !window.familyDataManager) return;

        // Xóa nội dung cũ
        this.container.innerHTML = "";

        const width = this.container.clientWidth || 1000;
        const height = this.container.clientHeight || 700;

        // Lấy cấu trúc cây từ DataManager
        const rawHierarchy = window.familyDataManager.buildTreeHierarchy(this.branchFilter);
        if (!rawHierarchy) {
            this.container.innerHTML = `<div class="empty-state">Chưa có dữ liệu cây cho nhánh này.</div>`;
            return;
        }

        // Tạo SVG
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height])
            .attr("class", "tree-svg");

        // Tạo filter bóng đổ và hoa văn mạ vàng cho SVG
        const defs = this.svg.append("defs");
        const filter = defs.append("filter")
            .attr("id", "gold-glow")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "140%")
            .attr("height", "140%");
        filter.append("feGaussianBlur").attr("stdDeviation", "2").attr("result", "blur");
        filter.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

        // Nhóm chính (Group) để Zoom & Pan
        this.g = this.svg.append("g").attr("class", "tree-viewport");

        // Cấu hình Zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.2, 3])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });

        this.svg.call(this.zoom);

        // Khởi tạo D3 Hierarchy
        this.rootData = d3.hierarchy(rawHierarchy, d => d.children);

        if (this.orientation === "horizontal") {
            this.rootData.x0 = height / 2;
            this.rootData.y0 = 80;
        } else {
            this.rootData.x0 = width / 2;
            this.rootData.y0 = 60;
        }

        // Cập nhật cây
        this.update(this.rootData);

        // Căn giữa cây sau khi vẽ
        setTimeout(() => this.resetZoom(), 150);
    }

    update(source) {
        const isHorizontal = this.orientation === "horizontal";

        // Định nghĩa Tree layout
        const tree = isHorizontal
            ? d3.tree().nodeSize([this.nodeHeight + 35, this.nodeWidth + 70])
            : d3.tree().nodeSize([this.nodeWidth + 40, this.nodeHeight + 60]);

        tree(this.rootData);

        const nodes = this.rootData.descendants();
        const links = this.rootData.links();

        // Chuẩn hóa khoảng cách tầng (depth)
        nodes.forEach(d => {
            if (isHorizontal) {
                d.y = d.depth * (this.nodeWidth + 60);
            } else {
                d.y = d.depth * (this.nodeHeight + 65);
            }
        });

        /* ================= VẼ CÁC ĐƯỜNG NỐI (LINKS) ================= */
        const link = this.g.selectAll(".tree-link")
            .data(links, d => d.target.data.id);

        const linkEnter = link.enter().append("path")
            .attr("class", "tree-link")
            .attr("d", d => {
                const o = { x: source.x0 || 0, y: source.y0 || 0 };
                return this.diagonalPath(o, o, isHorizontal);
            })
            .attr("fill", "none")
            .attr("stroke", "#d4af37")
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.75)
            .attr("stroke-dasharray", "4,2");

        link.merge(linkEnter).transition().duration(this.duration)
            .attr("d", d => this.diagonalPath(d.source, d.target, isHorizontal));

        link.exit().transition().duration(this.duration)
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return this.diagonalPath(o, o, isHorizontal);
            })
            .remove();

        /* ================= VẼ CÁC NÚT THÀNH VIÊN (NODES) ================= */
        const node = this.g.selectAll(".tree-node")
            .data(nodes, d => d.data.id || (d.id = ++this.i));

        const nodeEnter = node.enter().append("g")
            .attr("class", d => `tree-node ${d.data.gioi_tinh === 'Nữ' ? 'node-female' : 'node-male'} ${d.data.con_song ? 'node-alive' : 'node-deceased'}`)
            .attr("id", d => `tree-node-${d.data.id}`)
            .attr("data-id", d => d.data.id)
            .attr("transform", d => isHorizontal ? `translate(${source.y0},${source.x0})` : `translate(${source.x0},${source.y0})`)
            .on("click", (event, d) => {
                // Nhấp vào thẻ bài để xem chi tiết
                if (window.showMemberDetailModal) {
                    window.showMemberDetailModal(d.data.id);
                }
            });

        // Thẻ bài Sơn Son Thiếp Vàng (Card Background)
        nodeEnter.append("rect")
            .attr("class", "card-bg")
            .attr("x", -this.nodeWidth / 2)
            .attr("y", -this.nodeHeight / 2)
            .attr("width", this.nodeWidth)
            .attr("height", this.nodeHeight)
            .attr("rx", 6)
            .attr("ry", 6)
            .attr("fill", d => d.data.con_song ? "#7f1d1d" : "#5b0606")
            .attr("stroke", "#d4af37")
            .attr("stroke-width", 2)
            .attr("filter", "url(#gold-glow)");

        // Viền trang trí hoa văn kép hoàng gia
        nodeEnter.append("rect")
            .attr("class", "card-inner-border")
            .attr("x", -this.nodeWidth / 2 + 3)
            .attr("y", -this.nodeHeight / 2 + 3)
            .attr("width", this.nodeWidth - 6)
            .attr("height", this.nodeHeight - 6)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("fill", "none")
            .attr("stroke", "#ffdf78")
            .attr("stroke-width", 0.8)
            .attr("stroke-opacity", 0.6);

        // Huy hiệu Đời thứ (Generation Badge)
        const genBadgeW = 46;
        nodeEnter.append("rect")
            .attr("class", "card-gen-bg")
            .attr("x", -this.nodeWidth / 2 + 6)
            .attr("y", -this.nodeHeight / 2 + 5)
            .attr("width", genBadgeW)
            .attr("height", 14)
            .attr("rx", 3)
            .attr("fill", "#d4af37");

        nodeEnter.append("text")
            .attr("class", "card-gen")
            .attr("x", -this.nodeWidth / 2 + 6 + (genBadgeW / 2))
            .attr("y", -this.nodeHeight / 2 + 15)
            .attr("text-anchor", "middle")
            .attr("fill", "#420909")
            .attr("font-size", "9px")
            .attr("font-weight", "bold")
            .text(d => `ĐỜI ${d.data.doi_thu}`);

        // Nhãn Chi nhánh nhỏ (tối ưu khoảng trống, chống chạm chữ)
        nodeEnter.append("text")
            .attr("class", "card-branch")
            .attr("x", this.nodeWidth / 2 - 8)
            .attr("y", -this.nodeHeight / 2 + 15)
            .attr("text-anchor", "end")
            .attr("fill", "#f3e5ab")
            .attr("font-size", "9.5px")
            .text(d => {
                const b = d.data.chi_nhanh || "";
                if (b.includes(" - ")) return b.split(" - ").pop().trim();
                if (b.includes("Lãng Nam")) return "Chi Lãng Nam";
                if (b.includes("Triều Trần")) return "Gốc Đại Tộc";
                return b.length > 18 ? b.substring(0, 16) + "..." : b;
            })
            .append("title")
            .text(d => d.data.chi_nhanh || "");

        // Họ tên thành viên
        nodeEnter.append("text")
            .attr("class", "card-name")
            .attr("x", 0)
            .attr("y", 2)
            .attr("text-anchor", "middle")
            .attr("fill", "#ffffff")
            .attr("font-size", "13.5px")
            .attr("font-weight", "bold")
            .text(d => {
                let name = d.data.ho_ten || "";
                return name.length > 20 ? name.substring(0, 18) + "..." : name;
            });

        // Năm sinh - Năm mất
        nodeEnter.append("text")
            .attr("class", "card-dates")
            .attr("x", 0)
            .attr("y", 18)
            .attr("text-anchor", "middle")
            .attr("fill", "#e2d299")
            .attr("font-size", "10.5px")
            .text(d => {
                if (d.data.con_song) {
                    return window.isPrivacyMode ? "● Còn tại thế" : `Sinh: ${d.data.ngay_sinh || "—"}`;
                } else {
                    return `${d.data.ngay_sinh || "—"} - ${d.data.ngay_mat_am ? 'Mất ' + d.data.ngay_mat_am : 'Đã khuất'}`;
                }
            });

        // Danh xưng / Chức vị tóm tắt
        nodeEnter.append("text")
            .attr("class", "card-title-sub")
            .attr("x", 0)
            .attr("y", 30)
            .attr("text-anchor", "middle")
            .attr("fill", "#ffd966")
            .attr("font-size", "9.5px")
            .attr("font-style", "italic")
            .text(d => {
                const sub = d.data.danh_hieu || d.data.ten_hieu || d.data.vo_chong || "";
                return sub.length > 24 ? sub.substring(0, 22) + "..." : sub;
            });

        // Nút thu gọn / mở rộng nhánh (+ / -) nếu có con
        const collapseBtn = nodeEnter.append("g")
            .attr("class", "collapse-btn")
            .attr("transform", d => isHorizontal ? `translate(${this.nodeWidth / 2 + 10}, 0)` : `translate(0, ${this.nodeHeight / 2 + 10})`)
            .style("cursor", "pointer")
            .style("display", d => (d.children || d._children) ? "block" : "none")
            .on("click", (event, d) => {
                event.stopPropagation();
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                this.update(d);
            });

        collapseBtn.append("circle")
            .attr("r", 9)
            .attr("fill", "#d4af37")
            .attr("stroke", "#5b0606")
            .attr("stroke-width", 1.5);

        collapseBtn.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "3.5px")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .attr("fill", "#5b0606")
            .text(d => d.children ? "−" : "+");

        // Hiệu ứng Transition Node
        const nodeUpdate = node.merge(nodeEnter).transition().duration(this.duration)
            .attr("transform", d => isHorizontal ? `translate(${d.y},${d.x})` : `translate(${d.x},${d.y})`);

        nodeUpdate.select(".collapse-btn text")
            .text(d => d.children ? "−" : "+");

        // Node Exit
        const nodeExit = node.exit().transition().duration(this.duration)
            .attr("transform", d => isHorizontal ? `translate(${source.y},${source.x})` : `translate(${source.x},${source.y})`)
            .remove();

        // Lưu vị trí cũ cho animation
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    /**
     * Tạo đường cong Bezier mềm mại kết nối các thế hệ
     */
    diagonalPath(s, d, isHorizontal) {
        if (isHorizontal) {
            return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                      ${(s.y + d.y) / 2} ${d.x},
                      ${d.y} ${d.x}`;
        } else {
            return `M ${s.x} ${s.y}
                    C ${s.x} ${(s.y + d.y) / 2},
                      ${d.x} ${(s.y + d.y) / 2},
                      ${d.x} ${d.y}`;
        }
    }

    // Các hàm điều khiển Zoom
    zoomIn() {
        if (this.svg && this.zoom) {
            this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.3);
        }
    }

    zoomOut() {
        if (this.svg && this.zoom) {
            this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.75);
        }
    }

    resetZoom() {
        if (!this.svg || !this.g || !this.zoom) return;
        const width = this.container.clientWidth || 1000;
        const height = this.container.clientHeight || 700;

        const bounds = this.g.node().getBBox();
        const fullWidth = bounds.width;
        const fullHeight = bounds.height;

        if (fullWidth === 0 || fullHeight === 0) return;

        const midX = bounds.x + fullWidth / 2;
        const midY = bounds.y + fullHeight / 2;

        const scale = 0.85 / Math.max(fullWidth / width, fullHeight / height);
        const transform = d3.zoomIdentity
            .translate(width / 2 - scale * midX, height / 2 - scale * midY)
            .scale(scale);

        this.svg.transition().duration(600).call(this.zoom.transform, transform);
    }

    /**
     * Xuất cây phả hệ ra file ảnh PNG độ nét cao để in ấn
     */
    exportHighResImage(filename = "Pha_Do_Ho_Tran.png") {
        if (!this.svg) return;
        const svgElement = this.svg.node();
        const bbox = this.g.node().getBBox();

        // Tạo bản sao SVG độc lập với kích thước bbox
        const clonedSvg = svgElement.cloneNode(true);
        const margin = 40;
        clonedSvg.setAttribute("width", bbox.width + margin * 2);
        clonedSvg.setAttribute("height", bbox.height + margin * 2);
        clonedSvg.setAttribute("viewBox", `${bbox.x - margin} ${bbox.y - margin} ${bbox.width + margin * 2} ${bbox.height + margin * 2}`);

        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            canvas.width = (bbox.width + margin * 2) * 2; // Độ nét gấp đôi (2x) cho in ấn
            canvas.height = (bbox.height + margin * 2) * 2;
            ctx.scale(2, 2);
            // Nền giấy dó cổ truyền
            ctx.fillStyle = "#2c0b0e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }

    /**
     * Tự động phóng to, căn giữa và làm nổi bật thẻ thành viên khi tìm kiếm
     */
    focusMember(memberId) {
        if (!this.container || !window.familyDataManager) return;
        const dm = window.familyDataManager;
        const member = dm.getMemberById(memberId);
        if (!member) return;

        // Nếu đang lọc nhánh mà thành viên không thuộc nhánh đó, chuyển sang Tất cả
        if (this.branchFilter !== "Tất cả" && !dm.isMemberInBranch(member, this.branchFilter)) {
            this.branchFilter = "Tất cả";
            const branchSelect = document.getElementById("global-branch-select");
            if (branchSelect) branchSelect.value = "Tất cả";
            this.render();
        }

        if (!this.rootData) return;

        // Mở rộng tất cả các nút tổ tiên nếu đang bị thu gọn (_children)
        const expandAncestors = (node) => {
            if (!node) return false;
            if (node.data && node.data.id === memberId) return true;
            const children = (node.children || []).concat(node._children || []);
            for (const child of children) {
                if (expandAncestors(child)) {
                    if (node._children) {
                        node.children = (node.children || []).concat(node._children);
                        node._children = null;
                    }
                    return true;
                }
            }
            return false;
        };

        expandAncestors(this.rootData);
        this.update(this.rootData);

        setTimeout(() => {
            if (!this.rootData) return;
            const nodes = this.rootData.descendants();
            const targetNode = nodes.find(d => d.data && d.data.id === memberId);
            if (!targetNode || !this.svg || !this.zoom) return;

            const isHorizontal = this.orientation === "horizontal";
            const targetX = isHorizontal ? targetNode.y : targetNode.x;
            const targetY = isHorizontal ? targetNode.x : targetNode.y;

            const width = this.container.clientWidth || 1000;
            const height = this.container.clientHeight || 700;
            const scale = 1.15;

            const transform = d3.zoomIdentity
                .translate(width / 2 - scale * targetX, height / 2 - scale * targetY)
                .scale(scale);

            this.svg.transition().duration(750).call(this.zoom.transform, transform);

            // Làm nổi bật thẻ bài
            this.g.selectAll(".tree-node").classed("node-highlighted", false);
            const targetEl = this.g.selectAll(".tree-node").filter(d => d.data && d.data.id === memberId);
            if (!targetEl.empty()) {
                targetEl.classed("node-highlighted", true);
                setTimeout(() => {
                    targetEl.classed("node-highlighted", false);
                }, 4500);
            }
        }, 220);
    }
}

window.ClassicTree = ClassicTree;
