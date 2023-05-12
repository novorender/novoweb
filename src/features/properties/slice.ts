import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";

const initialState = {
    stampSettings: {
        enabled: false,
        properties: [] as string[],
    },
    showStamp: false,
};

type State = typeof initialState;

export const propertiesSlice = createSlice({
    name: "properties",
    initialState: initialState,
    reducers: {
        setStampSettings: (state, action: PayloadAction<Partial<State["stampSettings"]>>) => {
            state.stampSettings = { ...state.stampSettings, ...action.payload };
        },
        toggleEnableStamp: (state, action: PayloadAction<State["stampSettings"]["enabled"] | undefined>) => {
            const toggled = action.payload !== undefined ? action.payload : !state.stampSettings.enabled;
            state.stampSettings.enabled = toggled;
            state.showStamp = toggled;
        },
        toggleShowStamp: (state, action: PayloadAction<State["showStamp"] | undefined>) => {
            state.showStamp = action.payload !== undefined ? action.payload : !state.showStamp;
        },
        addStampProperties: (state, action: PayloadAction<string | string[]>) => {
            if (Array.isArray(action.payload)) {
                action.payload.forEach((property) => state.stampSettings.properties.push(property));
            } else {
                state.stampSettings.properties.push(action.payload);
            }
        },
        removeStampProperties: (state, action: PayloadAction<string | string[]>) => {
            if (Array.isArray(action.payload)) {
                state.stampSettings.properties = state.stampSettings.properties.filter(
                    (property) => !(action.payload as string[]).some((toDelete) => property.startsWith(toDelete))
                );
            } else {
                state.stampSettings.properties = state.stampSettings.properties.filter(
                    (property) => !property.startsWith(action.payload as string)
                );
            }
        },
        removeStampPropertyIndex: (state, action: PayloadAction<number>) => {
            state.stampSettings.properties.splice(action.payload, 1);
        },
    },
});

export const selectPropertiesStampSettings = (state: RootState) => state.properties.stampSettings;
export const selectShowPropertiesStamp = (state: RootState) => state.properties.showStamp;

const { actions, reducer } = propertiesSlice;
export { actions as propertiesActions, reducer as propertiesReducer };
