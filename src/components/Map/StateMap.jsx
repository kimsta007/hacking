import PropTypes from "prop-types";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
import * as topojson from "topojson-client";
import * as d3 from "d3";

const width = 500;
const height = 300;

function StateMap({ plot, colorScale }) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const data = useAppStore((state) => state.stateData);
  const selectedState = useAppStore((state) => state.selectedState);
  const transform = useAppStore((state) => state.transform);
  const prevTransform = useRef(transform);
  const setTransform = useAppStore((state) => state.setTransform);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const prevHoveredCountyId = useRef(hoveredCountyId);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);
  const brushedCountyIds = useAppStore((state) => state.brushedCountyIds);

  const [tooltipX, setTooltipX] = useState(0);
  const [tooltipY, setTooltipY] = useState(0);

  const stateFips = selectedState?.fips;

  const zoomed = useCallback(
    (event) => {
      const { transform } = event;
      setTransform(transform);
    },
    [setTransform]
  );

  const zoom = useMemo(
    () => d3.zoom().scaleExtent([0.5, 20]).on("zoom", zoomed),
    [zoomed]
  );

  useEffect(() => {
    gRef.current?.attr("transform", transform);
    zoom.transform(d3.select(svgRef.current), transform);
    if (Math.abs(transform.k - prevTransform.current.k) > 1) {
      // console.log("update stroke width");
      prevTransform.current = transform;
      gRef.current?.attr("stroke-width", 1 / transform.k);
      // gRef.current?.attr("stroke-width", .5);
    }
  }, [transform, zoom]);

  useEffect(() => {
    if (prevHoveredCountyId.current) {
      d3.select(svgRef.current)
        .select(`[data-id="${prevHoveredCountyId.current}"]`)
        .attr("stroke", "#AAA")
        .attr("stroke-width", null);
    }

    if (brushedCountyIds) {
      const e = d3.select(svgRef.current);

      e.selectAll(".county-brushed")
        .attr("stroke", "#AAA")
        .attr("stroke-width", null);

      brushedCountyIds.forEach((countyId) => {
        e.select(`[data-id="${countyId}"]`)
          .classed("county-brushed", true)
          .attr("stroke", "#000")
          .attr("stroke-width", 5 / transform.k)
          .raise();
      });
    }

    if (hoveredCountyId) {
      const e = d3
        .select(svgRef.current)
        .select(`[data-id="${hoveredCountyId}"]`)
        .attr("stroke", "#000")
        .attr("stroke-width", 5 / transform.k)
        .raise();

      if (e.empty()) {
        return;
      }
      const elemRect = e.node().getBoundingClientRect();
      const parentRect = svgRef.current.getBoundingClientRect();

      const x = elemRect.left - parentRect.left + elemRect.width / 2;
      const y = elemRect.top - parentRect.top + elemRect.height + 10;
      setTooltipX(x);
      setTooltipY(y);
    }
    prevHoveredCountyId.current = hoveredCountyId;
  }, [hoveredCountyId, brushedCountyIds, transform]);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    d3.select(svgRef.current).selectAll("*").remove();
    console.log("Render Map");
    const svg = d3
      .select(svgRef.current)
      // .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;");

    svg.call(zoom);
    const path = d3.geoPath();

    const g = svg.append("g");
    gRef.current = g;

    async function load() {
      if (!stateFips || !data) {
        return null;
      }
      const us = await d3.json("https://d3js.org/us-10m.v1.json");

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
        .attr("fill", "#d0d0d0")
        .attr("pointer-events", "none")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
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
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
        .attr("stroke-linejoin", "round")
        .attr(
          "d",
          path(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        );
    }

    load();
  }, [zoomed, setHoveredCountyId, zoom, data, colorScale, plot, stateFips]);

  if (!stateFips || !data) {
    return null;
  }

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width={width} height={height} className="mapSvg" />
      <div
        style={{
          position: "absolute",
          left: tooltipX,
          top: tooltipY,
          background: "white",
          pointerEvents: "none",
          transition: "200ms linear",
          display: hoveredCountyId ? "block" : "none",
          transform: "translate(-50%, 0%)",
        }}
      >
        {data[hoveredCountyId] && (
          <>
            <div>{data[hoveredCountyId].county}</div>
            <div>
              {plot}: {data[hoveredCountyId][plot]}
            </div>
            <div>Pop: {data[hoveredCountyId]["population"]}</div>
          </>
        )}
      </div>
    </div>
  );
}

StateMap.propTypes = {
  plot: PropTypes.string.isRequired,
  colorScale: PropTypes.func.isRequired,
};

export default memo(StateMap);
