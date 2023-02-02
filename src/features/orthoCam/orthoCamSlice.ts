import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";

const initialState = {
    crossSection: undefined as vec3 | undefined,
    crossSectionHover: undefined as vec3 | undefined,
};

type State = typeof initialState;

export const orthoCamSlice = createSlice({
    name: "orthoCam",
    initialState: initialState,
    reducers: {
        setCrossSectionPoint: (state, action: PayloadAction<State["crossSection"]>) => {
            state.crossSection = action.payload;
        },
        setCrossSectionHover: (state, action: PayloadAction<State["crossSectionHover"]>) => {
            state.crossSectionHover = action.payload;
        },
    },
});

export const selectCrossSectionPoint = (state: RootState) => state.orthoCam.crossSection;
export const selectCrossSectionHover = (state: RootState) => state.orthoCam.crossSectionHover;
export const selectCrossSectionPoints = (state: RootState) => {
    if (state.orthoCam.crossSection) {
        if (state.orthoCam.crossSectionHover) {
            return [state.orthoCam.crossSection, state.orthoCam.crossSectionHover];
        }
        return [state.orthoCam.crossSection];
    }
    return undefined;
};

const { actions, reducer } = orthoCamSlice;
export { actions as orthoCamActions, reducer as orthoCamReducer };