import { FollowParametricObject } from "@novorender/api";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { selectBookmark } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";
import { VecRGBA } from "utils/color";

type LandXmlPath = {
    id: number;
    name: string;
};

const initialState = {
    paths: { status: AsyncStatus.Initial } as AsyncState<LandXmlPath[]>,
    currentCenter: undefined as undefined | Vec3,
    profile: "",
    step: "1",
    ptHeight: undefined as undefined | number,
    profileRange: undefined as undefined | { min: number; max: number },
    view2d: false,
    showGrid: true,
    autoRecenter: false,
    verticalClipping: false,
    deviations: {
        line: true,
        lineColor: [0, 0, 0, 1] as VecRGBA,
        prioritization: "minimum" as "minimum" | "maximum",
    },
    autoStepSize: false,
    clipping: 0.01,
    lastViewedRouterPath: "/",
    goToRouterPath: "",
    selectedPositions: [] as {
        id: number;
        pos: vec3;
    }[],
    drawSelectedPositions: true,
    selectedIds: [] as number[],
    reset: undefined as "initPosition" | "default" | undefined,
    followCylindersFrom: "center" as "center" | "top" | "bottom",
    drawRoadIds: undefined as string[] | undefined,
    roadIds: undefined as string[] | undefined,
    selectedPath: undefined as undefined | LandXmlPath["id"],
    showTracer: false,
    traceVertical: false,
    followObject: undefined as undefined | FollowParametricObject,
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
        setVerticalClipping: (state, action: PayloadAction<State["verticalClipping"]>) => {
            state.verticalClipping = action.payload;
        },
        setShowDeviationLine: (state, action: PayloadAction<State["deviations"]["line"]>) => {
            state.deviations.line = action.payload;
        },
        setDeviationPrioritization: (state, action: PayloadAction<State["deviations"]["prioritization"]>) => {
            state.deviations.prioritization = action.payload;
        },
        setDeviationLineColor: (state, action: PayloadAction<State["deviations"]["lineColor"]>) => {
            state.deviations.lineColor = action.payload;
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
        toggleShowTracer: (state, action: PayloadAction<State["showTracer"] | undefined>) => {
            state.showTracer = action.payload !== undefined ? action.payload : !state.showTracer;
        },
        toggleTraceVerical: (state, action: PayloadAction<State["traceVertical"] | undefined>) => {
            state.traceVertical = action.payload !== undefined ? action.payload : !state.traceVertical;
        },
        setSelectedPositions: (state, action: PayloadAction<State["selectedPositions"]>) => {
            state.selectedPositions = action.payload;
        },
        setSelectedIds: (state, action: PayloadAction<State["selectedIds"]>) => {
            state.selectedIds = action.payload;
        },
        setReset: (state, action: PayloadAction<State["reset"] | undefined>) => {
            state.reset = action.payload;
        },
        setFollowFrom: (state, action: PayloadAction<State["followCylindersFrom"]>) => {
            state.followCylindersFrom = action.payload;
        },
        setDrawRoadIds: (state, action: PayloadAction<State["drawRoadIds"]>) => {
            state.drawRoadIds = action.payload;
        },
        addDrawRoad: (state, action: PayloadAction<string>) => {
            state.drawRoadIds?.push(action.payload);
        },
        removeDrawRoad: (state, action: PayloadAction<string>) => {
            if (state.drawRoadIds) {
                state.drawRoadIds = state.drawRoadIds.filter((id) => id !== action.payload);
            }
        },
        setRoadIds: (state, action: PayloadAction<State["roadIds"]>) => {
            state.roadIds = action.payload;
        },
        setSelectedPath: (state, action: PayloadAction<State["selectedPath"]>) => {
            state.selectedPath = action.payload;
        },
        setFollowObject: (state, action: PayloadAction<State["followObject"]>) => {
            state.followObject = action.payload;
        },
    },
    extraReducers(builder) {
        builder.addCase(selectBookmark, (state, action) => {
            const { followPath: fp, grid, camera } = action.payload;

            if (!fp) {
                return;
            }

            state.drawSelectedPositions = false;
            state.drawRoadIds = fp.drawLayers.roadIds;
            state.currentCenter = fp.currentCenter;
            state.profile = String(fp.profileNumber);
            state.ptHeight = fp.currentCenter[2];
            state.showGrid = grid.enabled;
            state.view2d = camera.kind === "orthographic";
            state.verticalClipping = fp.verticalClipping ?? false;
            state.followObject = fp.followObject;
            state.profileRange = fp.profileRange;

            if (state.view2d) {
                state.clipping = action.payload.camera.far;
            }

            if (fp.selected.positions?.length) {
                state.selectedPositions = fp.selected.positions;
                state.selectedIds = [];
                state.selectedPath = undefined;
                state.drawRoadIds = undefined;
                state.goToRouterPath = "/followPos";
            } else {
                state.selectedPositions = [];
                state.selectedIds = fp.selected.ids;
                state.selectedPath = fp.selected.landXmlPathId;
                state.drawRoadIds = fp.drawLayers.roadIds;
                state.goToRouterPath = "/followIds";
            }

            if (fp.deviations) {
                state.deviations = fp.deviations;
            } else {
                state.deviations.line = false;
            }
        });
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
export const selectVerticalClipping = (state: RootState) => state.followPath.verticalClipping;
export const selectFollowDeviations = (state: RootState) => state.followPath.deviations;
export const selectAutoStepSize = (state: RootState) => state.followPath.autoStepSize;
export const selectLastViewedRouterPath = (state: RootState) => state.followPath.lastViewedRouterPath;
export const selectGoToRouterPath = (state: RootState) => state.followPath.goToRouterPath;
export const selectSelectedPositions = (state: RootState) => state.followPath.selectedPositions;
export const selectDrawSelectedPositions = (state: RootState) => state.followPath.drawSelectedPositions;
export const selectSelectedIds = (state: RootState) => state.followPath.selectedIds;
export const selectReset = (state: RootState) => state.followPath.reset;
export const selectFollowCylindersFrom = (state: RootState) => state.followPath.followCylindersFrom;
export const selectSelectedPath = (state: RootState) => state.followPath.selectedPath;
export const selectDrawRoadIds = (state: RootState) => state.followPath.drawRoadIds;
export const selectRoadIds = (state: RootState) => state.followPath.roadIds;
export const selectShowTracer = (state: RootState) => state.followPath.showTracer;
export const selectVerticalTracer = (state: RootState) => state.followPath.traceVertical;
export const selectFollowObject = (state: RootState) => state.followPath.followObject;

const { actions, reducer } = followPathSlice;
export { actions as followPathActions, reducer as followPathReducer };
