import PropTypes from "prop-types";
import { memo, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { useSVGMap } from "./useSVGMap";
import ToolTip from "./ToolTip";
import us from "../../data/us-10m.v1.json";
import classes from "./Map.module.css";
import Legend from "./Legend";

const width = 500;
const height = 300;

function StateMap({ plot, colorScale, range }) {
  const data = useAppStore((state) => state.stateData);
  const selectedState = useAppStore((state) => state.selectedState);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);

  const { svgRef, gRef, tooltipX, tooltipY, hoveredCountyId, zoom } = useSVGMap(
    width,
    height
  );

  const stateFips = selectedState?.fips;

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    console.log("Render Map");
    const svg = d3
      .select(svgRef.current)
      // .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;");

    svg.call(zoom);
    const path = d3.geoPath();

    let g = svg.select("g.stateMapGroup");
    if (g.empty()) {
      g = svg.append("g").attr("class", "stateMapGroup");
      gRef.current = g;
    }
    g.selectAll("*").remove();

    async function load() {
      if (!stateFips || !data) {
        return null;
      }

      // // Extract the state boundary
      // const state = topojson
      //   .feature(us, us.objects.states)
      //   .features.find((d) => d.id === stateFips);

      // Extract the counties within the state using the first 2 digits of the FIPS code
      const counties = topojson
        .feature(us, us.objects.counties)
        .features.filter((d) => Math.floor(d.id / 1000) === +stateFips);

      g.append("g")
        .append("path")
        .attr("fill", "#f0f0f0")
        .attr("pointer-events", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 0.35)
        .attr("stroke-linejoin", "round")
        .attr("d", path(topojson.mesh(us, us.objects.nation)));

      g.append("g")
        .selectAll("path")
        .data(counties)
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
        .attr("stroke", "#999")
        .attr("stroke-width", 0.5)
        .attr("stroke-linejoin", "round")
        .attr(
          "d",
          path(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        );
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
    stateFips,
  ]);

  if (!stateFips || !data) {
    return null;
  }

  return (
    <div>
      <div className={classes.map} style={{ height, width }}>
        <svg ref={svgRef} width={width} height={height} className="mapSvg" />
        <Legend colorScale={colorScale} range={range} />
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

StateMap.propTypes = {
  plot: PropTypes.string.isRequired,
  colorScale: PropTypes.func.isRequired,
  range: PropTypes.array.isRequired,
};

export default memo(StateMap);
