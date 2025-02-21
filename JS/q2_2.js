d3.csv("archive/q2_2.csv").then(function(rawData) {
    const processData = (data) => {
        return data.map(d => ({
            date: d.date.trim(),
            confirmed: +d.confirmed,
            cured: +d.cured,
            deaths: +d.deaths,
            active: Math.max(0, +d.active) 
        }));
    };

    const calculateMonthlyData = (data) => {
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        const monthlyData = [];
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i - 1];
            monthlyData.push({
                date: current.date,
                confirmed: Math.max(0, current.confirmed - previous.confirmed),
                cured: Math.max(0, current.cured - previous.cured),
                deaths: Math.max(0, current.deaths - previous.deaths),
                active: Math.max(0, current.active - previous.active)
            });
        }
        return monthlyData;
    };

    const createDeathsChart = (data, container, isFullSize) => {
        const margin = isFullSize 
            ? { top: 60, right: 40, bottom: 60, left: 80 }
            : { top: 20, right: 20, bottom: 30, left: 40 };
        
        const width = isFullSize ? 1200 : 200;
        const height = isFullSize ? 600 : 120;

        d3.select(container).html('');

        const svg = d3.select(container)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime()
            .domain(d3.extent(data, d => new Date(d.date)))
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.deaths)])
            .range([height, 0]);

        if (isFullSize) {
            svg.append('g')
                .attr('class', 'grid')
                .attr('transform', `translate(0,${height})`)
                .style('stroke-dasharray', '3,3')
                .style('opacity', 0.15)

                .call(d3.axisBottom(x)
                    .ticks(10)
                    .tickSize(-height)
                    .tickFormat(''));

            svg.append('g')
                .attr('class', 'grid')
                .style('stroke-dasharray', '3,3')
                .style('opacity', 0.15)
                .call(d3.axisLeft(y)
                    .ticks(10)
                    .tickSize(-width)
                    .tickFormat(''));
        }

        const area = d3.area()
            .x(d => x(new Date(d.date)))
            .y0(height)
            .y1(d => y(d.deaths))
            .curve(d3.curveMonotoneX);

        const areaPath = svg.append('path')
            .datum(data)
            .attr('fill', 'rgba(248, 113, 113, 0.1)')
            .attr('d', area);

        if (!isFullSize) {
            const totalLength = areaPath.node().getTotalLength();
            areaPath
                .attr("stroke-dasharray", totalLength + " " + totalLength)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(2000)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0);
        }

        const line = d3.line()
            .x(d => x(new Date(d.date)))
            .y(d => y(d.deaths))
            .curve(d3.curveMonotoneX);

        const path = svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', isFullSize ? 3 : 2)
            .attr('d', line);

        const totalLength = path.node().getTotalLength();
        path
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);

        if (isFullSize) {
            svg.selectAll('.dot')
                .data(data)
                .enter()
                .append('circle')
                .attr('class', 'dot')
                .attr('cx', d => x(new Date(d.date)))
                .attr('cy', d => y(d.deaths))
                .attr('r', 0) 
                .attr('fill', '#ffffff')
                .transition() 
                .duration(1000)
                .delay((d, i) => i * 50)
                .attr('r', 4) 
                .on('end', function() {
                    d3.select(this)
                        .on('mouseover', function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', 6);
                            
                            const tooltip = d3.select('body')
                                .append('div')
                                .attr('class', 'tooltip')
                                .style('opacity', 0);
                            
                            tooltip.transition()
                                .duration(200)
                                .style('opacity', 1);
                            
                            tooltip.html(`
                                <div class="tooltip-label">Date</div>
                                <div class="tooltip-value">${d.date}</div>
                                <div class="tooltip-label">Deaths</div>
                                <div class="tooltip-value">${d3.format(",")(d.deaths)}</div>
                            `)
                                .style('left', (event.pageX + 10) + 'px')
                                .style('top', (event.pageY - 28) + 'px');
                        })
                        .on('mouseout', function() {
                            d3.select(this)
                                .transition()
                                .duration(200)
                                .attr('r', 4);
                            
                            d3.selectAll('.tooltip').remove();
                        });
                });


            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x)
                    .ticks(10)
                    .tickFormat(d3.timeFormat('%Y-%m')))
                .style('opacity', 0)
                .transition()
                .duration(1000)
                .style('opacity', 1)
                .selectAll('text')
                .style('fill', '#ffffff');

            svg.append('g')
                .call(d3.axisLeft(y)
                    .ticks(10)
                    .tickFormat(d3.format(',d')))
                .style('opacity', 0)
                .transition()
                .duration(1000)
                .style('opacity', 1)
                .selectAll('text')
                .style('fill', '#ffffff');

            svg.append('text')
                .attr('x', width / 2)
                .attr('y', -30)
                .attr('class', 'axis-label')
                .attr('text-anchor', 'middle')
                .style('font-size', '20px')
                .style('font-weight', 'bold')
                .text('COVID-19 Deaths Over Time')
                .style('opacity', 0)
                .style('fill', '#ffffff')
                .transition()
                .duration(1000)
                .style('opacity', 1);

            svg.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('y', -margin.left + 20)
                .attr('x', -height / 2)
                .attr('dy', '1em')
                .attr('class', 'axis-label')
                .attr('text-anchor', 'middle')
                .text('Number of Deaths')
                .style('opacity', 0)
                .transition()
                .style('fill', '#ffffff')
                .duration(1000)
                .style('opacity', 1);

            svg.append('text')
                .attr('x', width / 2)
                .attr('y', height + margin.bottom - 10)
                .attr('class', 'axis-label')
                .attr('text-anchor', 'middle')
                .text('Date')
                .style('opacity', 0)
                .style('fill', '#ffffff')
                .transition()
                .duration(1000)
                .style('opacity', 1);
        } else {
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x)
                    .ticks(3)
                    .tickFormat(d3.timeFormat('%Y')))
                .selectAll('text')
                .style('fill', '#ffffff');

            svg.append('g')
                .call(d3.axisLeft(y)
                    .ticks(3)
                    .tickFormat(d3.format('.0s')))
                .selectAll('text')
                .style('fill', '#ffffff');    
        }
    };

    const createMainChart = (data) => {
        const margin = { top: 40, right: 100, bottom: 70, left: 90 };
        const width = 1200 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        d3.select('#main-chart').html('');

        const svg = d3.select('#main-chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        const keys = ['active', 'cured', 'deaths'];
        const stack = d3.stack().keys(keys);
        const stackedData = stack(data);

        const x = d3.scaleBand()
            .domain(data.map(d => d.date))
            .range([0, width])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain(keys)
            .range(['#f87171', '#34d399', '#6b7280']);

        const updateChart = (type) => {
            svg.selectAll('.layer')
                .transition()
                .duration(500)
                .style('opacity', 0)
                .remove();

            if (type === 'stacked') {
                const layers = svg.selectAll('g.layer')
                    .data(stackedData)
                    .enter()
                    .append('g')
                    .attr('class', 'layer')
                    .style('fill', d => color(d.key));

                layers.selectAll('rect')
                    .data(d => d)
                    .enter()
                    .append('rect')
                    .attr('x', d => x(d.data.date))
                    .attr('y', height)
                    .attr('height', 0) 
                    .attr('width', x.bandwidth())
                    .transition()
                    .duration(1000)
                    .delay((d, i) => i * 10)
                    .attr('y', d => y(d[1]))
                    .attr('height', d => y(d[0]) - y(d[1]));

                layers.selectAll('rect')
                    .on('mouseover', function(event, d) {
                        const key = d3.select(this.parentNode).datum().key;
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .style('opacity', 1);

                        tooltip.transition()
                            .duration(200)
                            .style('opacity', 1);
                        
                        tooltip.html(`
                            <div class="tooltip-label">Date</div>
                            <div class="tooltip-value">${d.data.date}</div>
                            <div class="tooltip-label">${key}</div>
                            <div class="tooltip-value">${d3.format(",")(Math.round(d[1] - d[0]))}</div>
                        `)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .style('opacity', 1);

                        tooltip.transition()
                            .duration(500)
                            .style('opacity', 0);
                    });
            } else {
                const x1 = d3.scaleBand()
                    .domain(keys)
                    .range([0, x.bandwidth()])
                    .padding(0.05);

                const groups = svg.selectAll('g.date')
                    .data(data)
                    .enter()
                    .append('g')
                    .attr('class', 'date')
                    .attr('transform', d => `translate(${x(d.date)},0)`);

                groups.selectAll('rect')
                    .data(d => keys.map(key => ({ key, value: d[key] })))
                    .enter()
                    .append('rect')
                    .attr('x', d => x1(d.key))
                    .attr('y', height)
                    .attr('width', x1.bandwidth())
                    .attr('height', 0)
                    .attr('fill', d => color(d.key))
                    .transition()
                    .duration(1000)
                    .delay((d, i) => i * 50)
                    .attr('y', d => y(d.value))
                    .attr('height', d => height - y(d.value));

                groups.selectAll('rect')
                    .on('mouseover', function(event, d) {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .style('opacity', 1);

                        tooltip.transition()
                            .duration(200)
                            .style('opacity', 1);

                        tooltip.html(`
                            <div class="tooltip-label">${d.key}</div>
                            <div class="tooltip-value">${d3.format(",")(Math.round(d.value))}</div>
                        `)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 28) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .transition()
                            .duration(200)
                            .style('opacity', 1);

                        tooltip.transition()
                            .duration(500)
                            .style('opacity', 0);
                    });
            }
        };

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d => d.slice(0, 7)))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('opacity', 0)
            .transition()
            .style('fill', '#ffffff')
            .duration(1000)
            .style('opacity', 1);

        svg.append('g')
            .call(d3.axisLeft(y)
                .tickFormat(d3.format(',d')))
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .style('opacity', 1)
            .selectAll('text')
            .style('fill', '#ffffff');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 0 - margin.left)
            .attr('x', 0 - (height / 2))
            .attr('dy', '1em')
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .text('Number of Cases')
            .style('opacity', 0)
            .style('fill', '#ffffff')
            .transition()
            .duration(1000)
            .style('opacity', 1);

        svg.append('text')
            .attr('transform', `translate(${width/2}, ${height + margin.bottom - 10})`)
            .attr('class', 'axis-label')
            .attr('text-anchor', 'middle')
            .text('Date')
            .style('opacity', 0)
            .style('fill', '#ffffff')
            .transition()
            .duration(1000)
            .style('opacity', 1);

        updateChart('stacked');

        d3.selectAll('.btn').on('click', function() {
            const type = this.getAttribute('data-type');
            d3.selectAll('.btn').classed('active', false);
            d3.select(this).classed('active', true);
            updateChart(type);
        });
    };

    const processedData = processData(rawData);
    const monthlyData = calculateMonthlyData(processedData);
    
    createMainChart(monthlyData);
    createDeathsChart(monthlyData, '#small-deaths-chart', false);

    const modal = document.getElementById('deaths-modal');
    const preview = document.getElementById('deaths-preview');
    const closeBtn = document.querySelector('.close-button');

    preview.onclick = function() {
        modal.style.display = 'flex';
        createDeathsChart(monthlyData, '#full-deaths-chart', true);
    };

    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
});