let covidData = {};
let dragging = false;
let lastMousePosition = { x: 0, y: 0 };
let selectedCountryId = null;
let top10Countries = [];


d3.csv("archive/Global_data.csv").then(data => {
    data.forEach(d => {
        covidData[d.Country] = {
            country: d.Country,
            totalCases: +d.TotalCases,
            totalDeaths: +d.TotalDeaths,
            totalRecovered: +d.TotalRecovered,
            population: +d.Population,
            casesPerMillion: +d.CasesPerMillion,
            deathsPerMillion: +d.DeathsPerMillion,
            testsPerMillion: +d.TestsPerMillion
        };
    });

    top10Countries = Object.values(covidData)
        .sort((a, b) => b.totalDeaths - a.totalDeaths)
        .slice(0, 10);

    initGlobe();
    updateTopCountriesPanel();
    updateGlobalStats();
});

function updateTopCountriesPanel() {
    const panel = d3.select("#top-countries-list");
    const maxDeaths = d3.max(top10Countries, d => d.totalDeaths);

    const items = panel.selectAll(".top-country-item")
        .data(top10Countries)
        .enter()
        .append("div")
        .attr("class", "top-country-item");

    items.append("span")
        .attr("class", "country-rank")
        .text((d, i) => `#${i + 1}`);

    const stats = items.append("div")
        .attr("class", "country-stats");

    stats.append("div")
        .text(d => d.country);

    stats.append("div")
        .attr("class", "stat-value")
        .text(d => d.totalDeaths.toLocaleString());

    stats.append("div")
        .attr("class", "death-bar")
        .style("width", "0")
        .transition()
        .duration(1000)
        .style("width", d => `${(d.totalDeaths / maxDeaths) * 100}%`);
}

function updateGlobalStats() {
    const globalStats = {
        totalCases: d3.sum(Object.values(covidData), d => d.totalCases),
        totalDeaths: d3.sum(Object.values(covidData), d => d.totalDeaths),
        totalRecovered: d3.sum(Object.values(covidData), d => d.totalRecovered),
        totalPopulation: d3.sum(Object.values(covidData), d => d.population)
    };

    const mortalityRate = (globalStats.totalDeaths / globalStats.totalCases) * 100;

    const statsContainer = d3.select("#global-stats-content");

    const addStat = (title, value) => {
        const div = statsContainer.append("div");
        div.append("div").attr("class", "stat-title").text(title);
        div.append("div").attr("class", "stat-value").text(value);
    };

    addStat("Total Cases", globalStats.totalCases.toLocaleString());
    addStat("Total Deaths", globalStats.totalDeaths.toLocaleString());
    addStat("Total Recovered", globalStats.totalRecovered.toLocaleString());

    statsContainer.append("div")
        .attr("class", "mortality-rate")
        .html(`
            <div class="stat-title">Global Mortality Rate</div>
            <div class="stat-value">${mortalityRate.toFixed(2)}%</div>
        `);
}


const width = window.innerWidth;
const height = window.innerHeight;
const sensitivity = 75;

const projection = d3.geoOrthographic()
    .scale(500)
    .center([0, 0])
    .rotate([0, -30])
    .translate([width / 2, height / 2]);

const initialScale = projection.scale();
const path = d3.geoPath().projection(projection);

const svg = d3.select("#globe")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const defs = svg.append("defs");
const radialGradient = defs.append("radialGradient")
    .attr("id", "redGradient")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "70%");

radialGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#ff0000")
    .attr("stop-opacity", "0.3");

radialGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#330000")
    .attr("stop-opacity", "0");

svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "url(#redGradient)");

svg.append("circle")
    .attr("fill", "#111")
    .attr("stroke", "#000")
    .attr("stroke-width", "1.5")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", initialScale)
    .style("opacity", "0.6");

const globe = svg.append("g");
let rotating = true;

function createRedDots() {
    const numDots = 30;
    const globeRadius = projection.scale();

    for (let i = 0; i < numDots; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = globeRadius + Math.random() * 100;
        const x = width / 2 + distance * Math.cos(angle);
        const y = height / 2 + distance * Math.sin(angle);

        const dot = svg.append("circle")
            .attr("class", "particle")
            .attr("cx", x)
            .attr("cy", y)
            .attr("r", Math.random() * 3 + 1)
            .attr("fill", "rgba(255, 0, 0, 0.6)")
            .style("opacity", 0);

        dot.transition()
            .duration(2000)
            .style("opacity", 1)
            .transition()
            .duration(3000)
            .attr("cx", x + (Math.random() * 200 - 100))
            .attr("cy", y + (Math.random() * 200 - 100))
            .style("opacity", 0)
            .remove();
    }
}

setInterval(createRedDots, 500);

function initGlobe() {
    Promise.all([
        d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    ]).then(([worldData]) => {
        const minCases = Math.min(...Object.values(covidData).map(d => d.totalCases));
        const maxCases = Math.max(...Object.values(covidData).map(d => d.totalCases));
        const colorScale = d3.scaleSequential(d3.interpolateSpectral)
            .domain([Math.log(maxCases), Math.log(minCases)]);

        globe.selectAll("path")
            .data(topojson.feature(worldData, worldData.objects.countries).features)
            .enter().append("path")
            .attr("class", "country")
            .attr("d", path)
            .attr("id", d => `country-${d.id}`)
            .style("fill", d => {
                const countryData = covidData[d.properties.name];
                return countryData ? colorScale(Math.log(countryData.totalCases)) : '#f0f0f0';
            })
            .style("opacity", 0.8)
            .on("mouseover", function (event, d) {
                if (!selectedCountryId) {
                    const countryData = covidData[d.properties.name];
                    if (countryData) {
                        showQuickInfo(countryData);
                    }
                }
            })
            .on("mouseout", function (event, d) {
                if (!selectedCountryId) {
                    d3.select("#info-panel").classed("visible", false);
                }
            })
            .on("click", function (event, d) {
                event.stopPropagation();
                const countryData = covidData[d.properties.name];
                if (countryData) {
                    selectedCountryId = d.id;
                    rotating = false;
                    focusCountry(d);
                    showDetailedInfo(countryData);
                }
            });

        const legendWidth = 300;
        const legendHeight = 10;

        const legendSvg = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, ${height - 40})`);

        const legendScale = d3.scaleLinear()
            .domain([minCases, maxCases])
            .range([0, legendWidth]);

        const legendAxis = d3.axisBottom(legendScale)
            .ticks(7)
            .tickFormat(d3.format(".0s"));

        legendSvg.selectAll("rect")
            .data(d3.range(legendWidth), d => d)
            .enter().append("rect")
            .attr("x", d => d)
            .attr("y", 0)
            .attr("width", 1)
            .attr("height", legendHeight)
            .style("fill", d => colorScale(Math.log(legendScale.invert(d))));

        legendSvg.append("g")
            .attr("transform", `translate(0, ${legendHeight})`)
            .call(legendAxis);

        svg.call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded));

        d3.select(".reset-rotation").on("click", () => {
            rotating = true;
            projection.rotate([0, -30, 0]);
            globe.selectAll("path").attr("d", path);
        });

        initRotation();
    });
}

function dragStarted(event) {
    rotating = false;
    dragging = true;
    lastMousePosition = { x: event.x, y: event.y };
}

function dragged(event) {
    if (!dragging) return;

    const rotation = projection.rotate();
    const dx = event.x - lastMousePosition.x;
    const dy = event.y - lastMousePosition.y;

    rotation[0] += dx * 0.5;
    rotation[1] -= dy * 0.5;
    rotation[1] = Math.max(-90, Math.min(90, rotation[1]));

    projection.rotate(rotation);
    globe.selectAll("path").attr("d", path);

    lastMousePosition = { x: event.x, y: event.y };
}

function initRotation() {
    let lastTime = d3.now();
    const rotation = [0, -30, 0];
    const rotationSpeed = 0.3;

    function rotate(elapsed) {
        if (!rotating) return;

        const now = d3.now();
        const diff = now - lastTime;
        lastTime = now;

        rotation[0] += rotationSpeed * diff / 60;

        projection.rotate(rotation);
        globe.selectAll("path").attr("d", path);
    }

    d3.timer(rotate);
}

function dragEnded() {
    dragging = false;
}

function focusCountry(d) {
    const centroid = d3.geoCentroid(d);
    const rotation = [-centroid[0], -centroid[1]];

    const interpolate = d3.interpolate(projection.rotate(), rotation);

    d3.transition()
        .duration(1000)
        .tween("rotate", () => {
            return (t) => {
                projection.rotate(interpolate(t));
                globe.selectAll("path").attr("d", path);
            };
        });
}

function showQuickInfo(data) {
    const panel = d3.select("#info-panel")
        .classed("visible", true)
        .html("");

    panel.append("h2")
        .text(data.country);

    const grid = panel.append("div")
        .attr("class", "stat-grid");

    const stats = [
        { label: "Total Cases", value: data.totalCases, class: "cases" },
        { label: "Total Deaths", value: data.totalDeaths, class: "deaths" },
        { label: "Total Recovered", value: data.totalRecovered, class: "recovered" },
        { label: "Population", value: data.population, class: "population" }
    ];

    grid.selectAll(".stat-box")
        .data(stats)
        .enter()
        .append("div")
        .attr("class", d => `stat-box ${d.class}`)
        .html(d => `
            <h3>${d.label}</h3>
            <p>${d.value.toLocaleString()}</p>
        `);

    panel.append("button")
        .attr("class", "view-more")
        .text("Show Details")
        .on("click", () => showDetailedInfo(data));
}

function showDetailedInfo(data) {
    document.querySelector('.global-stats').classList.add('hidden');
    document.getElementById('top-countries-panel').classList.add('hidden');
    
    const panel = d3.select("#info-panel")
        .classed("visible", true)
        .html("");

    panel.append("button")
        .attr("class", "close-button")
        .html("&times;")
        .on("click", () => {
            selectedCountryId = null;
            panel.classed("visible", false);
            document.querySelector('.global-stats').classList.remove('hidden');
            document.getElementById('top-countries-panel').classList.remove('hidden');
            rotating = true;
            globe.selectAll(".country")
                .style("opacity", 1);
        });

    panel.append("h2")
        .text(data.country);

    const grid = panel.append("div")
        .attr("class", "stat-grid");

    const stats = [
        { label: "Total Cases", value: data.totalCases, class: "cases" },
        { label: "Total Deaths", value: data.totalDeaths, class: "deaths" },
        { label: "Total Recovered", value: data.totalRecovered, class: "recovered" },
        { label: "Population", value: data.population, class: "population" }
    ];

    grid.selectAll(".stat-box")
        .data(stats)
        .enter()
        .append("div")
        .attr("class", d => `stat-box ${d.class}`)
        .html(d => `
            <h3>${d.label}</h3>
            <p>${d.value.toLocaleString()}</p>
        `);

    addPieChart(panel, data, "Deaths vs Recovered Cases");
    addPerMillionChart(panel, data);
}

function addPieChart(container, data, title) {
    const width = 300;
    const height = 300;
    const radius = Math.min(width, height) / 2;

    const chartContainer = container.append("div")
        .attr("class", "chart-container");

    chartContainer.append("h3")
        .text("Deaths vs Recovered Cases");

    const svg = chartContainer.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const total = data.totalDeaths + data.totalRecovered;
    const pieData = [
        { label: "Deaths", value: data.totalDeaths },
        { label: "Recovered", value: data.totalRecovered }
    ];

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const color = d3.scaleOrdinal()
        .domain(["Deaths", "Recovered"])
        .range(["#ff1744", "#00c853"]);

    const pie = d3.pie()
        .value(d => d.value);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius - 20);

    const outerArc = d3.arc()
        .innerRadius(radius * 1.1)
        .outerRadius(radius * 1.1);

    const arcs = svg.selectAll("arc")
        .data(pie(pieData))
        .enter()
        .append("g");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.label))
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`${d.data.label}<br/>${d.data.value.toLocaleString()} (${((d.data.value / total) * 100).toFixed(1)}%)`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    arcs.each(function (d) {
        const percentage = (d.data.value / total) * 100;
        if (percentage < 5) {
            const pos = outerArc.centroid(d);
            const midAngle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 1.2 * (midAngle < Math.PI ? 1 : -1);

            svg.append("text")
                .attr("x", pos[0])
                .attr("y", pos[1])
                .attr("dy", "0.35em")
                .style("text-anchor", midAngle < Math.PI ? "start" : "end")
                .style("fill", "#fff")
                .text(`${d.data.label} (${percentage.toFixed(1)}%)`);
        }
    });
}

function addPerMillionChart(container, data) {
    const chartContainer = container.append("div")
        .attr("class", "chart-container");

    chartContainer.append("h3")
        .text("Statistics per Million Population (Log Scale)");

    const width = 600;
    const height = 300;
    const margin = { top: 30, right: 120, bottom: 60, left: 80 };

    const svg = chartContainer.append("svg")
        .attr("width", width)
        .attr("height", height);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const metrics = [
        { name: "Cases", value: data.casesPerMillion },
        { name: "Deaths", value: data.deathsPerMillion },
        { name: "Recovered", value: (data.totalRecovered / data.population) * 1e6 },
        { name: "Tests", value: data.testsPerMillion }
    ].sort((a, b) => b.value - a.value);

    const yTickValues = [1, 1000, 100000, 10000000];

    const x = d3.scaleBand()
        .domain(metrics.map(d => d.name))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const y = d3.scaleLog()
        .domain([1, d3.max(metrics, d => d.value)])
        .range([height - margin.bottom, margin.top])
        .nice();

    svg.selectAll("rect")
        .data(metrics)
        .join("rect")
        .attr("x", d => x(d.name))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - margin.bottom - y(d.value))
        .attr("fill", d => {
            switch (d.name) {
                case "Cases": return "#ff1744";
                case "Deaths": return "#b71c1c";
                case "Recovered": return "#00c853";
                case "Tests": return "#f44336";
                default: return "#666";
            }
        })
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.8);
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`${d.name}<br>${d.value.toLocaleString()} per million`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("fill","#fff")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y)
            .tickValues(yTickValues))
        .selectAll("text")
        .style("fill", "#fff");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", margin.left / 3)
        .attr("x", -(height / 2))
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .text("Per Million (Log Scale)");

    svg.selectAll(".value-label")
        .data(metrics)
        .join("text")
        .attr("class", "value-label")
        .attr("x", d => x(d.name) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) - 5)
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .style("font-size", "12px")
        .text(d => {
            if (d.value >= 1e6) return `${(d.value / 1e6).toFixed(1)}M`;
            if (d.value >= 1e3) return `${(d.value / 1e3).toFixed(1)}K`;
            return d.value.toFixed(0);
        });
}

document.addEventListener('click', (event) => {
    if (!event.target.closest('#info-panel') && !event.target.closest('.country')) {
        selectedCountryId = null;
        d3.select("#info-panel").classed("visible", false);
        document.querySelector('.global-stats').classList.remove('hidden');
        document.getElementById('top-countries-panel').classList.remove('hidden');
        rotating = true;
        globe.selectAll(".country")
            .style("opacity", 1);
    }
});

window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    projection
        .translate([width / 2, height / 2]);

    svg
        .attr("width", width)
        .attr("height", height);

    svg.select("circle")
        .attr("cx", width / 2)
        .attr("cy", height / 2);

    globe.selectAll("path").attr("d", path);
});