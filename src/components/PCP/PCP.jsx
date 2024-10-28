import { memo, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import { useAppStore } from "../../store/appStore";
import PropTypes from "prop-types";
import "./PCP.css";

const dpr = window.devicePixelRatio || 2;

const originalWidth = 500;
const originalHeight = 300;
const width = originalWidth * dpr;
const height = originalHeight * dpr;
const margin = { top: 10, right: 10, bottom: 10, left: 10 };
const W = originalWidth - margin.left - margin.right;
const H = originalHeight - margin.top - margin.bottom;

function path(d, ctx, x, y, dimensions) {
  ctx.beginPath();
  dimensions.forEach(function (p, i) {
    if (i == 0) {
      ctx.moveTo(x[p](d[p]), y(p));
    } else {
      ctx.lineTo(x[p](d[p]), y(p));
    }
  });
  ctx.stroke();
}

const axis = d3.axisTop();

function PCP({ id, data, colorScale }) {
  const canvasBackgroundRef = useRef(null);
  const canvasForegroundRef = useRef(null);
  const svgRef = useRef(null);
  const hoveredCountyId = useAppStore((state) => state.hoveredCountyId);
  const setHoveredCountyId = useAppStore((state) => state.setHoveredCountyId);
  const brushView = useAppStore((state) => state.brushView);
  const setBrushView = useAppStore((state) => state.setBrushView);
  const brushedCountyIds = useAppStore((state) => state.brushedCountyIds);
  const setBrushedCountyIds = useAppStore((state) => state.setBrushedCountyIds);

  const [xScale, yScale, dimensions] = useMemo(() => {
    if (!data) {
      return [null, null, null];
    }
    const y = d3.scalePoint().range([0, H]).padding(1);
    const x = {};
    let dimensions;

    const values = Object.values(data);

    // Extract the list of dimensions and create a scale for each.
    y.domain(
      (dimensions = ["rate", "surprise", "population"].filter(function (d) {
        return (x[d] = d3
          .scaleLinear()
          .domain(
            d3.extent(values, function (p) {
              return +p[d];
            })
          )
          .range([0, W]));
      }))
    );

    return [x, y, dimensions];
  }, [data]);

  useEffect(() => {
    if (!data || !dimensions) {
      return;
    }
    const values = Object.values(data);
    const foreground = canvasForegroundRef.current.getContext("2d");
    const background = canvasBackgroundRef.current.getContext("2d");

    d3.select(svgRef.current).selectAll("*").remove();
    console.log("RESET");

    const svg = d3
      .select(svgRef.current)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    foreground.strokeStyle = "rgba(0,100,160,0.24)";
    background.strokeStyle = "rgba(0,0,0,0.02)";

    // Render full foreground and background
    background.save();
    background.clearRect(0, 0, width, height);

    background.scale(dpr, dpr);
    background.translate(margin.left, margin.top);
    foreground.save();
    foreground.clearRect(0, 0, width, height);

    foreground.scale(dpr, dpr);
    foreground.translate(margin.left, margin.top);

    values.forEach(function (d) {
      path(d, background, xScale, yScale, dimensions);
      path(d, foreground, xScale, yScale, dimensions);
    });

    background.restore();
    foreground.restore();

    // Add a group element for each dimension.
    var g = svg
      .selectAll(".dimension")
      .data(dimensions)
      .enter()
      .append("g")
      .attr("class", "dimension")
      .attr("transform", function (d) {
        return "translate(0," + yScale(d) + ")";
      });

    // Add an axis and title.
    g.append("g")
      .attr("class", "axis")
      .each(function (d) {
        d3.select(this).call(axis.scale(xScale[d]).tickSize(-6));
      })
      .selectAll(".tick text")
      .attr("dy", "2em");

    g.append("text")
      .attr("text-anchor", "left")
      .attr("x", 0)
      .attr("y", -10)
      .text(String);

    // Add and store a brush for each axis.
    g.append("g")
      .attr("class", "brush")
      .each(function () {
        d3.select(this).call(
          d3
            .brushX()
            .extent([
              [0, -8],
              [W, 8],
            ])
            .on("brush end", brush)
        );
      })
      .selectAll("rect")
      .attr("y", -8)
      .attr("height", 16);

    // Handles a brush event, toggling the display of foreground lines.
    function brush() {
      var actives = [];
      var extents = [];

      svg.selectAll(".brush").each(function (d) {
        var brushSelection = d3.brushSelection(this);
        if (brushSelection) {
          actives.push(d);
          extents.push(brushSelection);
        }
      });

      // Filter the data based on brush selections
      var selected = values.filter(function (d) {
        return actives.every(function (dim, i) {
          var extent = extents[i];
          return (
            extent[0] <= xScale[dim](d[dim]) && xScale[dim](d[dim]) <= extent[1]
          );
        });
      });

      // Render selected lines
      foreground.save();
      foreground.clearRect(0, 0, width, height);
      foreground.scale(dpr, dpr);
      foreground.translate(margin.left, margin.top);

      selected.forEach(function (d) {
        path(d, foreground, xScale, yScale, dimensions);
      });
      foreground.restore();
    }
  }, [xScale, yScale, data, dimensions]);

  return (
    <div>
      <div className="pcpContainer">
        <canvas
          ref={canvasBackgroundRef}
          width={width}
          height={height}
          className="pcpCanvas"
          style={{
            width: originalWidth,
            height: originalHeight,
          }}
        />
        <canvas
          ref={canvasForegroundRef}
          width={width}
          height={height}
          className="pcpCanvas"
          style={{
            width: originalWidth,
            height: originalHeight,
          }}
        />
        {/* svg for brushing */}
        <svg
          ref={svgRef}
          className="pcpSvg"
          width={originalWidth}
          height={originalHeight}
        />
      </div>
    </div>
  );
}

PCP.propTypes = {
  id: PropTypes.string,
  data: PropTypes.object,
  dataSummary: PropTypes.object,
  colorScale: PropTypes.func,
};

export default memo(PCP);
