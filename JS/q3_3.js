const container3 = document.getElementById('visualization_3');
const width3 = container3.clientWidth;
const height3 = container3.clientHeight * 0.85;
const margin3 = {top: 30, right: 30, bottom: 100, left: 80};
const innerWidth3 = width3 - margin3.left - margin3.right;
const innerHeight3 = height3 - margin3.top - margin3.bottom;

const svg3 = d3.select("#visualization_3")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${width3} ${height3}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const g3 = svg3.append("g")
    .attr("transform", `translate(${margin3.left},${margin3.top})`);

const tooltip3 = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);


const buttonContainer3 = d3.select("#visualization_3")
    .insert("div", "svg")
    .style("margin-bottom", "20px")
    .style("display", "flex")
    .style("gap", "10px")
    .style("justify-content", "center");

const buttons3 = buttonContainer3
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

const colorAge = d3.scaleOrdinal()
    .domain(["children", "teens", "adults", "middle_aged", "senior"])
    .range(["#ff7f0e", "#1f77b4", "#2ca02c", "#d62728", "#9467bd"]);

const x3 = d3.scaleBand()
    .range([0, innerWidth3])
    .padding(0.1);

const x3Group = d3.scaleBand()
    .padding(0.01);

const y3 = d3.scaleLinear()
    .range([innerHeight3, 0]);

function formatMonthYear3(monthStr) {
    const date = d3.timeParse("%Y-%m")(monthStr);
    return d3.timeFormat("%b %Y")(date);
}

function getAgeName(key) {
    const names = {
        "children": "Children",
        "teens": "Teens",
        "adults": "Adults",
        "middle_aged": "Middle Aged",
        "senior": "Senior"
    };
    return names[key] || key;
}

d3.csv("archive/q3_montly.csv").then(function(data) {
    data.forEach(d => {
        d.month = d.month;
        d.children = +d.children;
        d.teens = +d.teens;
        d.adults = +d.adults;
        d.middle_aged = +d.middle_aged;
        d.senior = +d.senior;
        d.date = d3.timeParse("%Y-%m")(d.month);
        d.total_age = d.children + d.teens + d.adults + d.middle_aged + d.senior;
    });

    const ageGroups = ["children", "teens", "adults", "middle_aged", "senior"];

    function updateChart3(sortType) {
        let sortedData = [...data];
        switch(sortType) {
            case "ascending":
                sortedData.sort((a, b) => a.total_age - b.total_age);
                break;
            case "descending":
                sortedData.sort((a, b) => b.total_age - a.total_age);
                break;
            default:
                sortedData.sort((a, b) => a.date - b.date);
        }

        x3.domain(sortedData.map(d => d.month));
        x3Group.domain(ageGroups).range([0, x3.bandwidth()]);
        y3.domain([0, d3.max(sortedData, d => 
            Math.max(d.children, d.teens, d.adults, d.middle_aged, d.senior)
        )]).nice();

        buttons3.classed("active", d => d.id === sortType)
            .style("background", d => d.id === sortType ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)");

        const barGroups = g3.selectAll(".month-group")
            .data(sortedData);

        const barGroupsEnter = barGroups.enter()
            .append("g")
            .attr("class", "month-group")
            .attr("transform", d => `translate(${x3(d.month)},0)`);

        barGroups.transition()
            .duration(750)
            .attr("transform", d => `translate(${x3(d.month)},0)`);

        barGroups.exit().remove();

        const allGroups = barGroups.merge(barGroupsEnter);

        ageGroups.forEach(age => {
            const bars = allGroups.selectAll(`.bar-${age}`)
                .data(d => [{
                    month: d.month,
                    value: d[age],
                    age: age,
                    total: d.total_age
                }]);

            bars.enter()
                .append("rect")
                .attr("class", `bar-${age}`)
                .attr("x", d => x3Group(age))
                .attr("y", innerHeight3)
                .attr("width", x3Group.bandwidth())
                .attr("height", 0)
                .attr("fill", colorAge(age))
                .merge(bars)
                .on("mouseover", function(event, d) {
                    tooltip3.transition()
                        .duration(200)
                        .style("opacity", 0.9);
                    tooltip3.html(`
                        <strong>${formatMonthYear3(d.month)}</strong><br>
                        ${getAgeName(d.age)}: ${d.value.toLocaleString()} vaccinations<br>
                        (${((d.value / d.total) * 100).toFixed(1)}% of monthly total)
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    
                    d3.select(this)
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 2);
                })
                .on("mouseout", function() {
                    tooltip3.transition()
                        .duration(500)
                        .style("opacity", 0);
                    
                    d3.select(this)
                        .attr("stroke", "none");
                })
                .transition()
                .duration(750)
                .attr("x", d => x3Group(age))
                .attr("y", d => y3(d.value))
                .attr("width", x3Group.bandwidth())
                .attr("height", d => innerHeight3 - y3(d.value));

            bars.exit().remove();
        });

        g3.select(".x-axis3")
            .attr("transform", `translate(0,${innerHeight3})`)
            .transition()
            .duration(750)
            .call(d3.axisBottom(x3)
                .tickFormat(d => formatMonthYear3(d)))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)")
            .style("fill", "#ffffff");

        g3.select(".y-axis3")
            .transition()
            .duration(750)
            .call(d3.axisLeft(y3)
                .tickFormat(d => d3.format(".2s")(d)))
            .selectAll("text")
            .style("fill", "#ffffff");
    }

    buttons3.on("click", function(event, d) {
        updateChart3(d.id);
    });

    g3.append("g")
        .attr("class", "x-axis3")
        .attr("transform", `translate(0,${innerHeight3})`);

    g3.append("g")
        .attr("class", "y-axis3");

    g3.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight3 / 2)
        .attr("y", -margin3.left + 20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "#ffffff")
        .text("Number of Vaccinations");

    const legend3 = svg3.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin3.left + innerWidth3 - 300}, ${margin3.top - 70})`);

    const ageTypes = [
        {key: "children", label: "Children (5-11 years old)"},
        {key: "teens", label: "Teens (12-17 years old)"},
        {key: "adults", label: "Adults (18-44 years old)"},
        {key: "middle_aged", label: "Middle Aged (45-64 years old)"},
        {key: "senior", label: "Senior (65+ years old)"},
    ];

    const legendItems3 = legend3.selectAll(".legend-item")
        .data(ageTypes)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    legendItems3.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => colorAge(d.key));

    legendItems3.append("text")
        .attr("x", 25)
        .attr("y", 12)
        .style("font-size", "12px")
        .style("fill", "black")
        .text(d => d.label);

    legend3.insert("rect", ":first-child")
        .attr("x", -10)
        .attr("y", -10)
        .attr("width", 220)
        .attr("height", 145)
        .attr("fill", "rgba(255, 255, 255, 0.5)")
        .style("backdrop-filter", "blur(50px)")
        .style("border", "1px solid rgba(255, 255, 255, 0.2)")
        .style("border-radius", "8px")
        .attr("ry", 5);

    updateChart3("chronological");
});