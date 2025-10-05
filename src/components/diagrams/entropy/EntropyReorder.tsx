import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";



interface Props {
    n: number;
}

export default function Diagram(props: Props) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!ref.current) { return; }
        makeDiagram(ref.current, props.n)
    }, [ref.current])


    return <div className="w-full min-w-full not-prose">
        <svg ref={ref}></svg>
    </div>;
}



function generateDefaultPMF(n: number): number[] {
    // Generate a beta-function-like distribution with fixed parameters
    const alpha = 2;
    const beta = 3;
    return generateBetaPMF(n, alpha, beta);
}

function generateBetaPMF(n: number, alpha: number, beta: number): number[] {
    const pmf = new Array(n);
    let sum = 0;

    for (let i = 0; i < n; i++) {
        const x = (i + 0.5) / n; // Center of bin
        const value = Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1);
        pmf[i] = value;
        sum += value;
    }

    // Normalize
    for (let i = 0; i < n; i++) {
        pmf[i] /= sum;
    }

    return pmf;
}

function resampleDistribution(oldPMF: number[], oldN: number, newN: number): number[] {
    // Resample the distribution for both increasing and decreasing bin counts
    const newPMF = new Array(newN).fill(0);

    // Interpolate the old distribution to the new bin structure
    for (let i = 0; i < newN; i++) {
        // Map new bin center to old bin space
        const newBinCenter = (i + 0.5) / newN;
        const oldBinFloat = newBinCenter * oldN - 0.5;

        // Find adjacent bins in old distribution
        const leftBin = Math.floor(oldBinFloat);
        const rightBin = Math.ceil(oldBinFloat);

        // Handle edge cases and interpolation
        if (oldBinFloat < 0) {
            // New bin is to the left of the old distribution - use first bin
            newPMF[i] = oldPMF[0];
        } else if (oldBinFloat >= oldN - 1) {
            // New bin is to the right of the old distribution - use last bin
            newPMF[i] = oldPMF[oldN - 1];
        } else if (leftBin === rightBin) {
            // Exact bin alignment
            newPMF[i] = oldPMF[leftBin];
        } else {
            // Linear interpolation between adjacent bins
            const weight = oldBinFloat - leftBin;
            newPMF[i] = oldPMF[leftBin] * (1 - weight) + oldPMF[rightBin] * weight;
        }
    }

    // Normalize to ensure the total probability is preserved
    const sum = newPMF.reduce((a, b) => a + b, 0);
    if (sum > 0) {
        for (let i = 0; i < newN; i++) {
            newPMF[i] /= sum;
        }
    }

    return newPMF;
}

function calculateStatistics(pmf: number[]): { mean: number; variance: number; entropy: number; sum: number } {
    const n = pmf.length;
    const sum = pmf.reduce((a, b) => a + b, 0);

    // Normalize for statistics calculation
    const normalizedPMF = sum > 0 ? pmf.map(x => x / sum) : pmf;

    // Calculate mean
    let mean = 0;
    for (let i = 0; i < n; i++) {
        mean += i * normalizedPMF[i];
    }

    // Calculate variance and entropy
    let variance = 0;
    let entropy = 0;
    for (let i = 0; i < n; i++) {
        variance += Math.pow(i - mean, 2) * normalizedPMF[i];
        if (normalizedPMF[i] > 0) {
            entropy -= normalizedPMF[i] * Math.log2(normalizedPMF[i]);
        }
    }
    return { mean, variance, entropy, sum };
}

function makeDiagram(el: SVGSVGElement, initialN: number, pmf?: number[]) {
    let n = initialN;
    // Use provided PMF or generate default
    let currentPMF = pmf ? [...pmf] : generateDefaultPMF(n);

    // Generate unique ID for this widget instance to avoid conflicts
    const widgetId = `entropy-reorder-widget-${Math.random().toString(36).slice(2, 9)}`;

    // Ensure PMF has correct length
    if (currentPMF.length !== n) {
        if (currentPMF.length < n) {
            // Pad with zeros
            currentPMF = [...currentPMF, ...new Array(n - currentPMF.length).fill(0)];
        } else {
            // Truncate
            currentPMF = currentPMF.slice(0, n);
        }
        // Re-normalize
        const sum = currentPMF.reduce((a, b) => a + b, 0);
        if (sum > 0) {
            currentPMF = currentPMF.map(x => x / sum);
        }
    }

    // Set up dimensions
    const margin = { top: 40, right: 20, bottom: 50, left: 60 };
    const width = 900;
    const height = 500;
    const panelGap = 60;
    const leftPanelWidth = (width - margin.left - margin.right - panelGap) * 0.6;
    const rightPanelWidth = (width - margin.left - margin.right - panelGap) * 0.4;
    const panelHeight = height - margin.top - margin.bottom;

    // Create main SVG with unique class
    const svg = d3.select(el)
        .attr("width", width)
        .attr("height", height)
        .attr("class", widgetId)
        .style("color", "inherit")
        .style("user-select", "none")
        .style("-webkit-user-select", "none")
        .style("-moz-user-select", "none")
        .style("-ms-user-select", "none");

    // Clear existing content
    svg.selectAll("*").remove();



    // Create left panel (PMF bar chart)
    const leftPanel = svg.append("g")
        .attr("class", `${widgetId}-left-panel`)
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales for left panel
    const xScale = d3.scaleBand()
        .domain(d3.range(n).map(String))
        .range([0, leftPanelWidth])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, Math.max(...currentPMF) * 1.1])  // TODO d3.extent
        .range([panelHeight, 0]);


    // Add axes to left panel with unique classes
    leftPanel.append("g")
        .attr("class", `${widgetId}-x-axis`)
        .attr("transform", `translate(0, ${panelHeight})`)
        .call(d3.axisBottom(xScale));

    leftPanel.append("g")
        .attr("class", `${widgetId}-y-axis`)
        .call(d3.axisLeft(yScale).tickFormat(d3.format(".3f")));

    // Add axis labels
    leftPanel.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (panelHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "currentColor")
        .text("Weight");

    leftPanel.append("text")
        .attr("transform", `translate(${leftPanelWidth / 2}, ${panelHeight + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .style("fill", "currentColor")
        .text("Bin");

    // Add panel title
    leftPanel.append("text")
        .attr("x", leftPanelWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("fill", "currentColor")
        .text("Weight Distribution");


    // Create right panel (statistics)
    const rightPanel = svg.append("g")
        .attr("class", `${widgetId}-right-panel`)
        .attr("transform", `translate(${margin.left + leftPanelWidth + panelGap}, ${margin.top})`);

    // Function to update the visualization (full update for structural changes)
    function updateVisualization() {
        // Update x scale for new n if needed
        xScale.domain(d3.range(n).map(String));

        // Update x axis
        leftPanel.select(`.${widgetId}-x-axis`)
            // @ts-ignore
            .call(d3.axisBottom(xScale));

        // Update y scale to accommodate the maximum value with some padding
        const maxVal = Math.max(...currentPMF, 0.1); // Ensure minimum scale
        yScale.domain([0, maxVal * 1.1]);

        const leftAxis = d3.axisLeft(yScale).tickFormat(d3.format(".3f"))
        // Update y axis
        // @ts-ignore
        leftPanel.select(`.${widgetId}-y-axis`).call(leftAxis);

        // Update bars with unique class
        const bars = leftPanel.selectAll<SVGRectElement, number>(`.${widgetId}-bar`)
            .data(currentPMF);

        bars.enter()
            .append("rect")
            .attr("class", `${widgetId}-bar`)
            .merge(bars)
            .attr("x", (_, i) => xScale(String(i))!)
            .attr("width", xScale.bandwidth())
            .attr("y", d => yScale(d))
            .attr("height", d => panelHeight - yScale(d))
            .style("fill", "steelblue")
            .style("cursor", "crosshair");

        bars.exit().remove();

        // Update statistics display
        updateStatistics();

        // Update interaction overlay only if needed
        if (!overlay) {
            setupInteraction();
        }
    }

    // Fast update function for drag operations (only updates values, not structure)
    function updateVisualizationFast() {
        // Only update y scale and bars during drag - use same domain logic as initial setup
        const maxVal = Math.max(...currentPMF, 0.1); // Ensure minimum scale
        yScale.domain([0, maxVal * 1.1]);

        // Update y axis to match the new scale
        const leftAxis = d3.axisLeft(yScale).tickFormat(d3.format(".3f"));
        // @ts-ignore
        leftPanel.select(`.${widgetId}-y-axis`).call(leftAxis);

        // Update bars - only update y position and height, NOT x position
        leftPanel.selectAll<SVGRectElement, number>(`.${widgetId}-bar`)
            .data(currentPMF)
            .attr("y", d => yScale(d))
            .attr("height", d => panelHeight - yScale(d));

        // Update only statistics values
        updateStatisticsValues();
    }


    function updateStatistics() {
        const stats = calculateStatistics(currentPMF);

        // Clear previous statistics
        rightPanel.selectAll("*").remove();

        // Add title
        rightPanel.append("text")
            .attr("x", rightPanelWidth / 2)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("fill", "currentColor")
            .text("Statistics");

        // Statistics data
        const statsData = [
            { label: "Mean", value: stats.mean, max: n - 1 },
            { label: "Variance", value: stats.variance, max: Math.pow(n - 1, 2) / 4 },
            { label: "Entropy", value: stats.entropy, max: Math.log2(n) },
            { label: "Total Weight", value: stats.sum, max: Math.max(stats.sum, 1) }
        ];

        const statSpacing = 50;

        statsData.forEach((stat, i) => {
            const y = i * statSpacing + 40;

            // Label
            rightPanel.append("text")
                .attr("x", 0)
                .attr("y", y - 5)
                .style("fill", "currentColor")
                .style("font-weight", "bold")
                .text(stat.label);

            // Background bar
            rightPanel.append("rect")
                .attr("class", `${widgetId}-bg-bar-${i}`)
                .attr("x", 0)
                .attr("y", y)
                .attr("width", rightPanelWidth)
                .attr("height", 20)
                .style("fill", "#f0f0f0")
                .style("stroke", "#ccc");

            // Value bar
            rightPanel.append("rect")
                .attr("class", `${widgetId}-value-bar-${i}`)
                .attr("x", 0)
                .attr("y", y)
                .attr("width", (stat.value / stat.max) * rightPanelWidth)
                .attr("height", 20)
                .style("fill", "steelblue");

            // Value text
            rightPanel.append("text")
                .attr("class", `${widgetId}-value-text-${i}`)
                .attr("x", rightPanelWidth / 2)
                .attr("y", y + 15)
                .attr("text-anchor", "middle")
                .style("fill", "black")
                .style("font-size", "12px")
                .text(stat.value.toFixed(3));
        });

        // Add controls (position after stats with proper spacing)
        const binsY = 40 + (statsData.length * statSpacing);

        // Bins header
        rightPanel.append("text")
            .attr("x", 0)
            .attr("y", binsY)
            .style("fill", "currentColor")
            .style("font-weight", "bold")
            .text("Bins:");

        // N control buttons and number (below header)
        const nControlGroup = rightPanel.append("g")
            .attr("transform", `translate(0, ${binsY + 10})`);

        // Decrease n button
        const decreaseButton = nControlGroup.append("g")
            .style("cursor", "pointer");

        decreaseButton.append("rect")
            .attr("width", 25)
            .attr("height", 25)
            .style("fill", "steelblue")
            .style("stroke", "#4682b4")
            .style("rx", 3);

        decreaseButton.append("text")
            .attr("x", 12.5)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-weight", "bold")
            .text("-");

        decreaseButton.on("click", () => {
            if (n > 1) {
                const oldN = n;
                n = n - 1;
                // Resample the current distribution to fit the new bin count
                currentPMF = resampleDistribution(currentPMF, oldN, n);
                // Check if all bins are now zero and reinitialize if so
                const totalWeight = currentPMF.reduce((sum, weight) => sum + weight, 0);
                if (totalWeight === 0) {
                    currentPMF = generateDefaultPMF(n);
                }
                updateVisualization();
            }

        });

        // Increase n button
        const increaseButton = nControlGroup.append("g")
            .attr("transform", "translate(30, 0)")
            .style("cursor", "pointer");

        increaseButton.append("rect")
            .attr("width", 25)
            .attr("height", 25)
            .style("fill", "steelblue")
            .style("stroke", "#4682b4")
            .style("rx", 3);

        increaseButton.append("text")
            .attr("x", 12.5)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-weight", "bold")
            .text("+");

        increaseButton.on("click", () => {
            if (n < 50) {
                const oldN = n;
                n = n + 1;
                // Resample the current distribution to fit the new bin count
                currentPMF = resampleDistribution(currentPMF, oldN, n);
                updateVisualization();
            }
        });

        // N value display (positioned after buttons)
        nControlGroup.append("text")
            .attr("x", 65)
            .attr("y", 17)
            .style("fill", "currentColor")
            .style("font-weight", "bold")
            .text(`${n}`);

        // Distribution preset section
        const presetsY = binsY + 70;

        // Section header
        rightPanel.append("text")
            .attr("x", 0)
            .attr("y", presetsY)
            .style("fill", "currentColor")
            .style("font-weight", "bold")
            .text("Choose a distribution:");

        // Distribution preset buttons (all on same line)
        const buttonsY = presetsY + 10;

        // Uniform distribution button
        const uniformButton = rightPanel.append("g")
            .attr("transform", `translate(0, ${buttonsY})`)
            .style("cursor", "pointer");

        uniformButton.append("rect")
            .attr("width", 60)
            .attr("height", 25)
            .style("fill", "steelblue")
            .style("stroke", "#4682b4")
            .style("rx", 3);

        uniformButton.append("text")
            .attr("x", 30)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text("Uniform");

        uniformButton.on("click", () => {
            // Set all bins to equal weight
            const uniformWeight = 1.0 / n;
            currentPMF = new Array(n).fill(uniformWeight);
            updateVisualization();
        });

        // Indicator distribution button
        const indicatorButton = rightPanel.append("g")
            .attr("transform", `translate(70, ${buttonsY})`)
            .style("cursor", "pointer");

        indicatorButton.append("rect")
            .attr("width", 60)
            .attr("height", 25)
            .style("fill", "steelblue")
            .style("stroke", "#4682b4")
            .style("rx", 3);

        indicatorButton.append("text")
            .attr("x", 30)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text("Indicator");

        indicatorButton.on("click", () => {
            // Set one random bin to 1, all others to 0
            currentPMF = new Array(n).fill(0);
            const randomIndex = Math.floor(Math.random() * n);
            currentPMF[randomIndex] = 1;
            updateVisualization();
        });

        // Beta distribution button
        const betaButton = rightPanel.append("g")
            .attr("transform", `translate(140, ${buttonsY})`)
            .style("cursor", "pointer");

        betaButton.append("rect")
            .attr("width", 60)
            .attr("height", 25)
            .style("fill", "steelblue")
            .style("stroke", "#4682b4")
            .style("rx", 3);

        betaButton.append("text")
            .attr("x", 30)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text("Beta");

        betaButton.on("click", () => {
            // Generate a beta distribution with random parameters
            const alpha = Math.random() * 4 + 0.5; // Range: 0.5 to 4.5
            const beta = Math.random() * 4 + 0.5;  // Range: 0.5 to 4.5
            currentPMF = generateBetaPMF(n, alpha, beta);
            updateVisualization();
        });

        const shuffleY = buttonsY + 40
        // Shuffle button first
        const shuffleButton = rightPanel.append("g")
            .attr("transform", `translate(0, ${shuffleY})`)
            .style("cursor", "pointer");

        shuffleButton.append("rect")
            .attr("width", 80)
            .attr("height", 30)
            .style("fill", "steelblue")
            .style("stroke", "#4682b4")
            .style("rx", 5);

        shuffleButton.append("text")
            .attr("x", 40)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-weight", "bold")
            .text("Shuffle");

        shuffleButton.on("click", () => {
            // Shuffle the PMF array
            const shuffled = [...currentPMF];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            currentPMF = shuffled;
            updateVisualization();
        });
    }

    // Fast update function that only updates statistics values (for drag operations)
    function updateStatisticsValues() {
        const stats = calculateStatistics(currentPMF);

        // Statistics data with updated values
        const statsData = [
            { label: "Mean", value: stats.mean, max: n - 1 },
            { label: "Variance", value: stats.variance, max: Math.pow(n - 1, 2) / 4 },
            { label: "Entropy", value: stats.entropy, max: Math.log2(n) },
            { label: "Total Weight", value: stats.sum, max: Math.max(stats.sum, 1) }
        ];

        // Only update the width of value bars and text content
        statsData.forEach((stat, i) => {
            // Update value bar width
            rightPanel.select(`.${widgetId}-value-bar-${i}`)
                .attr("width", (stat.value / stat.max) * rightPanelWidth);

            // Update value text
            rightPanel.select(`.${widgetId}-value-text-${i}`)
                .text(stat.value.toFixed(3));
        });
    }

    // Add click and drag interaction
    let isDragging = false;
    let overlay: d3.Selection<SVGRectElement, unknown, null, undefined>;

    function handleInteraction(event: MouseEvent) {
        const [mouseX, mouseY] = d3.pointer(event);

        // Find which bin was clicked (allow clicking anywhere in the panel)
        const binIndex = Math.floor(mouseX / (leftPanelWidth / n));
        if (binIndex < 0 || binIndex >= n) return;

        // Calculate new value based on click height (allow clicking above current bars)
        let newValue = Math.max(0, yScale.invert(mouseY));

        // Snap to zero if very close to x-axis
        const snapThreshold = panelHeight * 0.01;
        if (mouseY > panelHeight - snapThreshold) {
            newValue = 0;
        }

        // Update the clicked bin without normalizing
        currentPMF[binIndex] = newValue;

        // Use fast update during dragging
        updateVisualizationFast();
    }

    function setupInteraction() {
        // Remove existing overlay if it exists
        if (overlay) {
            overlay.remove();
        }

        // Add invisible overlay to capture all mouse events in the panel
        overlay = leftPanel.append("rect")
            .attr("class", `${widgetId}-interaction-overlay`)
            .attr("width", leftPanelWidth)
            .attr("height", panelHeight)
            .style("fill", "transparent")
            .style("cursor", "crosshair");

        overlay.on("mousedown", function (event) {
            isDragging = true;
            event.preventDefault(); // Prevent default drag behavior
            handleInteraction(event);
        });

        overlay.on("mousemove", function (event) {
            if (isDragging) {
                handleInteraction(event);
            }
        });

        overlay.on("mouseup", function () {
            isDragging = false;
        });

        overlay.on("mouseleave", function () {
            isDragging = false;
        });

        // Also handle single clicks
        overlay.on("click", handleInteraction);
    }

    // Initial render
    updateVisualization();
}