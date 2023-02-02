import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { Site } from "./types";

export enum LogPointTime {
    None,
    Day,
    Week,
    Month,
    All,
}

const initialState = {
    accessToken: { status: AsyncStatus.Initial } as AsyncState<string>,
    refreshToken: undefined as undefined | { token: string; refreshIn: number },
    site: undefined as undefined | Site,
    showLogPointsSince: LogPointTime.Day,
    availableLogPointCodes: undefined as undefined | string[],
    includedLogPointCodes: [] as string[],
    currentMachine: "",
    isFetchingLogPoints: false,
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

const { actions, reducer } = xsiteManageSlice;
export { actions as xsiteManageActions, reducer as xsiteManageReducer };
