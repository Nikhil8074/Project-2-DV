const width = 1000, height = 600;
const graphWidth = 1000, graphHeight = 455;
const margin = { top: 40, right: 40, bottom: 60, left: 60 };

const projection = d3.geoMercator()
    .center([78.9629, 22.5937])
    .scale(1200)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);
const mapSvg = d3.select("#map");
const graphSvg = d3.select("#graph");
const monthParser = d3.timeParse("%B");
const monthOrder = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const preLockdownMonths = ["January", "February", "March"];
const lockdownMonths = ["April", "May", "June"];
const postLockdownMonths = ["July", "August", "September", "October", "November", "December"];


const periodColors = {
    preLockdown: "#2a9d8f",
    lockdown: "#e63946",
    postLockdown: "#f9c74f"
};

function getPeriodClass(month) {
    if (preLockdownMonths.includes(month)) return "data-point-pre";
    if (lockdownMonths.includes(month)) return "data-point-lockdown";
    return "data-point-post";
}

function getPeriodColor(month) {
    if (preLockdownMonths.includes(month)) return periodColors.preLockdown;
    if (lockdownMonths.includes(month)) return periodColors.lockdown;
    return periodColors.postLockdown;
}

const cities = [
    { name: "Delhi", coords: [77.1025, 28.7041] },
    { name: "Mumbai", coords: [72.8777, 19.0760] },
    { name: "Bangalore", coords: [77.5946, 12.9716] },
    { name: "Chennai", coords: [80.2707, 13.0827] },
    { name: "Hyderabad", coords: [78.4867, 17.3850] }
];

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

d3.json("https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson")
    .then(function (data) {
        mapSvg.append("g")
            .selectAll("path")
            .data(data.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "#e9ecef")
            .attr("stroke", "#cbd5e0")
            .style("opacity", 0)
            .transition()
            .duration(1000)
            .delay((d, i) => i * 50)
            .style("opacity", 1);

        cities.forEach((city, i) => {
            const [x, y] = projection(city.coords);
            const g = mapSvg.append("g")
                .attr("class", "city-group")
                .style("cursor", "pointer")
                .style("opacity", 0)
                .on("click", () => showCityData(city.name))
                .on("mouseover", function (event) {
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);
                    tooltip.html(`Click to view ${city.name}'s AQI data`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });

            g.transition()
                .duration(500)
                .delay(1000 + i * 200)
                .style("opacity", 1);

            g.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 8)
                .attr("class", "city-marker");

            g.append("text")
                .attr("x", x)
                .attr("y", y - 15)
                .attr("class", "city-label")
                .text(city.name);
        });
    });

function showMap() {
    document.querySelector('.map-view').classList.remove('hidden');
    document.querySelector('.graph-view').classList.remove('active');
}

function showCityData(cityName) {
    document.querySelector('.map-view').classList.add('hidden');
    document.querySelector('.graph-view').classList.add('active');
    d3.select("#graph-title").text(`Monthly AQI Trends - ${cityName}`).style("color", "#ffffff");

    d3.csv(`archive/q2_${cityName.toLowerCase()}_aqi.csv`).then(data => {
        const parsedData = data
            .map(d => ({
                month: monthParser(d.month),
                monthName: d.month,
                avg_aqi: +d.avg_aqi
            }))
            .sort((a, b) => monthOrder.indexOf(a.monthName) - monthOrder.indexOf(b.monthName));

        graphSvg.selectAll("*").remove();

        const xScale = d3.scalePoint()
            .domain(monthOrder)
            .range([margin.left, graphWidth - margin.right])
            .padding(0.5);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(parsedData, d => d.avg_aqi)])
            .range([graphHeight - margin.bottom, margin.top]);

        graphSvg.append("g")
            .attr("transform", `translate(0,${graphHeight - margin.bottom})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .style("fill","#ffffff")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)")
            .style("opacity", 0)
            .transition()
            .duration(500)
            .delay((d, i) => i * 50)
            .style("opacity", 1);

        graphSvg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale))
            .style("opacity", 0)
            .transition()
            .duration(500)
            .style("opacity", 1)
            .selectAll("text")
            .style("fill", "#ffffff");


        function drawLineSegment(periodData, color) {
            const line = d3.line()
                .x(d => xScale(d.monthName))
                .y(d => yScale(d.avg_aqi))
                .curve(d3.curveMonotoneX);


            if (periodData.length > 0) {
                const path = graphSvg.append("path")
                    .datum(periodData)
                    .attr("class", "line")
                    .attr("stroke", color)
                    .attr("d", line);

                setTimeout(() => {
                    path.classed("visible", true);
                }, 200);
            }
        }


        const preLockdownData = parsedData.filter(d => preLockdownMonths.includes(d.monthName));
        const lockdownData = parsedData.filter(d => lockdownMonths.includes(d.monthName));
        const postLockdownData = parsedData.filter(d => postLockdownMonths.includes(d.monthName));


        const points = graphSvg.selectAll("circle")
            .data(parsedData)
            .enter()
            .append("circle")
            .attr("class", d => getPeriodClass(d.monthName))
            .attr("cx", d => xScale(d.monthName))
            .attr("cy", d => yScale(d.avg_aqi))
            .attr("r", 5)
            .style("opacity", 0)
            .style("animation-delay", (d, i) => `${i * 100}ms`)
            .on("mouseover", function (event, d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                let period = "Post-lockdown";
                if (preLockdownMonths.includes(d.monthName)) period = "Pre-lockdown";
                if (lockdownMonths.includes(d.monthName)) period = "Lockdown";
                
                tooltip.html(`${d.monthName} (${period})<br/>AQI: ${d.avg_aqi.toFixed(2)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });


        points.transition()
            .duration(500)
            .delay((d, i) => i * 100)
            .style("opacity", 1)
            .on("end", function (d, i) {

                if (i === parsedData.length - 1) {

                    drawLineSegment(preLockdownData, periodColors.preLockdown);
                    drawLineSegment(lockdownData, periodColors.lockdown);
                    drawLineSegment(postLockdownData, periodColors.postLockdown);
                }
            });


        graphSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", graphWidth / 2)
            .attr("y", graphHeight - 10)
            .text("Month")
            .style("fill", "#ffffff");

        graphSvg.append("text")
            .attr("class", "permanent-axis-label")  
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("x", -(graphHeight - margin.top - margin.bottom) / 2 - margin.top)
            .attr("y", margin.left / 3)
            .style("font-weight", "bold")
            .style("font-size", "20px")
            .style("fill", "#ffffff")
            .style("opacity", "1")
            .text("Average AQI");

    }).catch(error => {
        console.error("Error loading CSV:", error);
        document.querySelector('.graph-view').innerHTML =
            `<p style="color: #e63946; text-align: center;">Error loading data for ${cityName}</p>`;
    });
}