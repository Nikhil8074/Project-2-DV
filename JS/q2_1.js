function closeGraph() {
    document.getElementById("line-graph-container").style.display = "none";
    document.getElementById("map-container").style.display = "block";
}
async function createCovidMap() {
    const [covidData, timeSeriesData, indiaGeoJSON] = await Promise.all([
        d3.csv('archive/q2_covid.csv'),
        d3.csv('archive/q2_monthly.csv'),
        d3.json("https://raw.githubusercontent.com/geohacker/india/master/state/india_telengana.geojson")
    ]);

    const width = 800;
    const height = 600;

    const svg = d3.select("#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        // .style("background-color", "rgb(255, 255, 255, 0.1)")
        // .style("backdrop-filter", "blur(10px)")

    const dataMap = new Map(
        covidData.map(d => [d.state, {
            deaths: Number(d.deaths) || 0,
            confirmed: Number(d.confirmed) || 0,
            population: Number(d.population) || 0
        }])
    );

    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(Array.from(dataMap.values()).map(d => d.deaths)) || 1])
        .interpolator(d => d3.interpolateOrRd(0.3 + d * 0.7));

    const projection = d3.geoMercator()
        .fitSize([width, height], indiaGeoJSON);

    const geoPath = d3.geoPath().projection(projection);

    let activeState = null;

    function createLineGraph(stateName) {
        const graphWidth = 600;
        const graphHeight = 375;
        const margin = { top: 20, right: 60, bottom: 75, left: 60 };
        const innerWidth = graphWidth - margin.left - margin.right;
        const innerHeight = graphHeight - margin.top - margin.bottom;

        
        const stateData = timeSeriesData.filter(d => d.region === stateName)
            .map(d => ({
                date: new Date(d.date),
                confirmed: +d.confirmed,
                active: +d.active,
                recovered: +d.cured,
                deaths: +d.deaths
            }))
            .sort((a, b) => a.date - b.date);

        
        d3.select("#line-graph").html("");

        const graphSvg = d3.select("#line-graph")
            .append("svg")
            .attr("width", graphWidth)
            .attr("height", graphHeight);

        const g = graphSvg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const xScale = d3.scaleTime()
            .domain(d3.extent(stateData, d => d.date))
            .range([0, innerWidth]);

        
        const yScaleLeft = d3.scaleLinear()
            .domain([0, d3.max(stateData, d => Math.max(d.confirmed, d.recovered))])
            .range([innerHeight, 0])
            .nice();

        
        const yScaleRight = d3.scaleLinear()
            .domain([0, d3.max(stateData, d => Math.max(d.active, d.deaths))])
            .range([innerHeight, 0])
            .nice();

        
        const lineLeft = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScaleLeft(d.value))
            .curve(d3.curveMonotoneX);

        const lineRight = d3.line()
            .x(d => xScale(d.date))
            .y(d => yScaleRight(d.value))
            .curve(d3.curveMonotoneX);

        const leftAxisCategories = ['confirmed', 'recovered'];
        const rightAxisCategories = ['active', 'deaths'];

        leftAxisCategories.forEach(category => {
            const lineData = stateData.map(d => ({
                date: d.date,
                value: d[category]
            }));

            g.append("path")
                .datum(lineData)
                .attr("class", `line line-${category}`)
                .attr("d", lineLeft);
        });

        rightAxisCategories.forEach(category => {
            const lineData = stateData.map(d => ({
                date: d.date,
                value: d[category]
            }));

            g.append("path")
                .datum(lineData)
                .attr("class", `line line-${category}`)
                .attr("d", lineRight);
        });

        const xAxis = d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(d3.timeFormat("%b %Y"));

        const yAxisLeft = d3.axisLeft(yScaleLeft)
            .ticks(5)
            .tickFormat(d3.format("~s"));

        const yAxisRight = d3.axisRight(yScaleRight)
            .ticks(5)
            .tickFormat(d3.format("~s"));

        g.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xAxis)
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .style("fill", "#ffffff");

        g.append("g")
            .attr("class", "y-axis-left")
            .call(yAxisLeft)
            .selectAll("text")
            .style("fill", "#ffffff");

        g.append("g")
            .attr("class", "y-axis-right")
            .attr("transform", `translate(${innerWidth},0)`)
            .call(yAxisRight)
            .selectAll("text")
            .style("fill", "#ffffff");

   
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth)
            .attr("y", innerHeight + margin.bottom - 5)
            .style("text-anchor", "middle")
            .text("Date")
            .style("fill", "#ffffff");

     
        g.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -margin.left + 15)
            .style("text-anchor", "middle")
            .style("fill", "#FF9F9F")
            .text("Confirmed & Recovered Cases")
            .style("fill", "#ffffff");


        g.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(90)")
            .attr("x", innerHeight / 2)
            .attr("y", -innerWidth - margin.right + 15)
            .style("text-anchor", "middle")
            .style("fill", "#4B92DB")
            .text("Active Cases & Deaths")
            .style("fill", "#ffffff");


        d3.select(".graph-title").text(`COVID-19 Trends in ${stateName}`).style("color", "#ffffff");
    }

    svg.selectAll(".state")
        .data(indiaGeoJSON.features)
        .enter()
        .append("path")
        .attr("class", "state")
        .attr("d", geoPath)
        .attr("fill", d => {
            const stateName = d.properties.NAME_1;
            const stateData = dataMap.get(stateName) || {};
            return colorScale(stateData.deaths || 0);
        })
        .on("mouseover", (event, d) => {
            const stateName = d.properties.NAME_1;
            const stateData = dataMap.get(stateName) || {};

            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`
                    <strong>${stateName}</strong><br>
                    Deaths: ${(stateData.deaths || 0).toLocaleString()}<br>
                    Confirmed Cases: ${(stateData.confirmed || 0).toLocaleString()}<br>
                    Population: ${(stateData.population || 0).toLocaleString()}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            d3.select("#tooltip").style("opacity", 0);
        })
        .on("click", (event, d) => {
            const stateName = d.properties.NAME_1;

            if (activeState) {
                d3.select(activeState)
                    .classed("active", false);
            }

            activeState = event.target;
            d3.select(activeState)
                .classed("active", true);

            document.getElementById("map-container").style.display = "none";
            document.getElementById("line-graph-container").style.display = "block";

            createLineGraph(stateName);
        });

    const maxDeaths = d3.max(Array.from(dataMap.values()).map(d => d.deaths)) || 1;

    const legendContainer = d3.select("#legend")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("align-items", "center")
        .style("margin-top", "10px");

    legendContainer.selectAll("*").remove();

    const legendWidth = 250, legendHeight = 20;
    const legendSvg = legendContainer.append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight + 30); 

    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");

    const numStops = 5;
    const stops = d3.range(numStops).map(i => ({
        offset: `${(i / (numStops - 1)) * 100}%`,
        color: d3.interpolateOrRd(i / (numStops - 1))
    }));

    linearGradient.selectAll("stop")
        .data(stops)
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    legendSvg.append("rect")
        .attr("x", 10)
        .attr("y", 0)
        .attr("width", legendWidth - 20)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", "1");

    const scale = d3.scaleLinear()
        .domain([0, maxDeaths])
        .range([10, legendWidth - 20]);

    legendSvg.selectAll(".legend-label")
        .data([0, maxDeaths * 0.25, maxDeaths * 0.5, maxDeaths * 0.75, maxDeaths])
        .enter().append("text")
        .attr("class", "legend-label")
        .attr("x", d => scale(d))
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#ffffff")
        .text(d => Math.round(d));

    d3.selectAll(".graph-legend-item").on("click", function () {
        const series = d3.select(this).attr("data-series");
        const line = d3.select(`.line-${series}`);
        const isHidden = line.classed("hidden");

        line.classed("hidden", !isHidden)
            .style("opacity", isHidden ? 1 : 0.1);

        d3.select(this)
            .style("opacity", isHidden ? 1 : 0.5);
    });
}

createCovidMap();