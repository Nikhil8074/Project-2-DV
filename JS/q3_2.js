const container2 = document.getElementById('visualization_2');
const width2 = container2.clientWidth;
const height2 = container2.clientHeight*0.85;
const margin2 = {top: 30, right: 30, bottom: 100, left: 80};
const innerWidth2 = width2 - margin2.left - margin2.right;
const innerHeight2 = height2 - margin2.top - margin2.bottom;

const svg2 = d3.select("#visualization_2")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width2} ${height2}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const g2 = svg2.append("g")
    .attr("transform", `translate(${margin2.left},${margin2.top})`);

const tooltip2 = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


const buttonContainer = d3.select("#visualization_2")
    .insert("div", "svg")
    .style("margin-bottom", "20px")
    .style("display", "flex")
    .style("gap", "10px")
    .style("justify-content", "center");

const buttons = buttonContainer
    .selectAll("button")
    .data([
        { id: "chronological", text: "Chronological" },
        { id: "ascending", text: "Ascending" },
        { id: "descending", text: "Descending" }
    ])
    .enter()
    .append("button")
    .attr("class", "back-button")
    .style("position", "static")
    .style("padding", "8px 16px")
    .style("font-size", "14px")
    .classed("active", d => d.id === "chronological")
    .text(d => d.text);

const color = d3.scaleOrdinal()
    .domain(["dose_one", "dose_two", "dose_precaution"])
    .range(["#74c476", "#31a354", "#006d2c"]);

const x = d3.scaleBand()
    .range([0, innerWidth2])
    .padding(0.2);

const y = d3.scaleLinear()
    .range([innerHeight2, 0])
    .nice();

function getDoseName(key) {
    const names = {
        "dose_one": "First Dose",
        "dose_two": "Second Dose", 
        "dose_precaution": "Precaution Dose"
    };
    return names[key] || key;
}

function formatMonthYear(monthStr) {
    const date = d3.timeParse("%Y-%m")(monthStr);
    return d3.timeFormat("%b %Y")(date);
}

d3.csv("archive/q3_montly.csv").then(function(data) {

    data.forEach(d => {
        d.month = d.month;
        d.dose_one = +d.dose_one;
        d.dose_two = +d.dose_two;
        d.dose_precaution = +d.dose_precaution;
        d.total = +d.total;
        d.date = d3.timeParse("%Y-%m")(d.month);
    });

    function updateChart(sortType) {
        let sortedData = [...data];
        switch(sortType) {
            case "ascending":
                sortedData.sort((a, b) => a.total - b.total);
                break;
            case "descending":
                sortedData.sort((a, b) => b.total - a.total);
                break;
            default:
                sortedData.sort((a, b) => a.date - b.date);
        }

        x.domain(sortedData.map(d => d.month));
        y.domain([0, d3.max(sortedData, d => d.total)]);

        buttons.classed("active", d => d.id === sortType)
            .style("background", d => d.id === sortType ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)");

        const stack = d3.stack()
            .keys(["dose_one", "dose_two", "dose_precaution"]);
        const stackedData = stack(sortedData);

        const barGroups = g2.selectAll(".stacked-bar-group")
            .data(stackedData);

        const barGroupsEnter = barGroups.enter()
            .append("g")
            .attr("class", "stacked-bar-group")
            .attr("fill", d => color(d.key));

        const bars = barGroups.merge(barGroupsEnter)
            .selectAll("rect")
            .data(d => d);

        bars.enter()
            .append("rect")
            .merge(bars)
            .on("mouseover", function(event, d) {
                const doseName = getDoseName(this.parentNode.__data__.key);
                const doseValue = (d[1] - d[0]).toLocaleString();
                const monthName = formatMonthYear(d.data.month);
                
                tooltip2.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip2.html(`
                    <strong>${monthName}</strong><br>
                    ${doseName}: ${doseValue} doses<br>
                    (${((d[1] - d[0]) / d.data.total * 100).toFixed(1)}% of monthly total)
                `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
                    
                d3.select(this)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);
            })
            .on("mouseout", function() {
                tooltip2.transition()
                    .duration(500)
                    .style("opacity", 0);
                    
                d3.select(this)
                    .attr("stroke", "none");
            })
            .transition()
            .duration(750) 
            .ease(d3.easeCubicOut)
            .attr("x", d => x(d.data.month))
            .attr("y", d => Math.max(0, y(d[1])))
            .attr("height", d => Math.max(0, y(d[0]) - y(d[1]))) 
            .attr("width", x.bandwidth());

    
        bars.exit().remove();

        
        g2.select(".x-axis")
            .transition()
            .duration(750)
            .call(d3.axisBottom(x)
                .tickFormat(d => formatMonthYear(d)))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)")
            .style("fill", "#ffffff");

        g2.select(".y-axis")
            .transition()
            .duration(750)
            .call(d3.axisLeft(y)
                .tickFormat(d => d3.format(".2s")(d)))
            .selectAll("text")
            .style("fill", "#ffffff");
    }

    buttons.on("click", function(event, d) {
        updateChart(d.id);
    });

    g2.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight2})`);

    g2.append("g")
        .attr("class", "y-axis");

    g2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight2 / 2)
        .attr("y", -margin2.left + 20) 
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#ffffff")
        .text("Number of Vaccine Doses");

    const legend = svg2.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin2.left + innerWidth2 - 270}, ${margin2.top - 30})`);

    const doseTypes = [
        {key: "dose_one", label: "First Dose"},
        {key: "dose_two", label: "Second Dose"},
        {key: "dose_precaution", label: "Precaution Dose"}
    ];

    const legendItems = legend.selectAll(".legend-item")
        .data(doseTypes)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => color(d.key));

    legendItems.append("text")
        .attr("x", 25)
        .attr("y", 12)
        .style("font-size", "12px")
        .style("fill", "black")
        .text(d => d.label);

    legend.insert("rect", ":first-child")
        .attr("x", -10)
        .attr("y", -10)
        .attr("width", 160)
        .attr("height", 95)
        .attr("fill", "rgba(255, 255, 255, 0.5)")
        .style("backdrop-filter", "blur(50px)")
        .style("border", "1px solid rgba(255, 255, 255, 0.2)")
        .style("border-radius", "8px")
        .attr("ry", 5);

    updateChart("chronological");
});