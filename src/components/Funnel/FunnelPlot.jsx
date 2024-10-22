import { memo, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { useAppStore } from "../../store/appStore";
import { calcSurpriseNewData } from "../../utils/surprise";
import PropTypes from "prop-types";
import "./funnelPlot.css";

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
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);

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

      return contourData;
    }
    return null;
  }, [data, dataSummary]);

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

  return (
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
        style={{
          width: originalWidth,
          height: originalHeight,
        }}
      />
    </div>
  );
}

FunnelPlot.propTypes = {
  data: PropTypes.object,
  dataSummary: PropTypes.object,
  colorScale: PropTypes.func,
};

export default memo(FunnelPlot);
