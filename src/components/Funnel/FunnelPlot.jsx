import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useAppStore } from "../../store/appStore";
import { calcSurpriseNewData } from "../../utils/surprise";
import PropTypes from "prop-types";
import "./funnelPlot.css";
import { Box, Button, SegmentedControl } from "@mantine/core";

const dpr = window.devicePixelRatio || 2;

const originalWidth = 500;
const originalHeight = 200;
const width = originalWidth * dpr;
const height = originalHeight * dpr;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };
const W = originalWidth - margin.left - margin.right;
const H = originalHeight - margin.top - margin.bottom;

const contourSteps = 1;

function FunnelPlot({ id, data, dataSummary, colorScale }) {
  const canvasRef = useRef(null);
  const canvasHighlightRef = useRef(null);
  const svgRef = useRef(null);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);
  const brushView = useAppStore((state) => state.brushView);
  const setBrushView = useAppStore((state) => state.setBrushView);
  const brushedCountyIds = useAppStore((state) => state.brushedCountyIds);
  const setBrushedCountyIds = useAppStore((state) => state.setBrushedCountyIds);
  const updateSurpriseRangeBy = useAppStore(
    (state) => state.updateSurpriseRangeBy
  );

  const [interactionMode, setInteractionMode] = useState("Normal"); // normal, brush, scale

  const xScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, dataSummary.maxPopulation])
        .range([0, W])
        .nice(),
    [dataSummary]
  );

  const yScale = useMemo(() => {
    const max =
      Math.abs(dataSummary?.zScoreRange[0]) >
      Math.abs(dataSummary?.zScoreRange[1])
        ? Math.abs(dataSummary?.zScoreRange[0])
        : Math.abs(dataSummary?.zScoreRange[1]);
    return d3.scaleLinear().domain([-max, max]).range([H, 0]).nice();
  }, [dataSummary]);

  const delaunay = useMemo(() => {
    if (data) {
      return d3.Delaunay.from(
        Object.values(data),
        (d) => xScale(d.population),
        (d) => yScale(d.zScore)
      );
    }
  }, [data, xScale, yScale]);

  const handleInteractionModeChange = useCallback(
    (mode) => {
      setInteractionMode(mode);
      if (mode === "Normal") {
        // clear brush
        setBrushedCountyIds([]);
      } else if (mode === "Brush") {
        setHoveredCountyId(null);
      }
    },
    [setBrushedCountyIds, setHoveredCountyId]
  );

  const contourData = useMemo(() => {
    console.log("calculate background surprise data");

    if (dataSummary && data) {
      const rangePopulation = [1, dataSummary.maxPopulation];

      const steps = contourSteps;

      const maxZScore = Math.max(
        Math.abs(dataSummary.zScoreRange[0]),
        Math.abs(dataSummary.zScoreRange[1])
      );

      let rangeRates = [
        -maxZScore * dataSummary.rateStdDev + dataSummary.rateMean,
        +maxZScore * dataSummary.rateStdDev + dataSummary.rateMean,
      ];

      const sy = d3.scaleLinear().domain([H, 0]).range(rangeRates);
      const sx = d3.scaleLinear().domain([0, W]).range(rangePopulation);

      const newSurpriseData = [];
      for (let i = 0; i < H; i += steps) {
        for (let j = 0; j < W; j += steps) {
          newSurpriseData.push({ rate: sy(i), population: sx(j) });
        }
      }

      const backgroundData = calcSurpriseNewData(dataSummary, newSurpriseData);
      const contourData = backgroundData.map((d) => d.surprise);
      console.log(data);
      return contourData;
    }
    return null;
  }, [data, dataSummary]);

  useEffect(() => {
    if (!contourData) return;
    const context = canvasRef.current.getContext("2d");
    context.save();
    context.clearRect(0, 0, width, height);
    context.scale(dpr, dpr);
    context.translate(margin.left, margin.top);
    const steps = contourSteps;

    //  render background contours
    const contours = d3
      .contours()
      .size([Math.ceil(W / steps), Math.ceil(H / steps)]);
    const projection = d3.geoIdentity().scale(W / Math.ceil(W / steps));
    const path = d3.geoPath(projection, context);

    for (let s = -1; s <= 1; s += 0.01) {
      context.beginPath();
      path(contours.contour(contourData, s));
      context.fillStyle = colorScale(s);
      context.fill();
    }

    context.globalAlpha = 0.5;

    context.fillStyle = "black";
    context.strokeStyle = "white";
    // render data points
    Object.values(data).forEach((d) => {
      context.beginPath();
      context.arc(xScale(d.population), yScale(d.zScore), 3, 0, 2 * Math.PI);
      context.fill();
      context.stroke();
    });

    context.restore();
    console.log("render funnel plot");
  }, [xScale, yScale, data, contourData, colorScale]);

  useEffect(() => {
    const context = canvasHighlightRef.current.getContext("2d");
    context.save();
    context.clearRect(0, 0, width, height);
    const d = data[hoveredCountyId];

    context.scale(dpr, dpr);
    context.translate(margin.left, margin.top);

    brushedCountyIds.forEach((countyId) => {
      const d = data[countyId];
      if (d) {
        context.beginPath();
        context.arc(xScale(d.population), yScale(d.zScore), 5, 0, 2 * Math.PI);
        context.fillStyle = "white";
        context.fill();
        context.beginPath();
        context.arc(xScale(d.population), yScale(d.zScore), 4, 0, 2 * Math.PI);
        context.fillStyle = "green";
        context.fill();
      }
    });

    if (!hoveredCountyId || !d) {
      context.restore();
      return;
    }

    context.beginPath();
    context.arc(xScale(d.population), yScale(d.zScore), 5, 0, 2 * Math.PI);
    context.fillStyle = "white";
    context.fill();
    context.beginPath();
    context.arc(xScale(d.population), yScale(d.zScore), 4, 0, 2 * Math.PI);
    context.fillStyle = "blue";
    context.fill();

    context.restore();
  }, [hoveredCountyId, brushedCountyIds, data, xScale, yScale]);

  const handlePointerMove = useCallback(
    (e) => {
      const transform = d3.zoomIdentity.translate(margin.left, margin.top);
      const p = transform.invert(d3.pointer(e));
      const i = delaunay.find(...p);
      const county = Object.values(data)[i];
      setHoveredCountyId(county.fips);
    },
    [delaunay, data, setHoveredCountyId]
  );

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }
    const transform = d3.zoomIdentity.translate(margin.left, margin.top);

    // Create the brush behavior.
    d3.select(svgRef.current).call(
      d3.brush().on("start brush end", ({ selection }) => {
        setBrushView(id);
        if (selection) {
          // const [[x0, y0], [x1, y1]] = selection;
          const [x0, y0] = transform.invert(selection[0]);
          const [x1, y1] = transform.invert(selection[1]);

          const selectedCounties = Object.values(data).filter(
            (d) =>
              x0 <= xScale(d.population) &&
              xScale(d.population) < x1 &&
              y0 <= yScale(d.zScore) &&
              yScale(d.zScore) < y1
          );

          setBrushedCountyIds(selectedCounties.map((c) => c.fips));
        } else {
          setBrushedCountyIds([]);
        }
      })
    );
  }, [data, xScale, yScale, setBrushView, setBrushedCountyIds, id]);

  useEffect(() => {
    if (brushView !== id) {
      d3.select(svgRef.current).call(d3.brush().clear);
    }
  }, [brushView, id]);

  const handleMouseDown = useCallback(
    (e) => {
      const direction = e.target.dataset.pos;
      let startY = e.pageY;
      const mouseMoveListener = (ev) => {
        const diff = ev.pageY - startY;
        startY = ev.pageY;
        updateSurpriseRangeBy(diff, direction);
      };
      const mouseUpListener = () => {
        window.removeEventListener("mousemove", mouseMoveListener);
        window.removeEventListener("mouseup", mouseUpListener);
      };

      window.addEventListener("mousemove", mouseMoveListener);
      window.addEventListener("mouseup", mouseUpListener);

      return () => {
        window.removeEventListener("mousemove", mouseMoveListener);
        window.removeEventListener("mouseup", mouseUpListener);
      };
    },
    [updateSurpriseRangeBy]
  );

  return (
    <div>
      <Box m={5}>
        <SegmentedControl
          onChange={handleInteractionModeChange}
          data={["Normal", "Brush", "Scale"]}
        />
      </Box>
      <div className="funnelPlotContainer">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="funnelPlotCanvas"
          style={{
            width: originalWidth,
            height: originalHeight,
          }}
        />
        <canvas
          ref={canvasHighlightRef}
          width={width}
          height={height}
          className="funnelPlotCanvas"
          onPointerMove={handlePointerMove}
          style={{
            width: originalWidth,
            height: originalHeight,
          }}
        />
        {/* svg for brushing */}
        <svg
          ref={svgRef}
          style={{ display: interactionMode === "Brush" ? "block" : "none" }}
          className="funnelPlotSvg"
          width={originalWidth}
          height={originalHeight}
        />
        <div
          className="funnelPlotScaleOverlay"
          style={{
            display: interactionMode === "Scale" ? "block" : "none",
          }}
        >
          <div
            className="funnelPlotScaleOverlay__top"
            data-pos="high"
            onMouseDown={handleMouseDown}
          ></div>
          <div
            className="funnelPlotScaleOverlay__bottom"
            data-pos="low"
            onMouseDown={handleMouseDown}
          ></div>
        </div>
      </div>
    </div>
  );
}

FunnelPlot.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
  dataSummary: PropTypes.object,
  colorScale: PropTypes.func,
};

export default memo(FunnelPlot);
