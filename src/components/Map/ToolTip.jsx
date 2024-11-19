import PropTypes from "prop-types";
import { memo } from "react";
import classes from "./Map.module.css";

function ToolTip({ countyData, plot, x, y }) {
  return (
    <div
      className={classes.mapTooltip}
      style={{
        left: x,
        top: y,
        display: countyData ? "block" : "none",
      }}
    >
      {countyData && (
        <>
          <div>
            <strong>{countyData.county}</strong>
          </div>
          <div style={{ textTransform: "capitalize" }}>
            {plot}: {countyData[plot].toFixed(2)}
          </div>
          <div>Population: {countyData["population"]}</div>
          <div>Typology: {countyData["typology"]}</div>
        </>
      )}
    </div>
  );
}

ToolTip.propTypes = {
  countyData: PropTypes.object,
  plot: PropTypes.string.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
};

export default memo(ToolTip);
