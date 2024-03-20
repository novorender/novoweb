import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app";
import { initScene } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

export enum FilterType {
    Type = "topic_type",
    Status = "topic_status",
    Label = "labels",
    Priority = "priority",
    Stage = "stage",
    AssignedTo = "assigned_to",
    CreatedBy = "creation_author",
    Deadline = "due_date",
}

export enum FilterModifier {
    DeadlineOperator = "deadlineOperator",
}

export enum BimTrackStatus {
    Initial,
    LoadingAuthInfo,
    Ready,
}

const initialState = {
    config: {
        server: "",
        project: "",
    },
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    filterIsInitialized: false,
    filters: {
        [FilterType.Type]: [] as string[],
        [FilterType.Label]: [] as string[],
        [FilterType.Status]: [] as string[],
        [FilterType.Priority]: [] as string[],
        [FilterType.Stage]: [] as string[],
        [FilterType.CreatedBy]: [] as string[],
        [FilterType.AssignedTo]: [] as string[],
        [FilterType.Deadline]: "",
    },
    filterModifiers: {
        [FilterModifier.DeadlineOperator]: "=" as "=" | ">=" | "<=",
    },
};

export const initialFilters = initialState.filters;
export const initialFilterModifiers = initialState.filterModifiers;

type State = typeof initialState;
export type Filters = State["filters"];
export type FilterModifiers = State["filterModifiers"];

export const bimTrackSlice = createSlice({
    name: "bimTrack",
    initialState: initialState,
    reducers: {
        setConfig: (state, action: PayloadAction<Partial<State["config"]>>) => {
            state.config = { ...state.config, ...action.payload };
        },
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<Filters>>) => {
            state.filterIsInitialized = true;
            state.filters = { ...state.filters, ...action.payload };
        },
        setFilterModifiers: (state, action: PayloadAction<FilterModifiers>) => {
            state.filterModifiers = action.payload;
        },
        resetFilters: (state) => {
            state.filters = initialFilters;
            state.filterModifiers = initialFilterModifiers;
        },
        logOut: () => {
            return initialState;
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const props = action.payload.sceneData.customProperties;

            if (!props.integrations?.bimTrack) {
                return;
            }

            state.config = props.integrations.bimTrack;
        });
    },
});

export const selectAccessToken = (state: RootState) => state.bimTrack.accessToken;
export const selectFilters = (state: RootState) => state.bimTrack.filters;
export const selectFilterModifiers = (state: RootState) => state.bimTrack.filterModifiers;
export const selectBimTrackConfig = (state: RootState) => state.bimTrack.config;
export const selectBimTrackFilterIsInitialized = (state: RootState) => state.bimTrack.filterIsInitialized;

const { actions, reducer } = bimTrackSlice;
export { actions as bimTrackActions, reducer as bimTrackReducer };
