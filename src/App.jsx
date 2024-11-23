import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Burger,
  Button,
  Center,
  Chip,
  Divider,
  Grid,
  Group,
  Loader,
  MantineProvider,
  Modal,
  Text,
  Title,
} from "@mantine/core";
import { Select } from "@mantine/core";
import * as d3 from "d3";

import { USMap, StateMap } from "./components/Map";
import FunnelPlot from "./components/Funnel";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore } from "./store/appStore";
import calcSurprise from "./utils/surprise";
import { getUrl } from "./utils/prefix";
import PCP from "./components/PCP/PCP";
import OrderUIElements from "./components/OrderUIElements/OrderUIElements";
import states from "./data/states.json";
import DATASETS from "./data/datasets.json";
import TYPOLOGIES from "./data/typologies.json";

import "@mantine/core/styles.css";
import "./App.css";
import { useDisclosure } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";

const statesOptions = states.map((state) => ({
  value: state.fips,
  label: state.name,
}));

const datasetOptions = Object.keys(DATASETS);

const colorPaletteSurprise = [...d3.schemeRdBu[11]].reverse();
const colorPaletteRate = [...d3.schemeRdBu[11]].reverse();
const colorPaletteRateMinMax = [...d3.schemeReds[9]];

colorPaletteRate[5] = "#eee";
colorPaletteSurprise[5] = "#eee";

function App() {
  const [currentDataset, setCurrentDataset] = useState(
    DATASETS["Unemployment"]
  );

  const [typologies, setTypologies] = useState(
    TYPOLOGIES.map((t) => ({ ...t, selected: true }))
  );

  const [openedInfoModal, { open: openInfoModal, close: closeInfoModal }] =
    useDisclosure(false);

  const isAllSelected = useMemo(() => {
    return typologies.every((t) => t.selected);
  }, [typologies]);

  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  // all data
  const data = useAppStore((state) => state.data);
  const setData = useAppStore((state) => state.setData);
  const dataSummary = useAppStore((state) => state.dataSummary);
  const setDataSummary = useAppStore((state) => state.setDataSummary);
  const surpriseRange = useAppStore((state) => state.surpriseRange);

  const isLoading = useAppStore((state) => state.dataLoading);
  const setDataLoading = useAppStore((state) => state.setDataLoading);

  // selected state data
  const stateData = useAppStore((state) => state.stateData);

  const setStateData = useAppStore((state) => state.setStateData);
  const stateDataSummary = useAppStore((state) => state.stateDataSummary);
  const setStateDataSummary = useAppStore((state) => state.setStateDataSummary);

  const selectedState = useAppStore((state) => state.selectedState);
  const setSelectedState = useAppStore((state) => state.setSelectedState);

  const rateColorScaleRangeType = useAppStore(
    (state) => state.rateColorScaleRangeType
  );

  const setRateColorScaleRangeType = useAppStore(
    (state) => state.setRateColorScaleRangeType
  );

  const uiElements = useAppStore((state) => state.uiElements);

  const colorScaleSurprise = useMemo(
    () => d3.scaleQuantile().domain(surpriseRange).range(colorPaletteSurprise),
    [surpriseRange]
  );

  const colorScaleRate = useMemo(
    () =>
      dataSummary
        ? d3
            .scaleQuantile()
            .domain(
              rateColorScaleRangeType === "IQR"
                ? dataSummary.rateRangeIQR
                : dataSummary.rateRange
            )
            .range(
              rateColorScaleRangeType === "IQR"
                ? colorPaletteRate
                : colorPaletteRateMinMax
            )
        : null,
    [dataSummary, rateColorScaleRangeType]
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
            .domain(
              rateColorScaleRangeType === "IQR"
                ? stateDataSummary.rateRangeIQR
                : stateDataSummary.rateRange
            )
            .range(
              rateColorScaleRangeType === "IQR"
                ? colorPaletteRate
                : colorPaletteRateMinMax
            )
        : null,
    [stateDataSummary, rateColorScaleRangeType]
  );

  const handleTypologyClick = useCallback((event) => {
    setTypologies((typologies) =>
      typologies.map((t) =>
        t.name === event.currentTarget.value
          ? { ...t, selected: !t.selected }
          : t
      )
    );
  }, []);

  const handleToggleSelectAllTypologies = useCallback(() => {
    setTypologies((typologies) => {
      return typologies.map((t) => {
        return { ...t, selected: !isAllSelected };
      });
    });
  }, [isAllSelected]);

  // calculate surprise for all counties
  useEffect(() => {
    if (!currentDataset) return;

    setDataLoading(true);

    const selectedTypologies = {};
    typologies.forEach((t) => {
      if (t.selected) {
        selectedTypologies[t.name] = true;
      }
    });

    // get data and format it.
    d3.csv(getUrl(currentDataset.path)).then((data) => {
      const formattedData = data.reduce((acc, d) => {
        if (selectedTypologies[d.typology]) {
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
        }
        return acc;
      }, {});

      if (Object.keys(formattedData).length === 0) {
        setData(null);
        setDataSummary(null);
        setDataLoading(false);
        return;
      }

      const { counties, ...summary } = calcSurprise(formattedData);
      setData(counties);
      setDataSummary({ ...summary, ...currentDataset });
      setDataLoading(false);
    });
  }, [typologies, currentDataset, setData, setDataSummary, setDataLoading]);

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

    if (Object.keys(stateCountyData).length === 0) {
      setStateData(null);
      setStateDataSummary(null);
      return;
    }

    const { counties, ...summary } = calcSurprise(stateCountyData);
    setStateData(counties);
    setStateDataSummary(summary);
  }, [data, selectedState, setStateData, setStateDataSummary]);

  return (
    <MantineProvider>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { desktop: !desktopOpened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="0" justify="space-between">
            <Group h="100%" px="md">
              <Burger
                opened={desktopOpened}
                onClick={toggleDesktop}
                visibleFrom="sm"
                size="sm"
              />
              <Title order={4} mr={100}>
                Surprise Explora
              </Title>
              <Badge color="gray">DATA</Badge>
              <Text display={"inline-block"}>
                {currentDataset?.description}
              </Text>
            </Group>
            <Group h="100%" px="md">
              <ActionIcon
                variant="default"
                aria-label="Info"
                onClick={openInfoModal}
              >
                <IconInfoCircle
                  style={{ width: "70%", height: "70%" }}
                  stroke={1.5}
                />
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar p="md" style={{ overflow: "scroll" }}>
          <Text>Dataset: </Text>
          <Select
            data={datasetOptions}
            value={currentDataset.id}
            onChange={(value) => {
              setCurrentDataset(DATASETS[value]);
            }}
            mb="md"
          />
          <Text>State: </Text>
          <Select
            data={statesOptions}
            placeholder="State"
            value={selectedState ? selectedState.fips : null}
            onChange={(_value, option) => {
              if (option) {
                setSelectedState({
                  fips: option.value,
                  name: option.label,
                });
              } else {
                setSelectedState(null);
              }
            }}
            mb="md"
            searchable
            clearable
          />
          <Text>Rate Color Range: </Text>
          <Select
            data={["MinMax", "IQR"]}
            placeholder="Rate color scale range"
            value={rateColorScaleRangeType}
            onChange={(v) => {
              setRateColorScaleRangeType(v);
            }}
          />

          <Divider my="md" />
          <Group justify="space-between">
            <Text>Typology</Text>
            <Button
              size="xs"
              variant="default"
              onClick={handleToggleSelectAllTypologies}
            >
              {isAllSelected ? "De-select All" : "Select All"}
            </Button>
          </Group>
          <Group gap="xs">
            {typologies.map((typology) => (
              <Chip
                key={typology.name}
                size="xs"
                checked={typology.selected}
                onClick={handleTypologyClick}
                value={typology.name}
              >
                {typology.name}
              </Chip>
            ))}
          </Group>
          <Divider my="md" />
          <Box>
            UI Elements
            <OrderUIElements />
          </Box>
        </AppShell.Navbar>
        <AppShell.Main bg={"#fff"}>
          <Box w={1032}>
            {data &&
              dataSummary &&
              !isLoading &&
              uiElements.map((elem) => {
                if (!elem.visible) return null;
                if (elem.id === "choroplethMap") {
                  return (
                    <Grid gutter={0} key={elem.id} mb="md">
                      <Grid.Col span={6}>
                        <div>US Choropleth Map</div>
                        <USMap
                          plot="rate"
                          colorScale={colorScaleRate}
                          range={dataSummary.rateRange}
                        />
                      </Grid.Col>
                      {selectedState && (
                        <Grid.Col span={6}>
                          <div>{selectedState?.name} Choropleth Map</div>
                          {stateDataSummary && (
                            <StateMap
                              plot="rate"
                              colorScale={colorScaleStateRate}
                              range={stateDataSummary.rateRange}
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
                          range={dataSummary.surpriseRange}
                        />
                      </Grid.Col>
                      {selectedState && (
                        <Grid.Col span={6}>
                          <div>{selectedState?.name} Surprise Map</div>
                          {stateDataSummary && (
                            <StateMap
                              plot="surprise"
                              colorScale={colorScaleStateSurprise}
                              range={stateDataSummary.surpriseRange}
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
            <Modal
              opened={openedInfoModal}
              onClose={closeInfoModal}
              title="Info"
              centered
            >
              <Text size="sm">
                Surprise Map is a visualization technique that weights event
                data relative to a set of spatial models. Unexpected events
                (those that deviate from prior beliefs over the model space) are
                visualized more prominently than those that follow expected
                patterns.
              </Text>
            </Modal>
          </Box>
        </AppShell.Main>
      </AppShell>

      <div
        id="tooltipContainer"
        style={{ position: "fixed", top: 0, left: 0, zIndex: 1000 }}
      />
    </MantineProvider>
  );
}

export default App;
