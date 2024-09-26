import { PointVisualization } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { LabeledKnot } from "features/render";
import { VecRGB, VecRGBA } from "utils/color";

const initialState = {
    originalState: undefined as
        | undefined
        | {
              classificationColorGradient: {
                  knots: LabeledKnot[];
                  undefinedColor: VecRGBA;
              };
              elevationGradient: {
                  knots: { position: number; color: VecRGB }[];
              };
              defaultPointVisualization: PointVisualization;
          },
};

type State = typeof initialState;

export const pointVisualizationSlice = createSlice({
    name: "pointVisualization",
    initialState: initialState,
    reducers: {
        setOriginalState: (state, action: PayloadAction<State["originalState"]>) => {
            state.originalState = action.payload;
        },
    },
});

const { actions, reducer } = pointVisualizationSlice;
export { actions as pointVisualizationActions, reducer as pointVisualizationReducer };
