$(document).ready(function () {
    const documents = [];

    function populateDocumentList(docs) {
        docs.forEach(doc => {
            $('#doc-list').append(`
                <li id="doc-${doc.id}" class="doc-item">
                    ${doc.name}
                    <button class="remove-btn" data-doc-id="${doc.id}">Remove</button>
                </li>
            `);
        });
    }

    function drawMDSPlot(docs) {
        d3.select("#mds-view").html("");

        const svgWidth = 400;
        const svgHeight = 400;

        const svg = d3.select("#mds-view").append("svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);

        const xExtent = d3.extent(docs, d => d.mds_x);
        const yExtent = d3.extent(docs, d => d.mds_y);

        const xScale = d3.scaleLinear().domain(xExtent).range([40, svgWidth - 40]);
        const yScale = d3.scaleLinear().domain(yExtent).range([40, svgHeight - 40]);

        // Initialize positions
        docs.forEach(d => {
            d.x = xScale(d.mds_x);
            d.y = yScale(d.mds_y);
        });

        const clusterIds = [...new Set(docs.map(d => d.cluster))];
        const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(clusterIds);

        const tooltip = d3.select("#mds-view")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "6px 10px")
            .style("border-radius", "4px")
            .style("pointer-events", "none")
            .style("font-size", "13px")
            .style("z-index", "999");

        const nodes = svg.selectAll("circle")
            .data(docs)
            .enter()
            .append("circle")
            .attr("r", 5)
            .attr("fill", d => colorScale(d.cluster))
            .attr("id", d => `node-${d.id}`)
            .on("mouseover", function (event, d) {
                $(`#doc-${d.id}`).css("background-color", "#ffeb3b");
                tooltip.transition().duration(200).style("opacity", 1);
                tooltip.html(`
                    <strong>${d.name}</strong><br>
                    <u>Top Terms:</u><br>
                    ${d.top_terms?.join(", ") || "None"}
                `);



                const listItem = document.getElementById(`doc-${d.id}`);
                if (listItem) {
                    listItem.scrollIntoView({ behavior: "smooth", block: "center" });
                    listItem.style.outline = "2px solid #2196F3";
                }
            })
            .on("mousemove", function (event) {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", function (event, d) {
                $(`#doc-${d.id}`).css("background-color", "");
                tooltip.transition().duration(200).style("opacity", 0);

                const listItem = document.getElementById(`doc-${d.id}`);
                if (listItem) {
                    listItem.style.outline = "";
                }
            })
            .on("click", function (event, d) {
                $(`#doc-${d.id}`).trigger("click");
            });

        // Force simulation to prevent overlaps, with animation
        const simulation = d3.forceSimulation(docs)
            .force("x", d3.forceX(d => d.x).strength(0.05))
            .force("y", d3.forceY(d => d.y).strength(0.05))
            .force("collide", d3.forceCollide(8)) // Radius + padding
            .alpha(1)
            .alphaDecay(0.03) // Slower decay so it visibly settles
            .on("tick", ticked);

        function ticked() {
            nodes
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
        }
    }



        populateDocumentList(documents);

        $("#close-all-btn").click(function () {
            $(".document-window").remove();
        });

        $(document).on("click", ".doc-item", function () {
            const docId = $(this).attr('id').split('-')[1];
            const doc = documents.find(d => d.id == docId);

            if ($(`#doc-window-${docId}`).length === 0) {
                const docWindow = `
                    <div id="doc-window-${doc.id}" class="document-window" style="top: 50px; left: 50px;">
                        <h3>${doc.name}</h3>
                        <pre>${doc.content}</pre>
                        <button class="close-btn" data-doc-id="${doc.id}">X</button>
                    </div>
                `;
                $("#workspace").append(docWindow);

                $(`#doc-window-${doc.id}`).draggable().resizable();

                $(`#doc-window-${doc.id}`).click(function () {
                    $(".document-window").css("z-index", 1);
                    $(this).css("z-index", 10);
                });

                $(".close-btn").click(function () {
                    const docIdToRemove = $(this).data('doc-id');
                    $(`#doc-window-${docIdToRemove}`).remove();
                });
            }
        });

    $("#doc-list").sortable();

    $('#file-input').change(function (event) {
        const files = event.target.files;
        Array.from(files).forEach(file => {
            const fileType = file.type;
            const fileName = file.name;
            const reader = new FileReader();

            reader.onload = function (e) {
                const content = e.target.result;
                const newDocId = documents.length + 1;

                if (fileType === "text/plain" || fileName.endsWith(".txt") || fileType === "" || fileType === "application/octet-stream") {
                    documents.push({ id: newDocId, content: content, name: fileName });

                    $('#doc-list').append(`
                        <li id="doc-${newDocId}" class="doc-item">
                            ${fileName}
                            <button class="remove-btn" data-doc-id="${newDocId}">Remove</button>
                        </li>
                    `);

                } else if (fileType === "text/csv" || fileName.endsWith(".csv")) {
                    Papa.parse(content, {
                        header: true,
                        dynamicTyping: true,
                        complete: function (results) {
                            const csvContent = JSON.stringify(results.data);
                            const csvDocId = documents.length + 1;
                            const headers = results.meta.fields;

                            documents.push({ id: csvDocId, content: csvContent, name: fileName });

                            $('#doc-list').append(`
                                <li id="doc-${csvDocId}" class="doc-item">
                                    ${fileName}
                                    <button class="remove-btn" data-doc-id="${csvDocId}">Remove</button>
                                </li>
                            `);
                        }
                    });
                } else {
                    alert("Unsupported file type: " + fileName);
                }

                $(".close-btn").click(function () {
                    const docIdToRemove = $(this).data('doc-id');
                    $(`#doc-window-${docIdToRemove}`).remove();
                });
            };

            reader.readAsText(file);
        });
    });

    $(document).on("click", ".remove-btn", function () {
        const docId = $(this).data('doc-id');
        $(`#doc-${docId}`).remove();
        $(`#doc-window-${docId}`).remove();
        const docIndex = documents.findIndex(d => d.id === docId);
        if (docIndex !== -1) {
            documents.splice(docIndex, 1);
        }
    });

    $("#cluster-btn").click(function () {
        $.ajax({
            url: "http://localhost:5000/cluster",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({ documents: documents }),
            success: function (clusteredDocs) {
                $("#doc-list").empty();

                const clusters = {};
                clusteredDocs.forEach(doc => {
                    if (!clusters[doc.cluster]) clusters[doc.cluster] = [];
                    clusters[doc.cluster].push(doc);
                });

                documents.length = 0;
                clusteredDocs.forEach(doc => documents.push(doc));

                Object.keys(clusters).forEach(clusterId => {
                    const blockId = `cluster-block-${clusterId}`;
                    const topTerms = clusters[clusterId][0]?.top_terms || [];

                    const block = $(
                        `<div class="cluster-block" id="${blockId}">
                            <div class="cluster-info">
                                <strong>Top terms:</strong> ${topTerms.join(", ")}
                            </div>
                            <h4>
                                Cluster ${clusterId}
                                <button class="toggle-cluster" data-cluster-id="${clusterId}">▼</button>
                                <button class="open-cluster-btn" data-cluster-id="${clusterId}">Open All</button>
                            </h4>
                            <ul id="cluster-list-${clusterId}" class="cluster-docs"></ul>
                        </div>`
                    );

                    clusters[clusterId].forEach(doc => {
                        block.find("ul").append(`
                            <li id="doc-${doc.id}" class="doc-item">
                                ${doc.name || "Document " + doc.id}
                                <button class="remove-btn" data-doc-id="${doc.id}">Remove</button>
                            </li>
                        `);
                    });

                    $("#doc-list").append(block);
                });

                $("#doc-list").sortable({ items: ".cluster-block" });
                drawMDSPlot(clusteredDocs);
            },
            error: function (xhr, status, error) {
                console.error("Error clustering:", error);
            }
        });
    });

    $(document).on("click", ".toggle-cluster", function () {
        const clusterId = $(this).data("cluster-id");
        $(`#cluster-list-${clusterId}`).slideToggle();
        $(this).text(function (_, current) {
            return current === "▼" ? "▲" : "▼";
        });
    });

    $(document).on("click", ".open-cluster-btn", function () {
        const clusterId = $(this).data("cluster-id");
        const docsInCluster = documents.filter(d => d.cluster == clusterId);

        docsInCluster.forEach(doc => {
            if ($(`#doc-window-${doc.id}`).length === 0) {
                const docWindow = `
                    <div id="doc-window-${doc.id}" class="document-window" style="top: 50px; left: 50px;">
                        <h3>${doc.name || "Document " + doc.id}</h3>
                        <pre>${doc.content}</pre>
                        <button class="close-btn" data-doc-id="${doc.id}">X</button>
                    </div>
                `;
                $("#workspace").append(docWindow);
                $(`#doc-window-${doc.id}`).draggable().resizable();

                $(`#doc-window-${doc.id}`).click(function () {
                    $(".document-window").css("z-index", 1);
                    $(this).css("z-index", 10);
                });

                $(".close-btn").click(function () {
                    const docIdToRemove = $(this).data('doc-id');
                    $(`#doc-window-${docIdToRemove}`).remove();
                });
            }
        });
    });
});