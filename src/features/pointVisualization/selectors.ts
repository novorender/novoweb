import { type RootState } from "app";

export const selectPointVisualizationOriginalState = (state: RootState) => state.pointVisualization.originalState;
export const selectPointVisualizationStamp = (state: RootState) => state.pointVisualization.stamp;
