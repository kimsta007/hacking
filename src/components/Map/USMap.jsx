import PropTypes from "prop-types";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store/appStore";
import * as topojson from "topojson-client";
import * as topojsonSimplify from "topojson-simplify";
import * as d3 from "d3";
import "./map.css";

const width = 500;
const height = 300;

function USMap({ plot, colorScale }) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const data = useAppStore((state) => state.data);
  const transform = useAppStore((state) => state.transform);
  const prevTransform = useRef(transform);
  const setTransform = useAppStore((state) => state.setTransform);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const prevHoveredCountyId = useRef(hoveredCountyId);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);
  const brushedCountyIds = useAppStore((state) => state.brushedCountyIds);

  const [tooltipX, setTooltipX] = useState(0);
  const [tooltipY, setTooltipY] = useState(0);

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
      const e = d3
        .select(svgRef.current)
        .select(`[data-id="${prevHoveredCountyId.current}"]`);
      if (!e.classed("county-brushed")) {
        e.attr("stroke", "#AAA").attr("stroke-width", null);
      }
    }

    if (hoveredCountyId) {
      const e = d3
        .select(svgRef.current)
        .select(`[data-id="${hoveredCountyId}"]`);

      if (e.empty()) {
        return;
      }

      if (!e.classed("county-brushed")) {
        e.attr("stroke", "#000").attr("stroke-width", 5 / transform.k);
      }
      e.raise();

      const elemRect = e.node().getBoundingClientRect();
      const parentRect = svgRef.current.getBoundingClientRect();

      let x = elemRect.left - parentRect.left + elemRect.width / 2;
      let y = elemRect.top - parentRect.top + elemRect.height + 10;
      if (x < 75) {
        x = 75;
      }
      if (x > width - 75) {
        x = width - 75;
      }
      if (y > height - 70) {
        y = height - 70;
      }
      setTooltipX(x);
      setTooltipY(y);
    }
    prevHoveredCountyId.current = hoveredCountyId;
  }, [hoveredCountyId, transform]);

  useEffect(() => {
    const e = d3.select(svgRef.current);

    e.selectAll(".county-brushed")
      .attr("stroke", "#AAA")
      .attr("stroke-width", null);

    brushedCountyIds.forEach((countyId) => {
      e.select(`[data-id="${countyId}"]`)
        .classed("county-brushed", true)
        .attr("stroke", "#000")
        .attr("stroke-width", 3 / transform.k)
        .raise();
    });
  }, [brushedCountyIds, transform]);

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
      const us = await d3.json("https://d3js.org/us-10m.v1.json");

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
  }, [zoomed, setHoveredCountyId, zoom, data, colorScale, plot]);

  return (
    <div style={{ position: "relative", overflow: "hidden", height, width }}>
      <svg ref={svgRef} width={width} height={height} className="mapSvg" />
      <div
        className="map-tooltip"
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
