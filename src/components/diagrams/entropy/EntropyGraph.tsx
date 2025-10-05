import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";


interface Props {
    dataPath: string
}

export default function Diagram({ dataPath }: Props) {
    const ref = useRef<SVGSVGElement>(null);

    const [data, setData] = useState<DiagramProps | null>(null);
    const [err, setError] = useState<string | null>(null);

    useEffect(() => {
        (d3.json<DiagramProps>(dataPath))
            .catch(reason => {
                // TODO: display an error
                setError(reason)
                return;
            })
            .then(data => {
                if (!data) {
                    setError(`data file ${dataPath} could not be loaded`)
                    return;
                }
                console.log('got data')
                setData(data)
            });
        return;
    }, [])

    useEffect(() => {
        if (!ref.current || !data) { return; }
        makeDiagram(ref.current, data)
    }, [data, ref.current])

    if (!data) {
        return (
            <div className="text-2xl ml-4">
                (Widget Loading...)
                <noscript className="ml-4 text-xl text-neutral-800 dark:text-neutral-300">
                    You may need to enable JavaScript.
                </noscript>
            </div>
        );
    } else if (err) {
        return (
            <div className="text-2xl ml-4">
                {err}
            </div>
        );
    }


    return <div className="w-full min-w-full not-prose">
        <svg ref={ref}></svg>
    </div>;
}

// Utility function to format numbers without trailing zeros
function formatNumberClean(value: number): string {
    // Use d3's default formatting but remove trailing zeros
    return parseFloat(value.toPrecision(6)).toString();
}

interface DataRow {
    name: string;
    pmf: number[];
    support: number[];
    mean: number;
    entropy: number;
    variance: number;
    [key: string]: string | number | number[] | undefined;  // Allow arbitrary additional fields
}

interface DiagramProps {
    support: number[];
    pmfs: {
        name: string;
        pmf: number[];
        support?: number[];  // Individual support array, overrides global support
        [key: string]: string | number | number[] | undefined;  // Allow arbitrary additional fields
    }[];
    keyNames?: string[];  // Array of available key names
    initAxes?: [string, string] | []
}

// Helper function to get stat value

// Calculate domains with minimum range for numerical stability
function calculateDomain(data: number[]): [number, number] {
    const extent = d3.extent(data) as [number, number];
    const range = extent[1] - extent[0];
    const minRange = 0.01;

    if (range < minRange) {
        const center = (extent[0] + extent[1]) / 2;
        const halfRange = minRange / 2;
        return [center - halfRange, center + halfRange];
    }
    return extent;
}

// Helper functions to calculate statistics
function calculateMean(pmf: number[], support: number[]): number {
    return pmf.reduce((sum, p, i) => sum + p * support[i], 0);
}

function calculateVariance(pmf: number[], support: number[], mean: number): number {
    return pmf.reduce((sum, p, i) => sum + p * Math.pow(support[i] - mean, 2), 0);
}

function calculateEntropy(pmf: number[]): number {
    return -pmf.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
}

function calculateStats(d: DiagramProps['pmfs'][number], globalSupport: number[]): DataRow {
    // Use individual support if provided, otherwise use global support
    const support = d.support || globalSupport;
    const mean = calculateMean(d.pmf, support);
    const variance = calculateVariance(d.pmf, support, mean);
    const entropy = calculateEntropy(d.pmf);

    // Spread operator to include all additional fields from d
    return {
        ...d,  // Include all original fields
        support: support,  // Override support with resolved value
        mean: mean,
        variance: variance,
        entropy: entropy
    };
}

// Styling constants for consistency
const STYLE = {
    pmfLine: {
        defaultOpacity: 0.7,
        highlightOpacity: 1,
        defaultStrokeWidth: 2,
        highlightStrokeWidth: 3
    },
    scatterPoint: {
        defaultOpacity: 0.7,
        highlightOpacity: 1,
        defaultRadius: 3,
        highlightRadius: 6
    }
};

function makeDiagram(el: SVGSVGElement, { support, pmfs, keyNames, initAxes }: DiagramProps) {
    const widgetId = `entropy-plot-widget-${Math.random().toString(36).slice(2, 9)}`;

    let currentXAxis: string = initAxes ? initAxes[0]! : 'variance';
    let currentYAxis: string = initAxes ? initAxes[1]! : 'entropy';

    // Calculate statistics for each distribution
    const processedData: DataRow[] = pmfs.map(d => calculateStats(d, support));
    const allPmfValues = pmfs.flatMap(d => d.pmf);
    const maxPmf = Math.max(...allPmfValues);
    const yBounds: [number, number] = [0, maxPmf * 1.1]; // 30% above the largest PMF value

    // Calculate x bounds considering all support arrays (global and individual)
    const allSupportValues = pmfs.flatMap(d => d.support || support);
    const xBounds: [number, number] = [Math.min(...allSupportValues), Math.max(...allSupportValues)];

    // Set up dimensions - use container width and calculate height to maintain square plots
    const margin = { top: 20, right: 20, bottom: 50, left: 60 }; // Increased bottom margin
    const containerWidth = el.parentElement?.clientWidth || 900; // Fallback to 900 if no parent
    const width = containerWidth;
    const panelGap = 60; // Increased gap between panels
    const panelWidth = (width - margin.left - margin.right - panelGap) / 2;
    const panelHeight = panelWidth; // Make panels square
    const height = panelHeight + margin.top + margin.bottom;

    function getStatValue(d: DataRow, stat: string): number {
        switch (stat) {
            case "mean": return d.mean;
            case "variance": return d.variance;
            case "entropy": return d.entropy;
            default:
                // Check if it's one of the arbitrary additional fields
                if (keyNames && keyNames.includes(stat)) {
                    const value = d[stat];
                    return typeof value === 'number' ? value : 0;
                }
                return 0;
        }
    }

    // Create main SVG
    const svg = d3.select(el)
        .attr("width", width)
        .attr("height", height)
        .style("color", "inherit"); // Inherit color from parent for dark mode


    // Draw static things

    // Create left panel (PMF distributions)
    const leftPanel = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Scales for left panel
    const xScaleLeft = d3.scaleLinear()
        .domain(xBounds)
        .range([0, panelWidth]);

    const yScaleLeft = d3.scaleLinear()
        .domain(yBounds)
        .range([panelHeight, 0]);

    // Add panel titles
    leftPanel.append("text")
        .attr("x", panelWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("fill", "currentColor")
        .text("Probability Mass Functions");

    // Add axis labels
    leftPanel.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (panelHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "currentColor")
        .text("Probability");

    leftPanel.append("text")
        .attr("transform", `translate(${panelWidth / 2}, ${panelHeight + margin.bottom - 15})`)
        .style("text-anchor", "middle")
        .style("fill", "currentColor")
        .text("Support");

    leftPanel.append("g")
        .attr("transform", `translate(0, ${panelHeight})`)
        .call(d3.axisBottom(xScaleLeft).tickFormat(formatNumberClean));

    leftPanel.append("g")
        .call(d3.axisLeft(yScaleLeft).tickFormat(formatNumberClean));

    // Add clipping path for left panel
    svg.append("defs").append("clipPath")
        .attr("id", `left-panel-clip-${widgetId}`)
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", panelWidth)
        .attr("height", panelHeight);

    // Create right panel (entropy vs variance scatter)
    const rightPanel = svg.append("g")
        .attr("transform", `translate(${margin.left + panelWidth + panelGap}, ${margin.top})`);


    // Create axes for right panel, which will be modified dynamically
    const rightXAxis = rightPanel.append("g")
        .attr("transform", `translate(0, ${panelHeight})`)
    const rightYAxis = rightPanel.append("g")
    const rightTitle = rightPanel.append("text")
        .attr("x", panelWidth / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("fill", "currentColor")

    const rightXAxisLabel = rightPanel.append("text")
        .attr("transform", `translate(${panelWidth / 2}, ${panelHeight + margin.bottom - 15})`)
        .style("text-anchor", "middle")
        .style("fill", "currentColor")
        .style("cursor", "pointer")
        .style("text-decoration", "underline")

    const rightYAxisLabel = rightPanel.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (panelHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "currentColor")
        .style("cursor", "pointer")
        .style("text-decoration", "underline")

    function drawDiagram() {
        // Clean up any existing dropdowns and event listeners
        d3.selectAll(`.axis-dropdown-${widgetId}`).remove();
        d3.select("body").on("click.dropdown", null);

        // Get data for right panel axes
        const xData = processedData.map(d => getStatValue(d, currentXAxis));
        const yData = processedData.map(d => getStatValue(d, currentYAxis));

        // Color scale - linear from last to first (reversed)
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([processedData.length - 1, 0]);

        // Line generator for PMF plots
        const line = d3.line()
            .x(d => xScaleLeft(d[0]))
            .y(d => yScaleLeft(d[1]))
            .curve(d3.curveLinear);

        // Helper function to get axis label
        function getAxisLabel(stat: string): string {
            return stat.charAt(0).toUpperCase() + stat.slice(1).toLowerCase();
        }

        // Function to create dropdown to select axes labels for RHS graph
        function createDropdown(x: number, y: number, currentValue: string, isYAxis: boolean): void {
            // Remove any existing dropdown
            d3.selectAll(`.axis-dropdown-${widgetId}`).remove();

            const options = ["mean", "variance", "entropy"];
            if (keyNames && keyNames.length > 0) {
                options.push(...keyNames);
            }
            const dropdown = d3.select("body")
                .append("div")
                .attr("class", `axis-dropdown-${widgetId}`)
                .style("position", "absolute")
                .style("left", x + "px")
                .style("top", y + "px")
                .style("background", "white")
                .style("border", "1px solid #ccc")
                .style("border-radius", "4px")
                .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
                .style("z-index", "1000")
                .style("padding", "4px 0")
                .style("min-width", "100px");

            options.forEach(option => {
                dropdown.append("div")
                    .style("padding", "8px 12px")
                    .style("cursor", "pointer")
                    .style("background", option === currentValue ? "#f0f0f0" : "white")
                    .style("border-bottom", "1px solid #eee")
                    .text(getAxisLabel(option))
                    .on("mouseover", function () {
                        d3.select(this).style("background", "#e0e0e0");
                    })
                    .on("mouseout", function () {
                        d3.select(this).style("background", option === currentValue ? "#f0f0f0" : "white");
                    })
                    .on("click", function () {
                        if (isYAxis) {
                            if (option == currentXAxis) {
                                [currentXAxis, currentYAxis] = [currentYAxis, currentXAxis]
                            } else {
                                currentYAxis = option;
                            }
                        } else {
                            if (option == currentYAxis) {
                                [currentXAxis, currentYAxis] = [currentYAxis, currentXAxis]
                            } else {
                                currentXAxis = option;
                            }
                        }
                        d3.selectAll(`.axis-dropdown-${widgetId}`).remove();
                        drawDiagram();
                    });
            });

            // Click outside to close
            d3.select("body").on("click.dropdown", function (event) {
                if (!(event.target as Element).closest(`.axis-dropdown-${widgetId}`)) {
                    d3.selectAll(`.axis-dropdown-${widgetId}`).remove();
                    d3.select("body").on("click.dropdown", null);
                }
            });
        }

        const xScaleRight = d3.scaleLinear()
            .domain(calculateDomain(xData))
            .nice()
            .range([0, panelWidth]);

        const yScaleRight = d3.scaleLinear()
            .domain(calculateDomain(yData))
            .nice()
            .range([panelHeight, 0]);

        rightXAxis
            .call(d3.axisBottom(xScaleRight).tickFormat(formatNumberClean));

        rightYAxis
            .call(d3.axisLeft(yScaleRight).tickFormat(formatNumberClean));

        // Y-axis label (clickable)
        rightYAxisLabel
            .text(getAxisLabel(currentYAxis))
            .on("click.axis", function (event) {
                event.stopPropagation();
                const rect = (event.target as Element).getBoundingClientRect();
                createDropdown(rect.left + window.scrollX, rect.bottom + window.scrollY, currentYAxis, true);
            });

        // X-axis label (clickable)
        rightXAxisLabel
            .text(getAxisLabel(currentXAxis))
            .on("click.axis", function (event) {
                event.stopPropagation();
                const rect = (event.target as Element).getBoundingClientRect();
                createDropdown(rect.left + window.scrollX, rect.bottom + window.scrollY, currentXAxis, false);
            });

        rightTitle
            .text(`${getAxisLabel(currentYAxis)} vs ${getAxisLabel(currentXAxis)}`);

        // State for highlighting

        // Cache DOM selections for performance
        let allPmfGroups: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>;
        let allPmfLines: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>;
        let allPmfPoints: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>;
        let allScatterPoints: d3.Selection<d3.BaseType, unknown, SVGGElement, unknown>;

        // Function to update highlighting - optimized version
        function updateHighlight(name?: string) {
            if (!name) {
                // Reset all to default state efficiently
                allPmfGroups.style("opacity", STYLE.pmfLine.defaultOpacity);
                allPmfLines
                    .style("opacity", STYLE.pmfLine.defaultOpacity)
                    .style("stroke-width", STYLE.pmfLine.defaultStrokeWidth);
                allPmfPoints.style("opacity", 0); // Hide all PMF points
                allScatterPoints
                    .style("opacity", STYLE.scatterPoint.defaultOpacity)
                    .attr("r", STYLE.scatterPoint.defaultRadius);
            } else {
                // Use filter for better performance than function callbacks
                allPmfGroups
                    .style("opacity", (d: any) => d.name === name ? STYLE.pmfLine.highlightOpacity : STYLE.pmfLine.defaultOpacity);

                allPmfLines
                    .style("opacity", (d: any) => d.name === name ? STYLE.pmfLine.highlightOpacity : STYLE.pmfLine.defaultOpacity)
                    .style("stroke-width", (d: any) => d.name === name ? STYLE.pmfLine.highlightStrokeWidth : STYLE.pmfLine.defaultStrokeWidth);

                // Show PMF points only for highlighted distribution
                allPmfPoints
                    .style("opacity", (d: any) => d.name === name ? 0.8 : 0);

                allScatterPoints
                    .style("opacity", (d: any) => d.name === name ? STYLE.scatterPoint.highlightOpacity : STYLE.scatterPoint.defaultOpacity)
                    .attr("r", (d: any) => d.name === name ? STYLE.scatterPoint.highlightRadius : STYLE.scatterPoint.defaultRadius);
            }
        }

        // Draw PMF distributions on left panel
        const pmfGroups = leftPanel.selectAll(`.pmf-group-${widgetId}`)
            .data(processedData)
            .enter()
            .append("g")
            .attr("class", `pmf-group-${widgetId}`)
            .attr("clip-path", `url(#left-panel-clip-${widgetId})`); // Apply clipping

        // Draw lines connecting points
        pmfGroups.append("path")
            .attr("class", `pmf-line-${widgetId}`)
            .attr("d", d => {
                const points = d.support.map((x, i) => ([x, d.pmf[i]] as [number, number]));
                return line(points);
            })
            .style("fill", "none")
            .style("stroke", (_, i) => colorScale(i))
            .style("stroke-width", STYLE.pmfLine.defaultStrokeWidth)
            .style("opacity", STYLE.pmfLine.defaultOpacity);

        // Add PMF points that show on hover
        pmfGroups.selectAll(`.pmf-point-${widgetId}`)
            .data(d => d.support.map((x, i) => ({
                x: x,
                y: d.pmf[i],
                name: d.name,
                groupIndex: processedData.findIndex(pd => pd.name === d.name)
            })))
            .enter()
            .append("circle")
            .attr("class", `pmf-point-${widgetId}`)
            .attr("cx", d => xScaleLeft(d.x))
            .attr("cy", d => yScaleLeft(d.y))
            .attr("r", 3)
            .style("fill", (d: any) => colorScale(d.groupIndex))
            .style("opacity", 0) // Hidden by default
            .style("pointer-events", "none"); // Don't interfere with hover events

        function onMouseover(event: MouseEvent, d: DataRow) {
            updateHighlight(d.name);

            // Show tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", `tooltip-${widgetId}`)
                .style("position", "absolute")
                .style("background", "rgba(0, 0, 0, 0.8)")
                .style("color", "white")
                .style("padding", "8px")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .html(`
              <strong>${d.name}</strong><br/>
              Mean: ${d.mean.toFixed(3)}<br/>
              Variance: ${d.variance.toFixed(3)}<br/>
              Entropy: ${d.entropy.toFixed(3)}${keyNames && keyNames.length > 0 ?
                        keyNames.map(key => `<br/>${key}: ${typeof d[key] === 'number' ? d[key].toFixed(3) : d[key]}`).join('')
                        : ''
                    }
          `);

            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        }

        function onMouseOut() {
            updateHighlight(undefined);
            d3.selectAll(`.tooltip-${widgetId}`).remove();
        }

        // Add hover events to the entire group
        pmfGroups
            .style("cursor", "pointer")
            .on("mouseover", onMouseover)
            .on("mouseout", onMouseOut);

        // Draw scatter points on right panel
        const scatterPoints = rightPanel.selectAll(`.scatter-point-${widgetId}`)
            .data(processedData);

        // Handle new points
        scatterPoints.enter()
            .append("circle")
            .attr("class", `scatter-point-${widgetId}`)
            .attr("r", STYLE.scatterPoint.defaultRadius)
            .style("fill", (_, i: number) => colorScale(i))
            .style("opacity", STYLE.scatterPoint.defaultOpacity)
            .on("mouseover", onMouseover)
            .on("mouseout", onMouseOut);

        // Update all points (both new and existing) with current axis positions
        rightPanel.selectAll(`.scatter-point-${widgetId}`)
            .attr("cx", (d: any) => xScaleRight(getStatValue(d, currentXAxis)))
            .attr("cy", (d: any) => yScaleRight(getStatValue(d, currentYAxis)));

        // Cache all selections after elements are created for performance
        allPmfGroups = leftPanel.selectAll(`.pmf-group-${widgetId}`);
        allPmfLines = leftPanel.selectAll(`.pmf-line-${widgetId}`);
        allPmfPoints = leftPanel.selectAll(`.pmf-point-${widgetId}`);
        allScatterPoints = rightPanel.selectAll(`.scatter-point-${widgetId}`);

        updateHighlight(undefined);
    }

    drawDiagram();
}



