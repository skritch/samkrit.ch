import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";


interface Props {
    total: number

    // adding to total, e.g. for 32
    // 16 8 4 4
    weights: number[],
    displayBits: boolean
}

export default function Diagram(props: Props) {
    const ref = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!ref.current) { return; }
        makeDiagram(ref.current, props)
    }, [ref.current])


    return <div className="w-full min-w-full not-prose" style={{ textAlign: 'center' }}>
        <svg ref={ref} ></svg>
    </div>;
}


interface BarData {
    weight: number;
    probability: number;
    probabilityFraction: [number, number];
    information: number;
    informationExact: [number, number | null];
    count: number;
}

function makeDiagram(el: SVGSVGElement, { total, weights, displayBits }: Props) {
    const widgetId = `entropy-bar-widget-${Math.random().toString(36).slice(2, 9)}`;

    const processedData: BarData[] = processWeights(weights, total);

    const margin = { top: 0, right: 0, bottom: 0, left: 0 };
    const width = 740;
    const barHeight = 24;
    const formulaHeight = 20;
    const gapWidth = Math.max(0.5, Math.min(4, 64 / total)); // Dynamic gap width based on total
    const height = margin.top + barHeight + formulaHeight + margin.bottom;

    // Calculate actual bar area width based on total units - increased from 0.8 to make bars ~30% wider
    const barAreaWidth = Math.min(width * 0.75, total * 26); // Max 26px per unit, max 75% of available width
    const barStartX = (width - barAreaWidth) / 2; // Center the bars

    const availableWidth = (width / 2 - barAreaWidth / 2) + barAreaWidth

    const svg = d3.select(el)
        .attr("width", width)
        .attr("height", height)
        .style("color", "inherit");

    const container = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    drawHorizontalBars(
        container,
        processedData,
        total,
        barAreaWidth,
        barHeight,
        gapWidth,
        displayBits === undefined ? true : displayBits,
        widgetId,
        barStartX,
        availableWidth
    );
}

function processWeights(weights: number[], total: number): BarData[] {
    // Fill with 1's if weights sum to less than total
    const currentSum = weights.reduce((sum, w) => sum + w, 0);
    const filledWeights = [...weights];

    if (currentSum < total) {
        const remaining = total - currentSum;
        for (let i = 0; i < remaining; i++) {
            filledWeights.push(1);
        }
    }

    return filledWeights.map(weight => {
        const probability = weight / total;
        const probabilityFraction = simplifyFraction(weight, total);
        const information = -Math.log2(probability);
        const informationExact = calculateExactInformation(weight, total);

        return {
            weight,
            probability,
            probabilityFraction,
            information,
            informationExact,
            count: 1
        };
    });
}

function simplifyFraction(numerator: number, denominator: number): [number, number] {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const g = gcd(numerator, denominator);
    return [numerator / g, denominator / g];
}

function calculateExactInformation(weight: number, total: number): [number, number | null] {
    if (weight === 0) return [Infinity, null];

    const information = Math.log2(total / weight);

    if (weight === 1) {
        return [information, null];
    }

    if (total % weight === 0) {
        const quotient = total / weight;
        if ((quotient & (quotient - 1)) === 0) {
            return [Math.log2(quotient), null];
        }
    }

    const logTotal = Math.log2(total);
    const integerPart = Math.floor(logTotal);

    return [integerPart, weight];
}

function drawHorizontalBars(container: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: BarData[], total: number, barAreaWidth: number,
    barHeight: number, gapWidth: number, displayBits: boolean, widgetId: string,
    barStartX: number, availableWidth: number) {

    const entropy = data.reduce((sum, d) => sum + d.probability * d.information, 0);

    // Group adjacent bars by weight for labeling
    const adjacentGroups: { weight: number; startIndex: number; count: number }[] = [];
    data.forEach((d, i) => {
        if (i === 0 || data[i - 1].weight !== d.weight) {
            adjacentGroups.push({ weight: d.weight, startIndex: i, count: 1 });
        } else {
            adjacentGroups[adjacentGroups.length - 1].count++;
        }
    });

    // Calculate positions at 1/total intervals
    let currentPosition = 0;

    data.forEach((d, i) => {
        const unitWidth = barAreaWidth / total;
        const barWidth = d.weight * unitWidth - gapWidth;
        const barX = barStartX + (currentPosition * unitWidth);

        const barGroup = container.append("g")
            .attr("class", `bar-group-${widgetId}`)
            .attr("data-index", i)
            .style("cursor", "pointer");

        barGroup.append("rect")
            .attr("class", `bar-${widgetId}`)
            .attr("x", barX)
            .attr("y", 0)
            .attr("width", barWidth)
            .attr("height", barHeight)
            .style("fill", "steelblue")
            .style("stroke", "none");

        if (!displayBits) {
            currentPosition += d.weight;
            return
        }
        // Only show label for the first bar of each adjacent group
        const adjacentGroup = adjacentGroups.find(g => g.startIndex === i);
        if (adjacentGroup) {
            const [num, denom] = d.probabilityFraction;
            const probText = denom === 1 ? `${num}` : `${num}/${denom}`;

            const groupCount = adjacentGroup.count;
            let text = "";
            if (groupCount > 1) {
                text += `${groupCount} × `;
            }

            const infoDisplay = Number.isInteger(d.information) ?
                d.information.toString() :
                d.information.toFixed(3);

            text += `${probText} × ${infoDisplay}`;

            // Calculate center position for this adjacent group
            const unitWidth = barAreaWidth / total;

            // Find the total span of this adjacent group
            const groupStartPos = currentPosition;
            const groupEndPos = currentPosition + (groupCount * d.weight);
            const groupCenterX = barStartX + ((groupStartPos + groupEndPos) / 2) * unitWidth;

            barGroup.append("text")
                .attr("class", `formula-${widgetId}`)
                .attr("x", groupCenterX)
                .attr("y", barHeight + 15)
                .attr("text-anchor", "middle")
                .style("font-family", "monospace")
                .style("font-size", "10px")
                .style("fill", "currentColor")
                .text(text);
        }

        barGroup.on("mouseover", function (event: MouseEvent) {
            // Clear any existing tooltips first
            d3.selectAll(`.tooltip-${widgetId}`).remove();

            showTooltip(event, d, widgetId);
        }).on("mouseout", function () {
            d3.selectAll(`.tooltip-${widgetId}`).remove();
        }).on("mouseleave", function () {
            // Additional cleanup on mouseleave
            d3.selectAll(`.tooltip-${widgetId}`).remove();
        });

        currentPosition += d.weight;
    });

    const entNumber = (entropy === Math.round(entropy)) ? entropy.toFixed(0) : entropy.toFixed(3)

    if (displayBits) {
        container.append("text")
            .attr("x", availableWidth + 5)
            .attr("y", barHeight / 2)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "middle")
            .style("font-family", "monospace")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "currentColor")
            .text(`= ${entNumber} bit${entropy === 1.0 ? '' : 's'}`);
    }
}


function showTooltip(event: MouseEvent, d: BarData, widgetId: string) {
    const [intPart, logArg] = d.informationExact;
    const infoText = logArg === null ?
        intPart.toFixed(0) :
        `${intPart} - log₂(${logArg})`;

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
            <strong>Weight: ${d.weight}</strong><br/>
            p: ${d.probabilityFraction[0]}/${d.probabilityFraction[1]}<br/>
            I: ${d.information.toFixed(3)} = ${infoText} bit${d.information > 1 ? 's' : ''}<br/>
            p × I: ${(d.probability * d.information).toFixed(3)} bit${d.information > 1 ? 's' : ''}
        `);

    tooltip.style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
}