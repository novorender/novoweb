import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { initScene } from "features/render";
import { capitalize } from "utils/misc";

const initialState = {
    stampSettings: {
        enabled: false,
    },
    starred: {} as Record<string, true | undefined>,
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
        setStarred: (state, action: PayloadAction<State["starred"]>) => {
            state.starred = action.payload;
        },
        star: (state, action: PayloadAction<string>) => {
            state.starred[action.payload] = true;
        },
        unStar: (state, action: PayloadAction<string>) => {
            delete state.starred[action.payload];
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const props = action.payload.sceneData.customProperties;

            if (props.explorerProjectState) {
                state.stampSettings = props.explorerProjectState.features.properties.stamp;
                state.starred = Object.fromEntries(
                    props.explorerProjectState.features.properties.starred.map((prop) => [prop, true])
                );
            } else if (props.properties) {
                state.stampSettings = props.properties.stampSettings;
                state.starred = Object.fromEntries(
                    props.properties.starred.map((prop: string) => [
                        ["path", "name"].includes(prop) ? capitalize(prop) : prop,
                        true,
                    ])
                );
            }

            state.showStamp = state.stampSettings.enabled;
        });
    },
});

export const selectPropertiesStampSettings = (state: RootState) => state.properties.stampSettings;
export const selectShowPropertiesStamp = (state: RootState) => state.properties.showStamp;
export const selectStarredProperties = (state: RootState) => state.properties.starred;
export const selectPropertiesSettings = createSelector(
    (state: RootState) => state.properties,
    (properties) => ({
        stamp: {
            enabled: properties.stampSettings.enabled,
        },
        starred: Object.keys(properties.starred),
    })
);

const { actions, reducer } = propertiesSlice;
export { actions as propertiesActions, reducer as propertiesReducer };
