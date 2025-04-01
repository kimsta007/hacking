import { memo, useEffect, useRef } from "react";
import * as d3 from "d3";
import classes from "./Map.module.css";

const Bivariate = () => {
  const divRef = useRef(null);

  useEffect(() => {
    const k = 15;
    const n = 3;
    const colors = [
      "#e8e8e8", "#e4acac", "#c85a5a",
      "#b0d5df", "#ad9ea5", "#985356",
      "#64acbe", "#627f8c", "#574249"
    ];

    d3.select(divRef.current).selectAll("*").remove();

    const svg = d3.select(divRef.current)
      .append("svg")
      .attr("width", 80) 
      .attr("height", 80) 
      .append("g")
      .attr("transform", `translate(40, 40) rotate(-45)`);  

    d3.cross(d3.range(n), d3.range(n)).forEach(([i, j]) => {
      svg.append("rect")
        .attr("width", k)
        .attr("height", k)
        .attr("x", i * k - (n * k) / 2) 
        .attr("y", (n - 1 - j) * k - (n * k) / 2)
        .attr("fill", colors[j * n + i]);
    });

    svg.append("text")
      .attr("transform", `rotate(90) translate(${-n * k / 2 + 25}, 35)`) 
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .text("Poverty");

    svg.append("text")
      .attr("x", 0)
      .attr("y", n * k / 2 + 10)
      .attr("text-anchor", "middle")
      .style("font-size", "9px")
      .text("Obesity");

  }, []);

  return <div ref={divRef} className={classes.legend}></div>; 
};

export default memo(Bivariate);
