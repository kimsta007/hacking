import { memo, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import * as d3 from "d3";
import classes from "./Map.module.css";

const svgWidth = 350;
const svgHeight = 30;
const legendWidth = 320;
const legendHeight = 20;

function Legend({ colorScale }) {
  const legendRef = useRef(null);

  useEffect(() => {
    if (!legendRef.current || !colorScale) {
      return;
    }

    d3.select(legendRef.current).selectAll("*").remove();
    const svg = d3
      .select(legendRef.current)
      .append("svg")
      .attr("width", svgWidth)
      .attr("height", svgHeight);

    // Create a group for the legend
    const legendGroup = svg
      .append("g")
      .attr(
        "transform",
        `translate(${(svgWidth - legendWidth) / 2}, 0)`
      );

    // Add rectangles for each color in the range
    legendGroup
      .selectAll("rect")
      .data(colorScale.range())
      .enter()
      .append("rect")
      .attr("x", (d, i) => i * (legendWidth / colorScale.range().length))
      .attr("y", 15)
      .attr("width", legendWidth / colorScale.range().length)
      .attr("height", legendHeight)
      .style("fill", (d) => d);

    // Labels for the quantile breaks
    const quantiles = colorScale.quantiles(); // Array of breakpoints
    const legendLabels = [
      colorScale.domain()[0],
      ...quantiles,
      colorScale.domain()[1],
    ];

    legendGroup
      .selectAll("text")
      .data(legendLabels)
      .enter()
      .append("text")
      .attr("x", (d, i) => i * (legendWidth / (legendLabels.length - 1)))
      .attr("y", legendHeight - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .text((d) => Math.round(d * 100) / 100); 
  }, [colorScale]);

  return <div ref={legendRef} className={classes.legend}></div>;
}

Legend.propTypes = {
  colorScale: PropTypes.func.isRequired,
};

export default memo(Legend);
