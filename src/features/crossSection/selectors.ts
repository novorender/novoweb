import { type RootState } from "app";

export const selectPlaneIndex = (state: RootState) => state.crossSection.planeIndex;
export const selectDisplaySettings = (state: RootState) => state.crossSection.displaySettings;
