const containerDiv = document.getElementById('visualization_1');
const width = containerDiv.clientWidth;
const height = containerDiv.clientHeight;
const margin = {top: 10, right: 250, bottom: 50, left: 300};

// Create SVG container with zoom behavior
const svg = d3.select("#visualization_1")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
    
// Disable zoom and pan behavior
svg.on("wheel.zoom", null)
   .on("mousedown.zoom", null)
   .on("touchstart.zoom", null)
   .on("touchmove.zoom", null)
   .on("touchend.zoom", null);
    
// Create tooltip with more specific styling
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Counter for generating unique IDs
let i = 0;
    
// Load and process data
d3.csv("archive/covid.csv").then(function(data) {
    // Process data to create hierarchy
    const regions = d3.group(data, d => d.region);
    
    // Calculate totals for India
    const indiaTotals = data.reduce((acc, curr) => {
        acc.dose1 += +curr.dose1;
        acc.dose2 += +curr.dose2;
        acc.precaution_dose += +curr.precaution_dose;
        acc.total = acc.dose1 + acc.dose2 + acc.precaution_dose;
        return acc;
    }, {dose1: 0, dose2: 0, precaution_dose: 0, total: 0});
    
    // Calculate totals for each region
    const regionData = Array.from(regions, ([region, states]) => {
        const regionTotals = states.reduce((acc, curr) => {
            acc.dose1 += +curr.dose1;
            acc.dose2 += +curr.dose2;
            acc.precaution_dose += +curr.precaution_dose;
            acc.total = acc.dose1 + acc.dose2 + acc.precaution_dose;
            return acc;
        }, {dose1: 0, dose2: 0, precaution_dose: 0, total: 0});
        
        return {
            name: region,
            dose1: regionTotals.dose1,
            dose2: regionTotals.dose2,
            precaution_dose: regionTotals.precaution_dose,
            total: regionTotals.total,
            children: states.map(state => ({
                name: state.state,
                dose1: +state.dose1,
                dose2: +state.dose2,
                precaution_dose: +state.precaution_dose,
                total: +state.dose1 + +state.dose2 + +state.precaution_dose
            }))
        };
    });
    
    // Create hierarchical data structure
    const hierarchicalData = {
        name: "India",
        dose1: indiaTotals.dose1,
        dose2: indiaTotals.dose2,
        precaution_dose: indiaTotals.precaution_dose,
        total: indiaTotals.total,
        children: regionData
    };

    // Rest of the tree setup code remains the same until the nodeEnter section
    const tree = d3.tree()
        .size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    
    const root = d3.hierarchy(hierarchicalData);
    tree(root);
    root.x0 = height / 2;
    root.y0 = 0;
    
    if (root.children) {
        root.children.forEach(collapse);
    }
    
    update(root);
    
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }
    
    function update(source) {
        const duration = 750;
        
        const nodes = root.descendants();
        const links = root.links();
        
        nodes.forEach(d => {
            d.y = d.depth * 200;
        });
        
        const node = g.selectAll(".node")
            .data(nodes, d => d.id || (d.id = ++i));
        
        // Enter any new nodes
        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .on("click", (event, d) => {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            })
            // Add mouseenter event for tooltip
            .on("mouseenter", (event, d) => {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`
                    <strong>${d.data.name}</strong><br/>
                    Dose 1: ${d3.format(",")(d.data.dose1)}<br/>
                    Dose 2: ${d3.format(",")(d.data.dose2)}<br/>
                    Precaution Dose: ${d3.format(",")(d.data.precaution_dose)}<br/>
                    <strong>Total Doses: ${d3.format(",")(d.data.total)}</strong>
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            // Add mouseleave event for tooltip
            .on("mouseleave", () => {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        
        // Add Circle for the nodes
        nodeEnter.append("circle")
            .attr("r", 6)
            .style("fill", d => d._children ? "#ffffff" : "rgba(255, 255, 255, 0.2)")
            .style("stroke", "#ffffff");
        
        // Add labels for the nodes
        nodeEnter.append("text")
            .attr("dy", d => {
                if (d.depth === 1 && d.children) {
                    return "-1.5em";
                }
                return ".35em";
            })
            .attr("x", d => d.depth === 0 ? -10 : 10)
            .attr("text-anchor", d => d.depth === 0 ? "end" : "start")
            .text(d => d.data.name)
            .style("font-size", "12px")

        // Modified details text to show only total doses
        nodeEnter.append("text")
            .attr("class", "node-details")
            .attr("dy", d => {
                if (d.depth === 1 && d.children) {
                    return "-0.5em";
                }
                return ".35em";
            })
            .attr("x", d => {
                if (d.depth === 0) return 10;
                const nameWidth = d.data.name.length * 6;
                return nameWidth + 20;
            })
            .attr("text-anchor", "start")
            .style("opacity", d => (!d.children && !d._children) || d._children ? 1 : 0)
            .text(d => {
                if ((!d.children && !d._children) || d._children) {
                    return `(Total Doses: ${d3.format(",")(d.data.total)})`;
                }
                return "";
            });
        
        // Update the nodes
        const nodeUpdate = node.merge(nodeEnter)
            .transition()
            .duration(duration)
            .attr("transform", d => `translate(${d.y},${d.x})`);
        
        // Update circle appearance
        nodeUpdate.select("circle")
            .attr("r", 6)
            .style("fill", d => d._children ? "#ffffff" : "rgba(255, 255, 255, 0.2)")
            .style("stroke", "#ffffff");

        // Update text positions
        nodeUpdate.select("text")
            .attr("dy", d => {
                if (d.depth === 1 && d.children) {
                    return "-1.5em";
                }
                return ".35em";
            });

        // Update details text
        nodeUpdate.select(".node-details")
            .attr("dy", d => {
                if (d.depth === 1 && d.children) {
                    return "-0.5em";
                }
                return ".35em";
            })
            .style("opacity", d => (!d.children && !d._children) || d._children ? 1 : 0)
            .attr("x", d => {
                if (d.depth === 0) return 10;
                const nameWidth = d.data.name.length * 6;
                return nameWidth + 20;
            })
            .text(d => {
                if ((!d.children && !d._children) || d._children) {
                    return `(Total Doses: ${d3.format(",")(d.data.total)})`;
                }
                return "";
            });
        
        // Handle exiting nodes
        const nodeExit = node.exit()
            .transition()
            .duration(duration)
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .remove();
        
        nodeExit.select("circle")
            .attr("r", 0);
        
        nodeExit.selectAll("text")
            .style("fill-opacity", 0);
        
        // Update the links
        const link = g.selectAll(".link")
            .data(links, d => d.target.id);
        
        // Enter any new links
        const linkEnter = link.enter()
            .insert("path", "g")
            .attr("class", "link")
            .attr("d", d => {
                const o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });
        
        // Update links
        link.merge(linkEnter)
            .transition()
            .duration(duration)
            .attr("d", diagonal);
        
        // Remove exiting links
        link.exit()
            .transition()
            .duration(duration)
            .attr("d", d => {
                const o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();
        
        // Store the old positions for transition
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }
    
    function diagonal(d) {
        return `M ${d.source.y} ${d.source.x}
                C ${(d.source.y + d.target.y) / 2} ${d.source.x},
                  ${(d.source.y + d.target.y) / 2} ${d.target.x},
                  ${d.target.y} ${d.target.x}`;
    }
});