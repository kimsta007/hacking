import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import us from "../../data/us-10m.v1.json";

import { useAppStore } from "../../store/appStore";

export function useSVGMap(width, height) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const prevHoveredCountyId = useRef(hoveredCountyId);
  const selectedState = useAppStore((state) => state.selectedState);

  const brushedCountyIds = useAppStore((state) => state.brushedCountyIds);

  const transform = useAppStore((state) => state.transform);
  const prevTransform = useRef(transform);

  const setTransform = useAppStore((state) => state.setTransform);

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
    () => d3.zoom().scaleExtent([0.45, 20]).on("zoom", zoomed),
    [zoomed]
  );

  useEffect(() => {
    gRef.current?.attr("transform", transform);
    zoom.transform(d3.select(svgRef.current), transform);
    if (Math.abs(transform.k - prevTransform.current.k) > 1) {
      prevTransform.current = transform;
      gRef.current?.attr("stroke-width", 1 / transform.k);
    }
  }, [transform, zoom]);

  useEffect(() => {
    if (prevHoveredCountyId.current && gRef.current) {
      const e = gRef.current.select(
        `[data-id="${prevHoveredCountyId.current}"]`
      );
      if (!e.empty() && !e.classed("county-brushed")) {
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

      let x = elemRect.left + elemRect.width / 2;
      let y = elemRect.top + elemRect.height + 10;

      if (x < parentRect.left) {
        x = parentRect.left;
      } else if (x > parentRect.right) {
        x = parentRect.right;
      }

      if (y < parentRect.top) {
        y = parentRect.top;
      } else if (y > parentRect.bottom) {
        y = parentRect.bottom;
      }

      setTooltipX(x);
      setTooltipY(y);
    }
    prevHoveredCountyId.current = hoveredCountyId;
  }, [
    hoveredCountyId,
    transform,
    prevHoveredCountyId,
    svgRef,
    width,
    height,
    setTooltipX,
    setTooltipY,
  ]);

  useEffect(() => {
    const e = d3.select(svgRef.current);

    e.selectAll(".county-brushed")
      .attr("stroke", "#AAA")
      .attr("stroke-width", null)
      .classed("county-brushed", false);

    brushedCountyIds.forEach((countyId) => {
      e.select(`[data-id="${countyId}"]`)
        .classed("county-brushed", true)
        .attr("stroke", "#000")
        .attr("stroke-width", 3 / transform.k)
        .raise();
    });
  }, [brushedCountyIds, transform, svgRef]);

  useEffect(() => {
    let [[x0, y0], [x1, y1]] = [
      [-56.74777081105434, 12.469025989284091],
      [942.332624291058, 596.9298966319916],
    ];
    if (selectedState) {
      const path = d3.geoPath();

      const d = topojson
        .feature(us, us.objects.states)
        .features.find((d) => +d.id === +selectedState.fips);

      [[x0, y0], [x1, y1]] = path.bounds(d);
    }

    const newZoom = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);

    setTransform(newZoom);
  }, [selectedState, gRef, zoom.transform, height, width, setTransform]);

  return {
    svgRef,
    gRef,
    tooltipX,
    tooltipY,
    transform,
    prevTransform,
    hoveredCountyId,
    zoom,
  };
}
