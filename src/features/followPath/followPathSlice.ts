import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "app/store";

export type LandXmlPath = {
    id: number;
    name: string;
};

export type Nurbs = {
    kind: "nurbs";
    order: number;
    knots: number[];
    controlPoints: [number, number, number][];
};

export type Brep = {
    units: string;
    vertices: [number, number, number][];
    instances: { geometries: number }[];
    geometries: { compoundCurve: number[] }[];
    curveSegments: { parameterBounds: [number, number]; curve3D: number }[];
    curves3D: Nurbs[];
};

const initialState = {
    paths: undefined as undefined | LandXmlPath[],
    currentPath: undefined as undefined | (LandXmlPath & { nurbs: Nurbs }),
    view2d: false,
    profile: "",
    step: "1",
    ptHeight: undefined as undefined | number,
    profileRange: undefined as undefined | { min: number; max: number },
    clipping: 2,
};

type State = typeof initialState;

export const followPathSlice = createSlice({
    name: "followPath",
    initialState: initialState,
    reducers: {
        setPaths: (state, action: PayloadAction<State["paths"]>) => {
            state.paths = action.payload;
        },
        setCurrentPath: (state, action: PayloadAction<State["currentPath"]>) => {
            state.currentPath = action.payload;
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
    },
});

export const selectLandXmlPaths = (state: RootState) => state.followPath.paths;
export const selectCurrentPath = (state: RootState) => state.followPath.currentPath;
export const selectView2d = (state: RootState) => state.followPath.view2d;
export const selectProfile = (state: RootState) => state.followPath.profile;
export const selectStep = (state: RootState) => state.followPath.step;
export const selectPtHeight = (state: RootState) => state.followPath.ptHeight;
export const selectProfileRange = (state: RootState) => state.followPath.profileRange;
export const selectClipping = (state: RootState) => state.followPath.clipping;

const { actions, reducer } = followPathSlice;
export { actions as followPathActions, reducer as followPathReducer };
