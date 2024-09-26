import { PointVisualization } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { initScene, LabeledKnot } from "features/render";
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
    stamp: {
        enabled: false,
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
        setStamp: (state, action: PayloadAction<State["stamp"]>) => {
            state.stamp = action.payload;
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const props = action.payload.sceneData.customProperties;

            const stamp = props.explorerProjectState?.features?.pointVisualization?.stamp;
            if (stamp) {
                state.stamp = stamp;
            }
        });
    },
});

const { actions, reducer } = pointVisualizationSlice;
export { actions as pointVisualizationActions, reducer as pointVisualizationReducer };
