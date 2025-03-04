import PropTypes from "prop-types";
import { Text } from "@mantine/core";
import { memo } from "react";
import classes from "./Map.module.css";
import STATES from "../../data/states.json";
import TYPOLOGIES from "../../data/typologies.json";
import { createPortal } from "react-dom";


const statesFipsMap = {};

STATES.forEach((state) => {
  statesFipsMap[state.fips] = state;
});

const typologiesMap = {};
TYPOLOGIES.forEach((typology) => {
  typologiesMap[typology.name] = typology;
});


function ToolTip({ countyData, plot, x, y, isHovered }) {
  // get state from county's fips code
  const state = statesFipsMap[countyData?.fips.slice(0, 2)];

  // format population with commas
  const population = countyData?.population;
  const formattedPopulation = population
    ? population.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : null;

  return createPortal(
    <div
      className={classes.mapTooltip}
      style={{
        left: x,
        top: y,
        display: isHovered ? "block" : "none",
      }}
    >
      {countyData != null ? (
        <>
          <Text size="sm" fw={700}>
            {countyData.county}
          </Text>
          <Text size="xs" c="gray" fw={500}>
            {state?.name}
          </Text>
          <Text size="xs" tt="capitalize">
            { 
              plot == "surprise" ? (plot + ": " + countyData[plot].toFixed(2)) : 
                 plot + ": " + (countyData[plot].toFixed(2) * 100).toFixed(0) + "%"
            }
          </Text>
          <Text size="xs">Population: {formattedPopulation}</Text>
          <Text truncate="end" size="xs">
            Typology: {countyData["typology"]}
          </Text>
          <Text size="xs" c="gray">
            {typologiesMap[countyData["typology"]].description}
          </Text>
        </>
      ) : (isHovered && "No data available")
      }
    </div>,
    document.getElementById("tooltipContainer")
  );
}

ToolTip.propTypes = {
  countyData: PropTypes.object,
  plot: PropTypes.string.isRequired,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  isHovered: PropTypes.bool.isRequired,
};

export default memo(ToolTip);
