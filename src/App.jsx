import { Grid, MantineProvider } from "@mantine/core";
import { Select } from "@mantine/core";
import * as d3 from "d3";

import { USMap, StateMap } from "./components/Map";
import FunnelPlot from "./components/Funnel";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "./store/appStore";
import calcSurprise from "./utils/surprise";
import states from "./data/states.json";
import { getUrl } from "./utils/prefix";

import "@mantine/core/styles.css";
import "./App.css";

const statesOptions = states.map((state) => ({
  value: state.fips,
  label: state.name,
}));

const colorPaletteSurprise = [...d3.schemeRdBu[11]].reverse();
const colorPaletteRate = [...d3.schemeRdBu[11]].reverse();

function App() {
  // all data
  const data = useAppStore((state) => state.data);
  const setData = useAppStore((state) => state.setData);
  const dataSummary = useAppStore((state) => state.dataSummary);
  const setDataSummary = useAppStore((state) => state.setDataSummary);

  // selected state data
  const stateData = useAppStore((state) => state.stateData);
  const setStateData = useAppStore((state) => state.setStateData);
  const stateDataSummary = useAppStore((state) => state.stateDataSummary);
  const setStateDataSummary = useAppStore((state) => state.setStateDataSummary);

  const selectedState = useAppStore((state) => state.selectedState);
  const setSelectedState = useAppStore((state) => state.setSelectedState);
  const [stateValue, setStateValue] = useState(null);

  const colorScaleSurprise = useMemo(
    () =>
      dataSummary
        ? d3
            .scaleQuantile()
            .domain(dataSummary.surpriseRange)
            .range(colorPaletteSurprise)
        : null,
    [dataSummary]
  );

  const colorScaleRate = useMemo(
    () =>
      dataSummary
        ? d3
            .scaleQuantile()
            .domain(dataSummary.rateRange)
            .range(colorPaletteRate)
        : null,
    [dataSummary]
  );

  const colorScaleStateSurprise = useMemo(
    () =>
      stateDataSummary
        ? d3
            .scaleQuantile()
            .domain(stateDataSummary.surpriseRange)
            .range(colorPaletteSurprise)
        : null,
    [stateDataSummary]
  );

  const colorScaleStateRate = useMemo(
    () =>
      stateDataSummary
        ? d3
            .scaleQuantile()
            .domain(stateDataSummary.rateRange)
            .range(colorPaletteRate)
        : null,
    [stateDataSummary]
  );

  // calculate surprise for all counties
  useEffect(() => {
    if (data) return;

    // get data and format it.
    d3.csv(getUrl("data/unemployment.csv")).then((data) => {
      const formattedData = data.reduce((acc, d) => {
        acc[d.fips] = {
          fips: d.fips,
          rate: +d.rate,
          population: +d.population,
          latinopop: +d.latinopop,
          whitepop: +d.whitepop,
          asianpop: +d.asianpop,
          blackpop: +d.blackpop,
          county: d.county,
        };
        return acc;
      }, {});

      const { counties, ...summary } = calcSurprise(formattedData);
      setData(counties);

      setDataSummary(summary);
    });
  }, [data, setData, setDataSummary]);

  // calclulate surprise for selected state
  useEffect(() => {
    if (!selectedState || !data) return;

    const stateCountyData = {};

    Object.values(data).forEach((d) => {
      if (d.fips.startsWith(selectedState.fips)) {
        stateCountyData[d.fips] = d;
      }
    });

    const { counties, ...summary } = calcSurprise(stateCountyData);
    setStateData(counties);
    setStateDataSummary(summary);
  }, [data, selectedState, setStateData, setStateDataSummary]);

  if (!data) return <div>Loading...</div>;

  return (
    <MantineProvider>
      <Grid gutter={0}>
        <Select
          data={statesOptions}
          value={stateValue ? stateValue.value : null}
          onChange={(_value, option) => {
            setStateValue(option);
            if (option) {
              setSelectedState({
                fips: option.value,
                name: option.label,
              });
            } else {
              setSelectedState(null);
            }
          }}
          searchable
        />
      </Grid>
      <Grid gutter={0}>
        <Grid.Col span={6}>
          <div>Chropleth</div>
          <USMap plot="rate" colorScale={colorScaleRate} />
          <div>Surprise</div>
          <USMap plot="surprise" colorScale={colorScaleSurprise} />
        </Grid.Col>
        <Grid.Col span={6}>
          <div>State Choropleth</div>
          {stateDataSummary && (
            <StateMap plot="rate" colorScale={colorScaleStateRate} />
          )}

          <div>State Surprise</div>
          {stateDataSummary && (
            <StateMap plot="surprise" colorScale={colorScaleStateSurprise} />
          )}
        </Grid.Col>
      </Grid>

      <Grid gutter={0}>
        <Grid.Col span={6}>
          <div>Funnel Surprise US</div>
          <FunnelPlot
            id="globalFunnel"
            colorScale={colorScaleSurprise}
            data={data}
            dataSummary={dataSummary}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <div>Funnel Surprise State</div>
          {stateDataSummary && (
            <FunnelPlot
              id="stateFunnel"
              colorScale={colorScaleSurprise}
              data={stateData}
              dataSummary={stateDataSummary}
            />
          )}
        </Grid.Col>
      </Grid>
    </MantineProvider>
  );
}

export default App;
