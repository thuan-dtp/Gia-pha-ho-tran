/**
 * TAB 4: TINH TÚ NGÂN HÀ (D3 RADIAL ORBIT & FORCE GRAPH)
 * Biểu diễn các thế hệ dòng họ như các vì tinh tú trong vũ trụ gia tộc.
 * Hỗ trợ 2 chế độ: Quỹ đạo đồng tâm (Radial Orbit) và Mạng lưới trọng lực (Force Graph).
 */

class GalaxyOrbit {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.mode = "orbit"; // "orbit" hoặc "force"
        this.svg = null;
        this.simulation = null;
        this.zoom = null;
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    setMode(mode) {
        this.mode = mode;
        this.render();
    }

    render() {
        if (!window.d3 || !window.familyDataManager) return;

        this.container.innerHTML = "";
        const width = this.container.clientWidth || 1000;
        const height = this.container.clientHeight || 700;

        const members = window.familyDataManager.getAllMembers();
        if (!members || members.length === 0) return;

        // Tạo SVG nền vũ trụ huyền ảo
        this.svg = d3.select(this.container)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", [0, 0, width, height])
            .attr("class", "galaxy-svg");

        // Filter phát sáng tinh tú (Glow filter)
        const defs = this.svg.append("defs");
        const glow = defs.append("filter")
            .attr("id", "star-glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
        const feMerge = glow.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "coloredBlur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Nhóm phóng to thu nhỏ
        const g = this.svg.append("g").attr("class", "galaxy-viewport");

        this.zoom = d3.zoom()
            .scaleExtent([0.3, 4])
            .on("zoom", (event) => g.attr("transform", event.transform));

        this.svg.call(this.zoom);

        // Vẽ bụi sao nền ngẫu nhiên
        const starsBg = g.append("g").attr("class", "stars-bg");
        for (let s = 0; s < 120; s++) {
            starsBg.append("circle")
                .attr("cx", (Math.random() - 0.5) * width * 2)
                .attr("cy", (Math.random() - 0.5) * height * 2)
                .attr("r", Math.random() * 1.5 + 0.5)
                .attr("fill", "#ffffff")
                .attr("opacity", Math.random() * 0.7 + 0.2);
        }

        if (this.mode === "orbit") {
            this.renderRadialOrbit(g, members, width, height);
        } else {
            this.renderForceGraph(g, members, width, height);
        }
    }

    /* =================== CHẾ ĐỘ 1: QUỸ ĐẠO ĐỒNG TÂM =================== */
    renderRadialOrbit(g, members, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const gCenter = g.append("g").attr("transform", `translate(${centerX}, ${centerY})`);

        // Tìm số đời lớn nhất
        let maxGen = 1;
        members.forEach(m => {
            if (m.doi_thu > maxGen) maxGen = m.doi_thu;
        });

        const orbitRadiusStep = 110;

        // Vẽ các vòng quỹ đạo đồng tâm
        for (let gen = 1; gen <= maxGen; gen++) {
            const r = (gen - 1) * orbitRadiusStep;
            if (r > 0) {
                gCenter.append("circle")
                    .attr("r", r)
                    .attr("fill", "none")
                    .attr("stroke", "#d4af37")
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "6,4")
                    .attr("opacity", 0.35);

                // Nhãn vòng quỹ đạo
                gCenter.append("text")
                    .attr("x", 10)
                    .attr("y", -r + 14)
                    .attr("fill", "#ffd700")
                    .attr("font-size", "11px")
                    .attr("opacity", 0.6)
                    .text(`QUỸ ĐẠO ĐỜI ${gen}`);
            }
        }

        // Nhóm các thành viên theo đời
        const genGroups = {};
        members.forEach(m => {
            const gen = m.doi_thu || 1;
            if (!genGroups[gen]) genGroups[gen] = [];
            genGroups[gen].push(m);
        });

        // Tính tọa độ cho từng thành viên theo góc tròn
        const nodes = [];
        const nodeMap = new Map();

        Object.keys(genGroups).forEach(genStr => {
            const gen = parseInt(genStr, 10);
            const list = genGroups[gen];
            const r = (gen - 1) * orbitRadiusStep;
            const count = list.length;
            const angleStep = (2 * Math.PI) / (count || 1);

            list.forEach((m, idx) => {
                const angle = idx * angleStep - Math.PI / 2;
                const node = {
                    ...m,
                    x: r === 0 ? 0 : r * Math.cos(angle),
                    y: r === 0 ? 0 : r * Math.sin(angle),
                    radius: gen === 1 ? 26 : (m.so_vang ? 16 : 12)
                };
                nodes.push(node);
                nodeMap.set(m.id, node);
            });
        });

        // Vẽ các tia liên kết cha con
        const linkGroup = gCenter.append("g").attr("class", "orbit-links");
        nodes.forEach(target => {
            if (target.parent_id && nodeMap.has(target.parent_id)) {
                const source = nodeMap.get(target.parent_id);
                linkGroup.append("line")
                    .attr("x1", source.x)
                    .attr("y1", source.y)
                    .attr("x2", target.x)
                    .attr("y2", target.y)
                    .attr("stroke", "#ffcf40")
                    .attr("stroke-width", 1.5)
                    .attr("stroke-opacity", 0.45);
            }
        });

        // Vẽ các ngôi sao thành viên
        const nodeGroup = gCenter.append("g").attr("class", "orbit-nodes");
        const nodeElem = nodeGroup.selectAll(".orbit-star")
            .data(nodes)
            .enter().append("g")
            .attr("class", "orbit-star")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .style("cursor", "pointer")
            .on("click", (event, d) => {
                if (window.showMemberDetailModal) {
                    window.showMemberDetailModal(d.id);
                }
            });

        // Vòng hào quang ngôi sao
        nodeElem.append("circle")
            .attr("r", d => d.radius + 6)
            .attr("fill", d => d.doi_thu === 1 ? "rgba(255, 215, 0, 0.4)" : (d.so_vang ? "rgba(255, 165, 0, 0.3)" : "rgba(255, 255, 255, 0.15)"))
            .attr("filter", "url(#star-glow)");

        // Nhân ngôi sao
        nodeElem.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", d => d.doi_thu === 1 ? "#ffd700" : (d.gioi_tinh === "Nữ" ? "#ff69b4" : (d.con_song ? "#e53e3e" : "#c53030")))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.8);

        // Biểu tượng bên trong sao Khởi tổ
        nodeElem.filter(d => d.doi_thu === 1).append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "5px")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("fill", "#5b0606")
            .text("TỔ");

        // Tên bên cạnh ngôi sao
        nodeElem.append("text")
            .attr("dy", d => d.radius + 14)
            .attr("text-anchor", "middle")
            .attr("fill", "#ffffff")
            .attr("font-size", "11px")
            .attr("font-weight", d => d.doi_thu <= 2 ? "bold" : "normal")
            .text(d => d.ho_ten);
    }

    /* =================== CHẾ ĐỘ 2: MẠNG LƯỚI TRỌNG LỰC =================== */
    renderForceGraph(g, members, width, height) {
        const nodes = members.map(m => ({ ...m, radius: m.doi_thu === 1 ? 26 : 14 }));
        const nodeMap = new Map(nodes.map(n => [n.id, n]));

        const links = [];
        nodes.forEach(n => {
            if (n.parent_id && nodeMap.has(n.parent_id)) {
                links.push({
                    source: n.parent_id,
                    target: n.id
                });
            }
        });

        this.simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-240))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(d => d.radius + 15));

        // Vẽ đường nối
        const link = g.append("g")
            .attr("class", "force-links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("stroke", "#d4af37")
            .attr("stroke-width", 1.5)
            .attr("stroke-opacity", 0.5);

        // Vẽ Nút Node
        const node = g.append("g")
            .attr("class", "force-nodes")
            .selectAll(".force-node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "force-node")
            .style("cursor", "grab")
            .call(d3.drag()
                .on("start", (event, d) => {
                    if (!event.active) this.simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) this.simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            )
            .on("click", (event, d) => {
                if (window.showMemberDetailModal) {
                    window.showMemberDetailModal(d.id);
                }
            });

        node.append("circle")
            .attr("r", d => d.radius + 4)
            .attr("fill", "rgba(255, 215, 0, 0.25)")
            .attr("filter", "url(#star-glow)");

        node.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", d => d.doi_thu === 1 ? "#ffd700" : (d.gioi_tinh === "Nữ" ? "#ec4899" : (d.con_song ? "#ef4444" : "#991b1b")))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.5);

        node.append("text")
            .attr("dy", d => d.radius + 13)
            .attr("text-anchor", "middle")
            .attr("fill", "#f3e5ab")
            .attr("font-size", "11px")
            .text(d => d.ho_ten);

        this.simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });
    }
}

window.GalaxyOrbit = GalaxyOrbit;
