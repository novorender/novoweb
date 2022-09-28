import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";
import { ObjectId } from "@novorender/webgl-api";

export type LandXmlPath = {
    id: number;
    name: string;
};

export type ParametricPath = {
    id: number;
    pos: vec3;
};

const initialState = {
    paths: { status: AsyncStatus.Initial } as AsyncState<LandXmlPath[]>,
    currentCenter: undefined as undefined | [number, number, number],
    profile: "",
    step: "1",
    ptHeight: undefined as undefined | number,
    profileRange: undefined as undefined | { min: number; max: number },
    view2d: false,
    showGrid: true,
    autoRecenter: false,
    autoStepSize: false,
    clipping: 0.1,
    lastViewedRouterPath: "/",
    goToRouterPath: "",
    selectedPositions: [] as ParametricPath[],
    drawSelectedPositions: true,
    selectedIds: [] as ObjectId[],
    resetPositionOnInit: false,
    followCylindersFrom: "center" as "center" | "top" | "bottom",
};

type State = typeof initialState;

export const followPathSlice = createSlice({
    name: "followPath",
    initialState: initialState,
    reducers: {
        setPaths: (state, action: PayloadAction<State["paths"]>) => {
            state.paths = action.payload;
        },
        setCurrentCenter: (state, action: PayloadAction<State["currentCenter"]>) => {
            state.currentCenter = action.payload;
        },
        setView2d: (state, action: PayloadAction<State["view2d"]>) => {
            state.view2d = action.payload;
        },
        setProfile: (state, action: PayloadAction<State["profile"]>) => {
            state.profile = action.payload;
        },
        setStep: (state, action: PayloadAction<State["step"]>) => {
            state.step = action.payload;
        },
        setPtHeight: (state, action: PayloadAction<State["ptHeight"]>) => {
            state.ptHeight = action.payload;
        },
        setProfileRange: (state, action: PayloadAction<State["profileRange"]>) => {
            state.profileRange = action.payload;
        },
        setClipping: (state, action: PayloadAction<State["clipping"]>) => {
            state.clipping = action.payload;
        },
        setShowGrid: (state, action: PayloadAction<State["showGrid"]>) => {
            state.showGrid = action.payload;
        },
        setAutoRecenter: (state, action: PayloadAction<State["autoRecenter"]>) => {
            state.autoRecenter = action.payload;
        },
        setAutoStepSize: (state, action: PayloadAction<State["autoStepSize"]>) => {
            state.autoStepSize = action.payload;
        },
        setLastViewedRouterPath: (state, action: PayloadAction<State["lastViewedRouterPath"]>) => {
            state.lastViewedRouterPath = action.payload;
        },
        setGoToRouterPath: (state, action: PayloadAction<State["goToRouterPath"]>) => {
            state.goToRouterPath = action.payload;
        },
        toggleDrawSelectedPositions: (state, action: PayloadAction<State["drawSelectedPositions"] | undefined>) => {
            state.drawSelectedPositions = action.payload !== undefined ? action.payload : !state.drawSelectedPositions;
        },
        setSelectedPositions: (state, action: PayloadAction<State["selectedPositions"]>) => {
            state.selectedPositions = action.payload;
        },
        setSelectedIds: (state, action: PayloadAction<State["selectedIds"]>) => {
            state.selectedIds = action.payload;
        },
        toggleResetPositionOnInit: (state, action: PayloadAction<State["resetPositionOnInit"] | undefined>) => {
            state.resetPositionOnInit = action.payload !== undefined ? action.payload : !state.resetPositionOnInit;
        },
        setFollowFrom: (state, action: PayloadAction<State["followCylindersFrom"]>) => {
            state.followCylindersFrom = action.payload;
        },
    },
});

export const selectFollowPath = (state: RootState) => state.followPath;
export const selectLandXmlPaths = (state: RootState) => state.followPath.paths;
export const selectCurrentCenter = (state: RootState) => state.followPath.currentCenter;
export const selectView2d = (state: RootState) => state.followPath.view2d;
export const selectProfile = (state: RootState) => state.followPath.profile;
export const selectStep = (state: RootState) => state.followPath.step;
export const selectPtHeight = (state: RootState) => state.followPath.ptHeight;
export const selectProfileRange = (state: RootState) => state.followPath.profileRange;
export const selectClipping = (state: RootState) => state.followPath.clipping;
export const selectShowGrid = (state: RootState) => state.followPath.showGrid;
export const selectAutoRecenter = (state: RootState) => state.followPath.autoRecenter;
export const selectAutoStepSize = (state: RootState) => state.followPath.autoStepSize;
export const selectLastViewedRouterPath = (state: RootState) => state.followPath.lastViewedRouterPath;
export const selectGoToRouterPath = (state: RootState) => state.followPath.goToRouterPath;
export const selectSelectedPositions = (state: RootState) => state.followPath.selectedPositions;
export const selectDrawSelectedPositions = (state: RootState) => state.followPath.drawSelectedPositions;
export const selectSelectedIds = (state: RootState) => state.followPath.selectedIds;
export const selectResetPositionOnInit = (state: RootState) => state.followPath.resetPositionOnInit;
export const followCylindersFrom = (state: RootState) => state.followPath.followCylindersFrom;

const { actions, reducer } = followPathSlice;
export { actions as followPathActions, reducer as followPathReducer };
