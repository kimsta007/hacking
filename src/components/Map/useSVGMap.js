import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useAppStore } from "../../store/appStore";

export function useSVGMap(width, height) {
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const prevHoveredCountyId = useRef(hoveredCountyId);
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
    () => d3.zoom().scaleExtent([0.5, 20]).on("zoom", zoomed),
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
      if (y < 0) {
        y = 0;
      }
      if (y > height - 70) {
        y = height - 70;
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
