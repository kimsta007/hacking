import PropTypes from "prop-types";
import { memo, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import * as topojson from "topojson-client";
import * as topojsonSimplify from "topojson-simplify";
import * as d3 from "d3";
import { useSVGMap } from "./useSVGMap";
import ToolTip from "./ToolTip";
import Legend from "./Legend";
import us from "../../data/us-10m.v1.json";
import classes from "./Map.module.css";

const width = 500;
const height = 300;

function USMap({ plot, colorScale, range }) {
  const data = useAppStore((state) => state.data);
  const selectedState = useAppStore((state) => state.selectedState);
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
      g = svg.append("g").attr("class", "nationalMapGroup");
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
        .attr("opacity", (d) => {
          // get 2 digit fips code and match with selected state's fips
          const fips = Math.floor(+d.id / 1000);
          return selectedState ? (fips === +selectedState.fips ? 1 : 0.5) : 1;
        })
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
        .attr("stroke", "#555")
        .attr("stroke-width", 0.5)
        .attr("stroke-linejoin", "round")
        .attr(
          "d",
          path(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        );

      if (selectedState) {
        const states = topojson.feature(us, us.objects.states).features;
        const state = states.find((d) => +d.id === +selectedState.fips);
        g.append("g")
          .append("path")
          .attr("fill", "none")
          .attr("pointer-events", "none")
          .attr("stroke", "#000")
          .attr("stroke-width", 1)
          .attr("stroke-linejoin", "round")
          .attr("d", path(state));
      }
    }

    load();
  }, [
    svgRef,
    gRef,
    setHoveredCountyId,
    zoom,
    data,
    colorScale,
    plot,
    selectedState,
  ]);

  return (
    <div>
      <Legend colorScale={colorScale} range={range} />
      <div className={classes.map} style={{ height, width }}>
        <svg ref={svgRef} width={width} height={height} className="mapSvg" />
        <ToolTip
          countyData={data[hoveredCountyId]}
          plot={plot}
          x={tooltipX}
          y={tooltipY}
        />
      </div>
    </div>
  );
}

USMap.propTypes = {
  plot: PropTypes.string.isRequired,
  colorScale: PropTypes.func.isRequired,
  range: PropTypes.array.isRequired,
};

export default memo(USMap);
