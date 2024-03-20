import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app";

const initialState = {
    crossSection: undefined as vec3 | undefined,
    crossSectionHover: undefined as vec3 | undefined,
    crossSectionClipping: 0.01,
    currentTopDownElevation: undefined as number | undefined,
    isTopDown: false,
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
        setCrossSectionClipping: (state, action: PayloadAction<State["crossSectionClipping"]>) => {
            state.crossSectionClipping = action.payload;
        },
        setCurrentTopDownElevation: (state, action: PayloadAction<State["currentTopDownElevation"]>) => {
            state.currentTopDownElevation = action.payload;
        },
        setIsTopDown: (state, action: PayloadAction<State["isTopDown"]>) => {
            state.isTopDown = action.payload;
        },
    },
});

export const selectDefaultTopDownElevation = (state: RootState) =>
    state.render.cameraDefaults.orthographic.topDownElevation;

export const selectTopDownSnapToAxis = (state: RootState) => state.render.cameraDefaults.orthographic.topDownSnapToAxis;
export const selectCurrentTopDownElevation = (state: RootState) => state.orthoCam.currentTopDownElevation;
export const selectCrossSectionPoint = (state: RootState) => state.orthoCam.crossSection;
export const selectCrossSectionClipping = (state: RootState) => state.orthoCam.crossSectionClipping;
export const selectCrossSectionHover = (state: RootState) => state.orthoCam.crossSectionHover;
export const selectCrossSectionPoints = createSelector(
    [selectCrossSectionPoint, selectCrossSectionHover],
    (crossSection, crossSectionHover) => {
        if (crossSection) {
            if (crossSectionHover) {
                return [crossSection, crossSectionHover];
            }
            return [crossSection];
        }
        return undefined;
    }
);
export const selectIsTopDown = (state: RootState) => state.orthoCam.isTopDown;

const { actions, reducer } = orthoCamSlice;
export { actions as orthoCamActions, reducer as orthoCamReducer };
