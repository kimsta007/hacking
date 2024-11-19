import { create } from "zustand";
import { devtools } from "zustand/middleware";
import * as d3 from "d3";

export const useAppStore = create(
  devtools((set) => ({
    transform: d3.zoomIdentity,
    setTransform: (t) => set(() => ({ transform: t })),

    hoveredCountyId: null,
    setHoveredCountyId: (id) => set(() => ({ hoveredCountyId: id })),

    brushedCountyIds: [],
    setBrushedCountyIds: (ids) => set(() => ({ brushedCountyIds: ids })),

    dataLoading: false,
    setDataLoading: (loading) => set(() => ({ dataLoading: loading })),

    data: null,
    setData: (data) => set(() => ({ data })),

    dataSummary: null,
    setDataSummary: (dataSummary) =>
      dataSummary
        ? set(() => ({ dataSummary, surpriseRange: dataSummary.surpriseRange }))
        : set(() => ({ dataSummary })),

    surpriseRange: [-1, 1],
    updateSurpriseRangeBy: (amount, direction) =>
      set((state) => {
        if (direction === "high") {
          let v = state.surpriseRange[1] - amount / 500;
          if (v > 1) {
            v = 1;
          }
          if (v < -1) {
            v = -1;
          }
          return {
            surpriseRange: [state.surpriseRange[0], v],
          };
        } else {
          let v = state.surpriseRange[0] - amount / 500;
          if (v > 1) {
            v = 1;
          }
          if (v < -1) {
            v = -1;
          }
          return {
            surpriseRange: [v, state.surpriseRange[1]],
          };
        }
      }),

    selectedState: null,
    setSelectedState: (selectedState) => set(() => ({ selectedState })),

    stateData: null,
    setStateData: (stateData) => set(() => ({ stateData })),

    stateDataSummary: null,
    setStateDataSummary: (stateDataSummary) =>
      set(() => ({ stateDataSummary })),

    brushView: null,
    setBrushView: (brushView) => set(() => ({ brushView })),

    uiElements: [
      { id: "choroplethMap", visible: true },
      { id: "surpriseMap", visible: true },
      { id: "funnelPlot", visible: true },
      { id: "pcp", visible: true },
    ],
    setUIElements: (uiElements) => set(() => ({ uiElements })),
  }))
);

// // Usage with a plain action store, it will log actions as "setState"
// const usePlainStore = create(devtools((set) => ...))
// // Usage with a redux store, it will log full action types
// const useReduxStore = create(devtools(redux(reducer, initialState)))
