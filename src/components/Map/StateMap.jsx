import PropTypes from "prop-types";
import { memo, useEffect } from "react";
import { useAppStore } from "../../store/appStore";
import * as topojson from "topojson-client";
import * as d3 from "d3";
import { useSVGMap } from "./useSVGMap";
import ToolTip from "./ToolTip";
import Legend from "./Legend";
import us from "../../data/us-10m.v1.json";
import STATES from "../../data/states.json";
import classes from "./Map.module.css";

const width = 500;
const height = 300;

function StateMap({ plot, colorScale, range, scaleTexts }) {
  const data = useAppStore((state) => state.stateData);
  const selectedState = useAppStore((state) => state.selectedState);
  const setSelectedState = useAppStore((state) => state.setSelectedState);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);
  const setIsHovered = useAppStore((state) => state.setIsHovered);
  const isHovered = useAppStore((state) => state.isHovered);

  const { svgRef, gRef, tooltipX, tooltipY, hoveredCountyId, zoom } = useSVGMap(
    width,
    height
  );

  const stateFips = selectedState?.fips;

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

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
        .attr("fill", "#000")
        .attr("pointer-events", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 0.35)
        .attr("stroke-linejoin", "round")
        .attr("d", path(topojson.mesh(us, us.objects.nation)));

      g.append("g")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .join("path")
        .attr("fill", "#FFF")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.2)
        .attr("d", path)
        .on("dblclick", (event, d) => {
          console.log(d);
          const fips = Math.floor(d.id);
          const state = STATES.find((s) => +s.fips === fips);
          setSelectedState({
            fips: state.fips,
            name: state.name,
          });
        });

      g.append("g")
        .selectAll("path")
        .data(counties)
        .join("path")
        .attr("d", path)
        .attr("fill", (d) =>
          data[d.id] ? colorScale(data[d.id][plot]) : "url(#crosshatch)"
        )
        .attr("data-id", (d) => d.id)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", (event, d) => {
          setHoveredCountyId(d.id);
          setIsHovered(true);
        })
        .on("mouseout", () => {
          setHoveredCountyId(null);
          setIsHovered(false);
        });

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
    setSelectedState,
  ]);

  if (!stateFips || !data) {
    return null;
  }

  return (
    <div>
      <div className={classes.map} style={{ height, width }}>
        <svg ref={svgRef} width={width} height={height} className="mapSvg">
          <defs>
            <pattern
              id="crosshatch"
              patternUnits="userSpaceOnUse"
              width="3"
              height="3"
            >
              <image
                xlinkHref="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg=="
                x="0"
                y="0"
                width="3"
                height="3"
              ></image>
            </pattern>
          </defs>
        </svg>
        <Legend colorScale={colorScale} range={range} scaleTexts={scaleTexts} />
        <ToolTip
          countyData={data[hoveredCountyId]}
          plot={plot}
          x={tooltipX}
          y={tooltipY}
          isHovered={isHovered}
        />
      </div>
    </div>
  );
}

StateMap.propTypes = {
  plot: PropTypes.string.isRequired,
  colorScale: PropTypes.func.isRequired,
  range: PropTypes.array.isRequired,
  scaleTexts: PropTypes.arrayOf(PropTypes.string),
};

export default memo(StateMap);
