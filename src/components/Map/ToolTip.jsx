import PropTypes from "prop-types";
import { Text } from "@mantine/core";
import { memo } from "react";
import classes from "./Map.module.css";
import STATES from "../../data/states.json";

const statesFipsMap = {};

STATES.forEach((state) => {
  statesFipsMap[state.fips] = state;
});

function ToolTip({ countyData, plot, x, y }) {
  // get state from county's fips code
  const state = statesFipsMap[countyData?.fips.slice(0, 2)];

  // format population with commas
  const population = countyData?.population;
  const formattedPopulation = population
    ? population.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : null;

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
          <Text size="sm" fw={700}>
            {countyData.county}
          </Text>
          <Text size="xs" c="gray" fw={500}>
            {state.name}
          </Text>
          <Text size="xs" tt="capitalize">
            {plot}: {countyData[plot].toFixed(2)}
          </Text>
          <Text size="xs">Population: {formattedPopulation}</Text>
          <Text truncate="end" size="xs">
            Typology: {countyData["typology"]}
          </Text>
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
