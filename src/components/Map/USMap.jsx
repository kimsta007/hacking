import PropTypes from "prop-types";
import { memo, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import * as topojson from "topojson-client";
import * as topojsonSimplify from "topojson-simplify";
import * as d3 from "d3";
import { useSVGMap } from "./useSVGMap";
import us from "../../data/us-10m.v1.json";
import classes from "./Map.module.css";

const width = 500;
const height = 300;

function USMap({ plot, colorScale }) {
  const data = useAppStore((state) => state.data);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);

  const { svgRef, gRef, tooltipX, tooltipY, hoveredCountyId, zoom } = useSVGMap(
    width,
    height
  );

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    // d3.select(svgRef.current).selectAll("*").remove();
    console.log("Render Map");
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;");

    svg.call(zoom);
    const path = d3.geoPath();

    let g = svg.select("g.nationalMapGroup");
    if (g.empty()) {
      g = svg.append("g").attr("class", "nationalMapGroup")
      gRef.current = g;
    }
    g.selectAll("*").remove();

    async function load() {
      // let counties = topojson.feature(us, us.objects.counties).features;

      const simplifiedTopology = topojsonSimplify.presimplify(us);

      const simplified = topojsonSimplify.simplify(simplifiedTopology, 0.9);

      const simplifiedCounties = topojson.feature(
        simplified,
        simplified.objects.counties
      ).features;

      g.append("g")
        .selectAll("path")
        .data(simplifiedCounties)
        .join("path")
        .attr("d", path)
        .attr("fill", (d) =>
          data[d.id] ? colorScale(data[d.id][plot]) : "#ffffff"
        )
        .attr("data-id", (d) => d.id)
        .attr("stroke", "#AAA")
        .on("mouseover", (event, d) => {
          setHoveredCountyId(d.id);
        })
        .on("mouseout", () => {
          setHoveredCountyId(null);
        });
      g.append("g")
        .append("path")
        .attr("fill", "none")
        .attr("pointer-events", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
        .attr("stroke-linejoin", "round")
        .attr(
          "d",
          path(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        );
    }

    load();
  }, [svgRef, gRef, setHoveredCountyId, zoom, data, colorScale, plot]);

  return (
    <div className={classes.map} style={{ height, width }}>
      <svg ref={svgRef} width={width} height={height} className="mapSvg" />
      <div
        className={classes.mapTooltip}
        style={{
          left: tooltipX,
          top: tooltipY,
          display: data[hoveredCountyId] ? "block" : "none",
        }}
      >
        {data[hoveredCountyId] && (
          <>
            <div>
              <strong>{data[hoveredCountyId].county}</strong>
            </div>
            <div style={{ textTransform: "capitalize" }}>
              {plot}: {data[hoveredCountyId][plot].toFixed(2)}
            </div>
            <div>Population: {data[hoveredCountyId]["population"]}</div>
            <div>Typology: {data[hoveredCountyId]["typology"]}</div>
          </>
        )}
      </div>
    </div>
  );
}

USMap.propTypes = {
  plot: PropTypes.string.isRequired,
  colorScale: PropTypes.func.isRequired,
};

export default memo(USMap);
