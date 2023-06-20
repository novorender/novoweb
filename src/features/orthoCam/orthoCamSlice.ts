import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { initScene } from "features/render";

const initialState = {
    crossSection: undefined as vec3 | undefined,
    crossSectionHover: undefined as vec3 | undefined,
    defaultTopDownElevation: undefined as number | undefined,
    currentTopDownElevation: undefined as number | undefined,
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
        setDefaultTopDownElevation: (state, action: PayloadAction<State["defaultTopDownElevation"]>) => {
            state.defaultTopDownElevation = action.payload;
        },
        setCurrentTopDownElevation: (state, action: PayloadAction<State["currentTopDownElevation"]>) => {
            state.currentTopDownElevation = action.payload;
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            state.defaultTopDownElevation = action.payload.sceneData.customProperties.defaultTopDownElevation;
        });
    },
});

export const selectDefaultTopDownElevation = (state: RootState) => state.orthoCam.defaultTopDownElevation;
export const selectCurrentTopDownElevation = (state: RootState) => state.orthoCam.currentTopDownElevation;
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
