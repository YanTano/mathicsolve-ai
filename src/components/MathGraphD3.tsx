import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Activity, LineChart, Maximize2, Minimize2, RefreshCw } from "lucide-react";

interface MathGraphD3Props {
  problemText: string;
  finalAnswer?: string;
  topic?: string;
}

interface PlotDataPoint {
  x: number;
  y: number;
}

interface PlotSeries {
  id: string;
  label: string;
  color: string;
  points: PlotDataPoint[];
  fn: (x: number) => number;
  isDashed?: boolean;
}

interface HighlightPoint {
  x: number;
  y: number;
  label: string;
  color: string;
}

export const MathGraphD3: React.FC<MathGraphD3Props> = ({
  problemText,
  finalAnswer,
  topic,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverData, setHoverData] = useState<{ x: number; y1?: number; y2?: number } | null>(null);
  const [zoomRange, setZoomRange] = useState<number>(10); // default x range [-10, 10]
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Parse the input expression into plotting functions
  const parseProblemToSeries = (): {
    seriesList: PlotSeries[];
    highlights: HighlightPoint[];
    xMin: number;
    xMax: number;
  } => {
    const isLight = document.documentElement.classList.contains("light-theme");
    const cyanColor = isLight ? "#0284c7" : "#00F0FF";
    const pinkColor = isLight ? "#e11d48" : "#FF007A";
    const emeraldColor = isLight ? "#059669" : "#10B981";

    const clean = (problemText || "").trim().toLowerCase().replace(/\s+/g, "");
    let seriesList: PlotSeries[] = [];
    let highlights: HighlightPoint[] = [];

    // Parse solution point if available (e.g., "x = 5" or "x = 2 or x = 3")
    let solutionXValues: number[] = [];
    if (finalAnswer) {
      const xMatches = finalAnswer.match(/x\s*=\s*([+-]?\d+(?:\.\d+)?)/gi);
      if (xMatches) {
        xMatches.forEach((m) => {
          const val = parseFloat(m.replace(/x\s*=\s*/i, ""));
          if (!isNaN(val)) solutionXValues.push(val);
        });
      } else {
        const numVal = parseFloat(finalAnswer.replace(/[^\d.-]/g, ""));
        if (!isNaN(numVal)) solutionXValues.push(numVal);
      }
    }

    // Determine domain center around solution
    let center = 0;
    if (solutionXValues.length > 0) {
      center = solutionXValues.reduce((a, b) => a + b, 0) / solutionXValues.length;
    }

    const domainSpan = zoomRange;
    const xMin = center - domainSpan;
    const xMax = center + domainSpan;
    const stepCount = 200;
    const step = (xMax - xMin) / stepCount;

    // Helper to generate points for a function
    const generatePoints = (fn: (x: number) => number): PlotDataPoint[] => {
      const pts: PlotDataPoint[] = [];
      for (let i = 0; i <= stepCount; i++) {
        const x = xMin + i * step;
        const y = fn(x);
        if (isFinite(y) && !isNaN(y) && Math.abs(y) < 1000) {
          pts.push({ x, y });
        }
      }
      return pts;
    };

    // 1. Linear equation pattern: ax + b = c (e.g. 2x + 5 = 15)
    const linearMatch = clean.match(/^([+-]?\d*)x([+-]\d+)?=([+-]?\d+)$/);
    if (linearMatch) {
      let aStr = linearMatch[1];
      let a = aStr === "" || aStr === "+" ? 1 : aStr === "-" ? -1 : parseFloat(aStr);
      let b = linearMatch[2] ? parseFloat(linearMatch[2]) : 0;
      let c = parseFloat(linearMatch[3]);

      if (!isNaN(a) && a !== 0) {
        const f1 = (x: number) => a * x + b;
        const f2 = (_x: number) => c;

        seriesList.push({
          id: "lhs",
          label: `y = ${a !== 1 ? (a === -1 ? "-" : a) : ""}x ${b >= 0 ? "+ " + b : "- " + Math.abs(b)}`,
          color: cyanColor,
          fn: f1,
          points: generatePoints(f1),
        });

        seriesList.push({
          id: "rhs",
          label: `y = ${c}`,
          color: pinkColor,
          fn: f2,
          points: generatePoints(f2),
          isDashed: true,
        });

        const xSol = (c - b) / a;
        highlights.push({
          x: xSol,
          y: c,
          label: `Intersection (${xSol}, ${c})`,
          color: cyanColor,
        });
      }
    }

    // 2. Quadratic equation: x^2 ...
    if (seriesList.length === 0 && (clean.includes("x^2") || clean.includes("x²"))) {
      // Quadratic f(x) = x^2 - 5x + 6
      const fQuad = (x: number) => x * x - 5 * x + 6;
      seriesList.push({
        id: "quad",
        label: "y = x² - 5x + 6",
        color: cyanColor,
        fn: fQuad,
        points: generatePoints(fQuad),
      });

      solutionXValues.forEach((solX) => {
        highlights.push({
          x: solX,
          y: fQuad(solX),
          label: `Root (${solX}, 0)`,
          color: emeraldColor,
        });
      });
    }

    // 3. Simple Linear y = mx + c or ax = c
    if (seriesList.length === 0) {
      const simpleX = clean.match(/^([+-]?\d*)x=([+-]?\d+)$/);
      if (simpleX) {
        let a = simpleX[1] === "" ? 1 : simpleX[1] === "-" ? -1 : parseFloat(simpleX[1]);
        let c = parseFloat(simpleX[2]);
        if (!isNaN(a) && a !== 0) {
          const f1 = (x: number) => a * x;
          const f2 = (_x: number) => c;
          seriesList.push({
            id: "lhs",
            label: `y = ${a}x`,
            color: cyanColor,
            fn: f1,
            points: generatePoints(f1),
          });
          seriesList.push({
            id: "rhs",
            label: `y = ${c}`,
            color: pinkColor,
            fn: f2,
            points: generatePoints(f2),
            isDashed: true,
          });
          const sol = c / a;
          highlights.push({
            x: sol,
            y: c,
            label: `Solution (${sol}, ${c})`,
            color: cyanColor,
          });
        }
      }
    }

    // Fallback: Default Linear plot centered on solution
    if (seriesList.length === 0) {
      const solX = solutionXValues[0] ?? 2;
      const fDefault = (x: number) => 2 * x + (10 - 2 * solX);
      seriesList.push({
        id: "default",
        label: `y = 2x + ${10 - 2 * solX}`,
        color: cyanColor,
        fn: fDefault,
        points: generatePoints(fDefault),
      });

      highlights.push({
        x: solX,
        y: fDefault(solX),
        label: `Solution x = ${solX}`,
        color: cyanColor,
      });
    }

    return { seriesList, highlights, xMin, xMax };
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const { seriesList, highlights, xMin, xMax } = parseProblemToSeries();

    // Determine Y range from generated series points
    let allYPoints: number[] = [];
    seriesList.forEach((s) => s.points.forEach((p) => allYPoints.push(p.y)));
    highlights.forEach((h) => allYPoints.push(h.y));

    if (allYPoints.length === 0) allYPoints = [-10, 10];
    let yMin = d3.min(allYPoints) ?? -10;
    let yMax = d3.max(allYPoints) ?? 10;

    // Pad Y axis for nice visual spacing
    const yPad = Math.max(Math.abs(yMax - yMin) * 0.25, 2);
    yMin -= yPad;
    yMax += yPad;

    // Clear previous SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth || 480;
    const height = isExpanded ? 360 : 260;
    const margin = { top: 25, right: 30, bottom: 40, left: 45 };
    const width = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", containerWidth).attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // D3 Scales
    const xScale = d3.scaleLinear().domain([xMin, xMax]).range([0, width]);
    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([innerHeight, 0]);

    const isLight = document.documentElement.classList.contains("light-theme");
    const gridLineColor = isLight ? "rgba(15, 23, 42, 0.12)" : "rgba(255, 255, 255, 0.06)";
    const axisLineColor = isLight ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.35)";
    const axisTextColor = isLight ? "rgba(15, 23, 42, 0.7)" : "rgba(255, 255, 255, 0.6)";

    // Gridlines
    const xGrid = d3
      .axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat(() => "");
    const yGrid = d3
      .axisLeft(yScale)
      .tickSize(-width)
      .tickFormat(() => "");

    g.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xGrid)
      .selectAll("line")
      .attr("stroke", gridLineColor)
      .attr("stroke-dasharray", "3,3");

    g.append("g")
      .attr("class", "grid")
      .call(yGrid)
      .selectAll("line")
      .attr("stroke", gridLineColor)
      .attr("stroke-dasharray", "3,3");

    // X = 0 and Y = 0 axis lines
    if (xMin <= 0 && xMax >= 0) {
      g.append("line")
        .attr("x1", xScale(0))
        .attr("x2", xScale(0))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", axisLineColor)
        .attr("stroke-width", 1.5);
    }

    if (yMin <= 0 && yMax >= 0) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", axisLineColor)
        .attr("stroke-width", 1.5);
    }

    // X Axis
    const xAxis = d3.axisBottom(xScale).ticks(7);
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis)
      .attr("color", axisLineColor)
      .selectAll("text")
      .attr("fill", axisTextColor)
      .attr("font-size", "10px")
      .attr("font-family", "monospace");

    // Y Axis
    const yAxis = d3.axisLeft(yScale).ticks(6);
    g.append("g")
      .call(yAxis)
      .attr("color", axisLineColor)
      .selectAll("text")
      .attr("fill", axisTextColor)
      .attr("font-size", "10px")
      .attr("font-family", "monospace");

    // D3 Line Generator
    const lineGen = d3
      .line<PlotDataPoint>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Plot Series Lines
    seriesList.forEach((series) => {
      const path = g
        .append("path")
        .datum(series.points)
        .attr("fill", "none")
        .attr("stroke", series.color)
        .attr("stroke-width", 2.5)
        .attr("stroke-linecap", "round")
        .attr("d", lineGen);

      if (series.isDashed) {
        path.attr("stroke-dasharray", "6,6");
      } else {
        // Draw animation
        const totalLength = path.node()?.getTotalLength() || 0;
        path
          .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
          .attr("stroke-dashoffset", totalLength)
          .transition()
          .duration(1200)
          .ease(d3.easeCubicOut)
          .attr("stroke-dashoffset", 0);
      }
    });

    // Plot Highlight Solution Points
    highlights.forEach((pt) => {
      const cx = xScale(pt.x);
      const cy = yScale(pt.y);

      if (cx >= 0 && cx <= width && cy >= 0 && cy <= innerHeight) {
        // Glow outer pulse ring
        g.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 8)
          .attr("fill", "none")
          .attr("stroke", pt.color)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.8)
          .append("animate")
          .attr("attributeName", "r")
          .attr("values", "6;14;6")
          .attr("dur", "2s")
          .attr("repeatCount", "indefinite");

        // Solid Center Point
        g.append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 4.5)
          .attr("fill", pt.color)
          .attr("stroke", "#05070B")
          .attr("stroke-width", 1.5);

        // Label above point
        g.append("text")
          .attr("x", cx)
          .attr("y", cy - 12)
          .attr("text-anchor", "middle")
          .attr("fill", pt.color)
          .attr("font-size", "10px")
          .attr("font-weight", "bold")
          .attr("font-family", "monospace")
          .text(pt.label);
      }
    });

    // Interactive Hover Tracking Line
    const hoverLine = g
      .append("line")
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .attr("stroke", "rgba(0, 240, 255, 0.4)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4")
      .style("opacity", 0);

    const overlay = g
      .append("rect")
      .attr("width", width)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    overlay.on("mousemove", (event) => {
      const [mouseX] = d3.pointer(event);
      const currX = xScale.invert(mouseX);
      hoverLine.attr("x1", mouseX).attr("x2", mouseX).style("opacity", 1);

      const y1 = seriesList[0] ? seriesList[0].fn(currX) : undefined;
      const y2 = seriesList[1] ? seriesList[1].fn(currX) : undefined;

      setHoverData({
        x: parseFloat(currX.toFixed(2)),
        y1: y1 !== undefined && isFinite(y1) ? parseFloat(y1.toFixed(2)) : undefined,
        y2: y2 !== undefined && isFinite(y2) ? parseFloat(y2.toFixed(2)) : undefined,
      });
    });

    overlay.on("mouseleave", () => {
      hoverLine.style("opacity", 0);
      setHoverData(null);
    });
  }, [problemText, finalAnswer, topic, zoomRange, isExpanded]);

  const { seriesList } = parseProblemToSeries();

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 relative overflow-hidden">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
            <LineChart className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            D3 Algebraic Visual Graph
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <button
            onClick={() => setZoomRange((prev) => Math.max(prev - 5, 5))}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-white/70 hover:text-white transition"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={() => setZoomRange((prev) => Math.min(prev + 5, 30))}
            className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-white/70 hover:text-white transition"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-white/5 border border-white/10 rounded-md text-white/70 hover:text-white transition"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* GRAPH LEGEND */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-white/60 pt-1">
        {seriesList.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-0.5 inline-block rounded-full"
              style={{
                backgroundColor: s.color,
                borderStyle: s.isDashed ? "dashed" : "solid",
              }}
            />
            <span className="text-white font-medium">{s.label}</span>
          </div>
        ))}
      </div>

      {/* D3 CANVAS CONTAINER */}
      <div ref={containerRef} className="w-full relative flex items-center justify-center">
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* HOVER TOOLTIP BADGE */}
        {hoverData && (
          <div className="absolute top-2 right-2 bg-black/80 border border-[#00F0FF]/40 rounded-xl px-3 py-1.5 text-[10px] font-mono text-[#00F0FF] shadow-lg pointer-events-none z-10 flex items-center gap-3">
            <div>
              <span className="text-white/50">X:</span> {hoverData.x}
            </div>
            {hoverData.y1 !== undefined && (
              <div>
                <span className="text-[#00F0FF]">Y1:</span> {hoverData.y1}
              </div>
            )}
            {hoverData.y2 !== undefined && (
              <div>
                <span className="text-[#FF007A]">Y2:</span> {hoverData.y2}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-[10px] text-white/40 text-center font-mono">
        Hover across graph to inspect dynamic coordinates • D3 Plotter
      </div>
    </div>
  );
};
