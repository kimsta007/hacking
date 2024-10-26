import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useAppStore } from "../../store/appStore";
import { calcSurpriseNewData } from "../../utils/surprise";
import PropTypes from "prop-types";
import "./funnelPlot.css";
import { Box, Button } from "@mantine/core";

const dpr = window.devicePixelRatio || 2;

const originalWidth = 500;
const originalHeight = 200;
const width = originalWidth * dpr;
const height = originalHeight * dpr;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };
const W = originalWidth - margin.left - margin.right;
const H = originalHeight - margin.top - margin.bottom;

const contourSteps = 1;

function FunnelPlot({ data, dataSummary, colorScale }) {
  const canvasRef = useRef(null);
  const canvasHighlightRef = useRef(null);
  const svgRef = useRef(null);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);

  const [interactionMode, setInteractionMode] = useState("normal"); // normal, brush

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, dataSummary.maxPopulation]).range([0, W]),
    [dataSummary]
  );

  const yScale = useMemo(() => {
    const max =
      Math.abs(dataSummary?.zScoreRange[0]) >
      Math.abs(dataSummary?.zScoreRange[1])
        ? Math.abs(dataSummary?.zScoreRange[0])
        : Math.abs(dataSummary?.zScoreRange[1]);
    return d3.scaleLinear().domain([-max, max]).range([H, 0]);
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

  const toggleInteractionMode = useCallback(() => {
    setInteractionMode(interactionMode === "normal" ? "brush" : "normal");
  }, [interactionMode]);

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

    // render data points
    Object.values(data).forEach((d) => {
      context.beginPath();
      context.arc(xScale(d.population), yScale(d.zScore), 2, 0, 2 * Math.PI);
      context.fillStyle = "black";
      context.fill();
    });

    context.restore();
    console.log("render funnel plot");
  }, [xScale, yScale, data, contourData, colorScale]);

  useEffect(() => {
    const context = canvasHighlightRef.current.getContext("2d");
    context.save();
    context.clearRect(0, 0, width, height);
    const d = data[hoveredCountyId];

    if (!hoveredCountyId || !d) {
      context.restore();
      return;
    }

    context.scale(dpr, dpr);
    context.translate(margin.left, margin.top);

    context.beginPath();
    context.arc(xScale(d.population), yScale(d.zScore), 5, 0, 2 * Math.PI);
    context.fillStyle = "white";
    context.fill();
    context.beginPath();
    context.arc(xScale(d.population), yScale(d.zScore), 4, 0, 2 * Math.PI);
    context.fillStyle = "blue";
    context.fill();

    context.restore();
  }, [hoveredCountyId, data, xScale, yScale]);

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

  return (
    <div>
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
        {interactionMode === "brush" && (
          <svg
            ref={svgRef}
            className="funnelPlotSvg"
            width={originalWidth}
            height={originalHeight}
          />
        )}
      </div>
      <Box m={5}>
        <Button.Group position="center">
          <Button
            variant={interactionMode === "normal" ? "filled" : "default"}
            onClick={toggleInteractionMode}
            size="sm"
          >
            Normal
          </Button>
          <Button
            variant={interactionMode === "brush" ? "filled" : "default"}
            onClick={toggleInteractionMode}
            size="sm"
          >
            Brush
          </Button>
        </Button.Group>
      </Box>
    </div>
  );
}

FunnelPlot.propTypes = {
  data: PropTypes.object,
  dataSummary: PropTypes.object,
  colorScale: PropTypes.func,
};

export default memo(FunnelPlot);
