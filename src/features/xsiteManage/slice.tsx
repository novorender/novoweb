import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app";
import { initScene } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

import { MachineLocation, Site } from "./types";

export enum LogPointTime {
    None,
    Day,
    Week,
    Month,
    All,
}

const initialState = {
    config: {
        siteId: "",
    },
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    refreshToken: undefined as undefined | { token: string; refreshIn: number },
    site: undefined as undefined | Site,
    showLogPointsSince: LogPointTime.Day,
    availableLogPointCodes: undefined as undefined | string[],
    includedLogPointCodes: [] as string[],
    currentMachine: "",
    isFetchingLogPoints: false,
    showMachineMarkers: true,
    machineLocations: {} as Record<string, MachineLocation>,
    clickedMachineMarker: "",
    hoveredMachine: "",
    lastViewedPath: "/",
    machinesScrollOffset: 0,
    showLogPointMarkers: true,
};

type State = typeof initialState;

export const xsiteManageSlice = createSlice({
    name: "xsiteManage",
    initialState: initialState,
    reducers: {
        setAccessToken: (state, action: PayloadAction<State["accessToken"]>) => {
            state.accessToken = action.payload;
        },
        setRefreshToken: (state, action: PayloadAction<State["refreshToken"]>) => {
            state.refreshToken = action.payload;
        },
        setSite: (state, action: PayloadAction<State["site"]>) => {
            state.site = action.payload;
        },
        setIsFetchingLogPoints: (state, action: PayloadAction<State["isFetchingLogPoints"]>) => {
            state.isFetchingLogPoints = action.payload;
        },
        activateLogPoints: (state, action: PayloadAction<{ machine: string; time?: LogPointTime }>) => {
            state.showLogPointsSince = action.payload.time ?? state.showLogPointsSince;
            state.currentMachine = action.payload.machine;
        },
        clearLogPoints: (state) => {
            state.showLogPointsSince = initialState.showLogPointsSince;
            state.currentMachine = initialState.currentMachine;
            state.includedLogPointCodes = initialState.includedLogPointCodes;
        },
        setIncludedLogPointCodes: (state, action: PayloadAction<State["includedLogPointCodes"]>) => {
            state.includedLogPointCodes = action.payload;
        },
        setAvailableLogPointCodes: (state, action: PayloadAction<State["availableLogPointCodes"]>) => {
            state.availableLogPointCodes = action.payload;
        },
        logOut: () => {
            return initialState;
        },
        registerMachineLocation: (state, action: PayloadAction<MachineLocation>) => {
            state.machineLocations[action.payload.machineId] = action.payload;
        },
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setClickedMarker: (state, action: PayloadAction<State["clickedMachineMarker"]>) => {
            state.clickedMachineMarker = action.payload;
        },
        setConfig: (state, action: PayloadAction<State["config"]>) => {
            state.config = action.payload;
        },
        setHoveredMachine: (state, action: PayloadAction<State["hoveredMachine"]>) => {
            state.hoveredMachine = action.payload;
        },
        setMachinesScrollOffset: (state, action: PayloadAction<State["machinesScrollOffset"]>) => {
            state.machinesScrollOffset = action.payload;
        },
        toggleShowMachineMarkers: (state, action: PayloadAction<State["showMachineMarkers"] | undefined>) => {
            if (action.payload === undefined) {
                state.showMachineMarkers = !state.showMachineMarkers;
            } else {
                state.showMachineMarkers = action.payload;
            }
        },
        toggleShowLogPointMarkers: (state, action: PayloadAction<State["showLogPointMarkers"] | undefined>) => {
            if (action.payload === undefined) {
                state.showLogPointMarkers = !state.showLogPointMarkers;
            } else {
                state.showLogPointMarkers = action.payload;
            }
        },
    },
    extraReducers(builder) {
        builder.addCase(initScene, (state, action) => {
            const props = action.payload.sceneData.customProperties;

            if (props.integrations?.xsiteManage) {
                state.config = props.integrations.xsiteManage;
            } else if (props.xsiteManageSettings) {
                state.config = props.xsiteManageSettings;
            }
        });
    },
});

export const selectXsiteManageAccessToken = (state: RootState) => state.xsiteManage.accessToken;
export const selectXsiteManageRefreshToken = (state: RootState) => state.xsiteManage.refreshToken;
export const selectXsiteManageSite = (state: RootState) => state.xsiteManage.site;
export const selectXsiteManageActiveLogPoints = (state: RootState) => state.xsiteManage.showLogPointsSince;
export const selectXsiteManageCurrentMachine = (state: RootState) => state.xsiteManage.currentMachine;
export const selectXsiteManageIsFetchingLogPoints = (state: RootState) => state.xsiteManage.isFetchingLogPoints;
export const selectXsiteManageIncludedLogPointCodes = (state: RootState) => state.xsiteManage.includedLogPointCodes;
export const selectXsiteManageAvailableLogPointCodes = (state: RootState) => state.xsiteManage.availableLogPointCodes;
export const selectXsiteManageMachineLocations = (state: RootState) => state.xsiteManage.machineLocations;
export const selectXsiteManageClickedMachineMarker = (state: RootState) => state.xsiteManage.clickedMachineMarker;
export const selectXsiteManageLastViewedPath = (state: RootState) => state.xsiteManage.lastViewedPath;
export const selectXsiteManageMachinesScrollOffset = (state: RootState) => state.xsiteManage.machinesScrollOffset;
export const selectXsiteManageShowMachineMarkers = (state: RootState) => state.xsiteManage.showMachineMarkers;
export const selectXsiteManageHoveredMachine = (state: RootState) => state.xsiteManage.hoveredMachine;
export const selectXsiteManageShowLogPointMarkers = (state: RootState) => state.xsiteManage.showLogPointMarkers;
export const selectXsiteManageConfig = (state: RootState) => state.xsiteManage.config;

const { actions, reducer } = xsiteManageSlice;
export { actions as xsiteManageActions, reducer as xsiteManageReducer };
