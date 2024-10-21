import { create } from "zustand";
import { devtools } from 'zustand/middleware'
import * as d3 from "d3";

export const useAppStore = create(devtools((set) => ({
  transform: d3.zoomIdentity,
  setTransform: (t) => set(() => ({ transform: t })),

  hoveredCountyId: null,
  setHoveredCountyId: (id) => set(() => ({ hoveredCountyId: id })),

  data: null,
  setData: (data) => set(() => ({ data })),

  dataSummary: null,
  setDataSummary: (dataSummary) => set(() => ({ dataSummary })),

  selectedState: null,
  setSelectedState: (selectedState) => set(() => ({ selectedState })),

  stateData: null,
  setStateData: (stateData) => set(() => ({ stateData })),

  stateDataSummary: null,
  setStateDataSummary: (stateDataSummary) => set(() => ({ stateDataSummary })),
})));


// // Usage with a plain action store, it will log actions as "setState"
// const usePlainStore = create(devtools((set) => ...))
// // Usage with a redux store, it will log full action types
// const useReduxStore = create(devtools(redux(reducer, initialState)))
