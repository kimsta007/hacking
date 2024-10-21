import { memo, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

const width = 400;
const height = 200;

const data = Array.from({ length: 3000 }, () => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
}));

function FunnelPlot() {
  const canvasRef = useRef(null);
  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, 100]).range([0, width]),
    []
  );
  const yScale = useMemo(
    () => d3.scaleLinear().domain([0, 100]).range([height, 0]),
    []
  );

  useEffect(() => {
    const context = canvasRef.current.getContext("2d");
    context.clearRect(0, 0, width, height);
    for (const { x, y } of data) {
      context.beginPath();
      context.arc(xScale(x), yScale(y), 2, 0, 2 * Math.PI);
      context.fillStyle = "blue";
      context.fill();
    }
    // context.fillStyle = "blue";
    // context.fill();
  }, [xScale, yScale]);

  return (
    <div>
      <h1>FunnelPlot</h1>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
}

export default memo(FunnelPlot);
