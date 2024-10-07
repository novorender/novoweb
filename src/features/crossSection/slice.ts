import { mergeRecursive } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { ColoringType, DisplaySettings } from "./types";

const initialState = {
    planeIndex: null as null | number,
    displaySettings: {
        showLabels: true,
        coloringType: ColoringType.OutlinesColor,
    } as DisplaySettings,
};

type State = typeof initialState;

export const crossSectionSlice = createSlice({
    name: "crossSection",
    initialState: initialState,
    reducers: {
        setPlaneIndex: (state, action: PayloadAction<State["planeIndex"]>) => {
            state.planeIndex = action.payload;
        },
        updateDisplaySettings: (state, action: PayloadAction<Partial<DisplaySettings>>) => {
            state.displaySettings = mergeRecursive(state.displaySettings, action.payload);
        },
    },
});

const { actions, reducer } = crossSectionSlice;
export { actions as crossSectionActions, reducer as crossSectionReducer };
