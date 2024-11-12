import {
  AppShell,
  Badge,
  Box,
  Center,
  Divider,
  Grid,
  Loader,
  MantineProvider,
  SegmentedControl,
  Text,
  Title,
} from "@mantine/core";
import { Select } from "@mantine/core";
import * as d3 from "d3";

import { USMap, StateMap } from "./components/Map";
import FunnelPlot from "./components/Funnel";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "./store/appStore";
import calcSurprise from "./utils/surprise";
import { getUrl } from "./utils/prefix";
import PCP from "./components/PCP/PCP";
import OrderUIElements from "./components/OrderUIElements/OrderUIElements";
import states from "./data/states.json";
import DATASETS from "./data/datasets.json";

import "@mantine/core/styles.css";
import "./App.css";

const statesOptions = states.map((state) => ({
  value: state.fips,
  label: state.name,
}));

const colorPaletteSurprise = [...d3.schemeRdBu[11]].reverse();
const colorPaletteRate = [...d3.schemeRdBu[11]].reverse();

function App() {
  const [currentDataset, setCurrentDataset] = useState(
    DATASETS["Unemployment"]
  );

  // all data
  const data = useAppStore((state) => state.data);
  const setData = useAppStore((state) => state.setData);
  const dataSummary = useAppStore((state) => state.dataSummary);
  const setDataSummary = useAppStore((state) => state.setDataSummary);
  const surpriseRange = useAppStore((state) => state.surpriseRange);

  // selected state data
  const stateData = useAppStore((state) => state.stateData);

  const setStateData = useAppStore((state) => state.setStateData);
  const stateDataSummary = useAppStore((state) => state.stateDataSummary);
  const setStateDataSummary = useAppStore((state) => state.setStateDataSummary);

  const selectedState = useAppStore((state) => state.selectedState);
  const setSelectedState = useAppStore((state) => state.setSelectedState);

  const uiElements = useAppStore((state) => state.uiElements);
  const [stateValue, setStateValue] = useState(null);

  const isLoading = !currentDataset
    ? false
    : currentDataset.id !== dataSummary?.id;

  const colorScaleSurprise = useMemo(
    () => d3.scaleQuantile().domain(surpriseRange).range(colorPaletteSurprise),
    [surpriseRange]
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
    if (!currentDataset) return;
    if (dataSummary?.id === currentDataset.id) return;

    // get data and format it.
    d3.csv(getUrl(currentDataset.path)).then((data) => {
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
          typology: d.typology,
        };
        return acc;
      }, {});

      const { counties, ...summary } = calcSurprise(formattedData);
      setData(counties);
      setDataSummary({ ...summary, ...currentDataset });
    });
  }, [dataSummary, currentDataset, setData, setDataSummary]);

  // calclulate surprise for selected state
  useEffect(() => {
    if (!selectedState || !data) {
      setStateData(null);
      setStateDataSummary(null);
      return;
    }

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

  return (
    <MantineProvider>
      <AppShell
        navbar={{
          width: 300,
          breakpoint: "sm",
        }}
        padding="md"
      >
        <AppShell.Navbar p="md" style={{ borderRight: "1px solid #000" }}>
          <Title order={4} mb="16">
            Surprise Explora
          </Title>

          <Text>Dataset:</Text>
          <SegmentedControl
            orientation="vertical"
            fullWidth
            onChange={(id) => setCurrentDataset(DATASETS[id])}
            data={Object.keys(DATASETS)}
          />
          <Divider my="md" />
          <Select
            data={statesOptions}
            placeholder="State"
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
          <Divider my="md" />
          <Text size="sm">
            Surprise Map is a visualization technique that weights event data
            relative to a set of spatial models. Unexpected events (those that
            induce large changes in belief over the model space) are visualized
            more prominently than those that follow expected patterns.
          </Text>
          <Divider my="md" />
          <Box>
            UI Elements
            <OrderUIElements />
          </Box>
        </AppShell.Navbar>
        <AppShell.Main bg={"#ddd"}>
          <Box className="header-data-info">
            <Badge color="gray" mr="md">
              DATA
            </Badge>
            <Text display={"inline-block"}>{currentDataset?.description}</Text>
          </Box>

          <Box w={1032}>
            {data &&
              !isLoading &&
              uiElements.map((elem) => {
                if (!elem.visible) return null;
                if (elem.id === "choroplethMap") {
                  return (
                    <Grid gutter={0} key={elem.id} mb="md">
                      <Grid.Col span={6}>
                        <div>US Choropleth Map</div>
                        <USMap plot="rate" colorScale={colorScaleRate} />
                      </Grid.Col>
                      {selectedState && (
                        <Grid.Col span={6}>
                          <div>{selectedState?.name} Choropleth Map</div>
                          {stateDataSummary && (
                            <StateMap
                              plot="rate"
                              colorScale={colorScaleStateRate}
                            />
                          )}
                        </Grid.Col>
                      )}
                    </Grid>
                  );
                } else if (elem.id === "surpriseMap") {
                  return (
                    <Grid gutter={0} key={elem.id} mb="md">
                      <Grid.Col span={6}>
                        <div>US Surprise Map</div>
                        <USMap
                          plot="surprise"
                          colorScale={colorScaleSurprise}
                        />
                      </Grid.Col>
                      {selectedState && (
                        <Grid.Col span={6}>
                          <div>{selectedState?.name} Surprise Map</div>
                          {stateDataSummary && (
                            <StateMap
                              plot="surprise"
                              colorScale={colorScaleStateSurprise}
                            />
                          )}
                        </Grid.Col>
                      )}
                    </Grid>
                  );
                } else if (elem.id === "funnelPlot") {
                  return (
                    <Grid key={elem.id} gutter={0} mb="md">
                      <Grid.Col span={6}>
                        <div>US Surprise Funnel Plot</div>
                        <FunnelPlot
                          id="globalFunnel"
                          colorScale={colorScaleSurprise}
                          data={data}
                          dataSummary={dataSummary}
                        />
                      </Grid.Col>
                      {selectedState && (
                        <Grid.Col span={6}>
                          <div>
                            {selectedState?.name} State Surprise Funnel Plot
                          </div>
                          {stateDataSummary && (
                            <FunnelPlot
                              id="stateFunnel"
                              colorScale={colorScaleStateSurprise}
                              data={stateData}
                              dataSummary={stateDataSummary}
                            />
                          )}
                        </Grid.Col>
                      )}
                    </Grid>
                  );
                } else if (elem.id === "pcp") {
                  return (
                    <Grid key={elem.id} gutter={0} mb="md">
                      <Grid.Col span={6}>
                        <div>US PCP</div>
                        <PCP
                          id="globalPCP"
                          colorScale={colorScaleSurprise}
                          data={data}
                        />
                      </Grid.Col>
                      {selectedState && (
                        <Grid.Col span={6}>
                          <div>{selectedState?.name} PCP</div>
                          {stateDataSummary && (
                            <PCP
                              id="statePCP"
                              colorScale={colorScaleSurprise}
                              data={stateData}
                            />
                          )}
                        </Grid.Col>
                      )}
                    </Grid>
                  );
                }
              })}

            {isLoading && (
              <Center h={"100vh"}>
                <Loader size={50} />
              </Center>
            )}

            {!currentDataset && <Text>No data selected</Text>}
          </Box>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
