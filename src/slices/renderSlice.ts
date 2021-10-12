import type { API, Camera, EnvironmentDescription, ObjectId, RenderSettings } from "@novorender/webgl-api";
import type { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "app/store";
import { vec3 } from "gl-matrix";

export const fetchEnvironments = createAsyncThunk("novorender/fetchEnvironments", async (api: API) => {
    const envs = await api.availableEnvironments("https://api.novorender.com/assets/env/index.json");
    return envs;
});

export enum CameraSpeedMultiplier {
    Slow = 0.5,
    Normal = 1,
    Fast = 5,
}

export enum RenderType {
    Triangles,
    Points,
    All,
    UnChangeable,
}

type CameraPosition = Pick<Camera, "position" | "rotation">;
export type ObjectGroups = { default: ObjectGroup; defaultHidden: ObjectGroup; custom: ObjectGroup[] };
export type ClippingPlanes = Omit<RenderSettings["clippingPlanes"], "bounds"> & { defining: boolean };

// Redux toolkit with immer removes readonly modifier of state in the reducer so we get ts errors
// unless we cast the types to writable ones.
type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };
type WritableBookmark = DeepWritable<Bookmark>;

const initialState = {
    environments: [] as EnvironmentDescription[],
    currentEnvironment: undefined as EnvironmentDescription | undefined,
    mainObject: undefined as ObjectId | undefined,
    bookmarks: [] as WritableBookmark[],
    viewOnlySelected: false,
    selectMultiple: false,
    baseCameraSpeed: 0.03,
    cameraSpeedMultiplier: CameraSpeedMultiplier.Normal,
    savedCameraPositions: { currentIndex: -1, positions: [] as CameraPosition[] },
    renderType: RenderType.UnChangeable,
    clippingPlanes: {
        defining: false,
        enabled: false,
        inside: true,
        showBox: false,
        highlight: -1,
    } as ClippingPlanes,
    measure: {
        addingPoint: false,
        selected: -1,
        points: [] as vec3[],
        distance: 0,
        distances: [] as number[],
        angles: [] as number[],
    },
};

type State = typeof initialState;

export const renderSlice = createSlice({
    name: "render",
    initialState: initialState,
    reducers: {
        setMainObject: (state, action: PayloadAction<ObjectId | undefined>) => {
            state.mainObject = action.payload;
        },
        setEnvironment: (state, action: PayloadAction<EnvironmentDescription | undefined>) => {
            state.currentEnvironment = action.payload;
        },
        toggleViewOnlySelected: (state) => {
            state.viewOnlySelected = !state.viewOnlySelected;
        },
        toggleSelectMultiple: (state) => {
            state.selectMultiple = !state.selectMultiple;
        },
        toggleCameraSpeed: (state) => {
            state.cameraSpeedMultiplier =
                state.cameraSpeedMultiplier === CameraSpeedMultiplier.Slow
                    ? CameraSpeedMultiplier.Normal
                    : state.cameraSpeedMultiplier === CameraSpeedMultiplier.Normal
                    ? CameraSpeedMultiplier.Fast
                    : CameraSpeedMultiplier.Slow;
        },
        /**
         * Save camera position at current index.
         *
         * @remarks
         * Deletes camera positions already saved at higher indexes
         */
        saveCameraPosition: (state, action: PayloadAction<CameraPosition>) => {
            state.savedCameraPositions.positions = state.savedCameraPositions.positions
                .slice(0, state.savedCameraPositions.currentIndex + 1)
                .concat(action.payload);
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.positions.length - 1;
        },
        undoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex - 1;
        },
        redoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex + 1;
        },
        setBookmarks: (state, action: PayloadAction<Bookmark[]>) => {
            state.bookmarks = action.payload as WritableBookmark[];
        },
        setRenderType: (state, action: PayloadAction<RenderType>) => {
            state.renderType = action.payload;
        },
        setClippingPlanes: (state, action: PayloadAction<ClippingPlanes>) => {
            state.clippingPlanes = action.payload;
        },
        resetClippingPlanes: (state) => {
            state.clippingPlanes = initialState.clippingPlanes;
        },
        setMeasure: (state, action: PayloadAction<State["measure"]>) => {
            state.measure = action.payload;
        },
        setMeasurePoints: (state, action: PayloadAction<vec3[]>) => {
            const points = action.payload;
            const num = points.length;
            let distance = 0;
            let distances: number[] = [];
            let angles: number[] = [];

            for (let i = 1; i < num; i++) {
                const dist = vec3.distance(points[i - 1], points[i]);
                distance += dist;
                distances.push(dist);
            }
            for (let i = 2; i < num; i++) {
                const v0 = vec3.sub(vec3.create(), points[i], points[i - 1]);
                const v1 = vec3.sub(vec3.create(), points[i - 2], points[i - 1]);
                const angle = (Math.acos(vec3.dot(vec3.normalize(v0, v0), vec3.normalize(v1, v1))) * 180) / Math.PI;
                angles.push(angle);
            }
            state.measure = { ...state.measure, points, distance, distances, angles };
        },
        resetState: (state) => {
            return { ...initialState, environments: state.environments };
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchEnvironments.fulfilled, (state, action) => {
            state.environments = action.payload as DeepWritable<typeof action.payload>;
        });
    },
});

export const selectMainObject = (state: RootState) => state.render.mainObject;
export const selectEnvironments = (state: RootState) => state.render.environments;
export const selectCurrentEnvironment = (state: RootState) => state.render.currentEnvironment;
export const selectViewOnlySelected = (state: RootState) => state.render.viewOnlySelected;
export const selectSelectMultiple = (state: RootState) => state.render.selectMultiple;
export const selectCameraSpeedMultiplier = (state: RootState) => state.render.cameraSpeedMultiplier;
export const selectBaseCameraSpeed = (state: RootState) => state.render.baseCameraSpeed;
export const selectSavedCameraPositions = (state: RootState) => state.render.savedCameraPositions;
export const selectHomeCameraPosition = (state: RootState) => state.render.savedCameraPositions.positions[0];
export const selectBookmarks = (state: RootState) => state.render.bookmarks as Bookmark[];
export const selectRenderType = (state: RootState) => state.render.renderType;
export const selectClippingPlanes = (state: RootState) => state.render.clippingPlanes;
export const selectMeasure = (state: RootState) => state.render.measure;

const { reducer, actions } = renderSlice;
export { reducer as renderReducer, actions as renderActions };
