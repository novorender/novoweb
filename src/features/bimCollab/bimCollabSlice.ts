import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "app/store";
import { StorageKey } from "config/storage";
import { getFromStorage } from "utils/storage";

import { Project, Topic } from "./types";

export enum FilterKey {
    Type = "topic_type",
    Status = "topic_status",
    Label = "labels",
    Priority = "priority",
    Stage = "stage",
}

const initialState = {
    accessToken: "",
    space: getFromStorage(StorageKey.BimCollabSpace) as string,
    version: "",
    projects: [] as Project[],
    topics: {} as Record<string, Topic>,
    viewpoints: {} as Record<string, any>,
    filters: {
        [FilterKey.Type]: [] as string[],
        [FilterKey.Label]: [] as string[],
        [FilterKey.Status]: [] as string[],
        [FilterKey.Priority]: [] as string[],
        [FilterKey.Stage]: [] as string[],
    } as Record<FilterKey, string[]>,
};

export const initialFilters = initialState.filters;
export type Filters = typeof initialFilters;

export const bimCollabSlice = createSlice({
    name: "bimCollab",
    initialState: initialState,
    reducers: {
        setSpace: (state, action: PayloadAction<string>) => {
            state.space = action.payload;
        },
        setVersion: (state, action: PayloadAction<string>) => {
            state.version = action.payload;
        },
        setAccessToken: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload;
        },
        setFilters: (state, action: PayloadAction<Filters>) => {
            state.filters = action.payload;
        },
        logOut: (state) => {
            state.accessToken = "";
            state.space = "";
            state.version = "";
        },
    },
});

export const selectAccessToken = (state: RootState) => state.bimCollab.accessToken;
export const selectSpace = (state: RootState) => state.bimCollab.space;
export const selectVersion = (state: RootState) => state.bimCollab.version;
export const selectFilters = (state: RootState) => state.bimCollab.filters;

const { actions, reducer } = bimCollabSlice;
export { actions as bimCollabActions, reducer as bimCollabReducer };
