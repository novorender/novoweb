import type { API, Camera, EnvironmentDescription, ObjectId, RenderSettings } from "@novorender/webgl-api";
import type { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "app/store";

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
export type ClippingPlanes = RenderSettings["clippingPlanes"];

// Redux toolkit with immer removes readonly modifier of state in the reducer so we get ts errors
// unless we cast the types to writable ones.
type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };
type WritableObjectGroups = DeepWritable<ObjectGroups>;
type WritableBookmark = DeepWritable<Bookmark>;

const initialState = {
    environments: [] as EnvironmentDescription[],
    currentEnvironment: undefined as EnvironmentDescription | undefined,
    mainObject: undefined as ObjectId | undefined,
    objectGroups: {
        default: { name: "default", ids: [], selected: true, hidden: false, color: [1, 0, 0], id: "" },
        defaultHidden: { name: "defaultHidden", ids: [], selected: false, hidden: true, color: [1, 0, 0], id: "" },
        custom: [],
    } as WritableObjectGroups,
    bookmarks: [] as WritableBookmark[],
    viewOnlySelected: false,
    selectMultiple: false,
    baseCameraSpeed: 0.03,
    cameraSpeedMultiplier: CameraSpeedMultiplier.Normal,
    savedCameraPositions: { currentIndex: -1, positions: [] as CameraPosition[] },
    renderType: RenderType.UnChangeable,
    clippingPlanes: {
        enabled: false,
        inside: false,
        showBox: false,
        bounds: { min: [0, 0, 0], max: [0, 0, 0] },
        highlight: 0,
    } as ClippingPlanes,
};

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
        setSelectedObjects: (state, action: PayloadAction<ObjectId[]>) => {
            state.objectGroups.default.ids = action.payload;
        },
        selectObjects: (state, action: PayloadAction<ObjectId[]>) => {
            state.objectGroups.default.ids = state.objectGroups.default.ids.concat(action.payload);
        },
        unSelectObjects: (state, action: PayloadAction<ObjectId[]>) => {
            state.objectGroups.default.ids = state.objectGroups.default.ids.filter(
                (id) => !action.payload.includes(id)
            );
        },
        clearSelectedObjects: (state) => {
            state.objectGroups.default.ids = [];
            state.mainObject = undefined;
        },
        setHiddenObjects: (state, action: PayloadAction<ObjectId[]>) => {
            state.objectGroups.defaultHidden.ids = action.payload;
        },
        hideObjects: (state, action: PayloadAction<ObjectId[]>) => {
            state.objectGroups.defaultHidden.ids = state.objectGroups.defaultHidden.ids.concat(action.payload);
        },
        showObjects: (state, action: PayloadAction<ObjectId[]>) => {
            state.objectGroups.defaultHidden.ids = state.objectGroups.defaultHidden.ids.filter(
                (id) => !action.payload.includes(id)
            );
        },
        toggleViewOnlySelected: (state) => {
            state.viewOnlySelected = !state.viewOnlySelected;
        },
        toggleSelectMultiple: (state) => {
            state.selectMultiple = !state.selectMultiple;
        },
        setDefaultSelectionColor: (state, action: PayloadAction<[number, number, number]>) => {
            state.objectGroups.default.color = action.payload;
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
        setObjectGroups: (state, action: PayloadAction<Partial<ObjectGroups>>) => {
            state.objectGroups = { ...state.objectGroups, ...action.payload } as WritableObjectGroups;
        },
        setBookmarks: (state, action: PayloadAction<Bookmark[]>) => {
            state.bookmarks = action.payload as WritableBookmark[];
        },
        setRenderType: (state, action: PayloadAction<RenderType>) => {
            state.renderType = action.payload;
        },
        setClippingPLanes: (state, action: PayloadAction<ClippingPlanes>) => {
            state.clippingPlanes = {
                ...action.payload,
                bounds: {
                    min: Array.from(action.payload.bounds.min) as [number, number, number],
                    max: Array.from(action.payload.bounds.max) as [number, number, number],
                },
            };
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
export const selectObjectGroups = (state: RootState) => state.render.objectGroups as ObjectGroups;
export const selectDefaultHighlighted = (state: RootState) => state.render.objectGroups.default.ids;
export const selectSelectedObjects = (state: RootState) =>
    state.render.mainObject !== undefined
        ? state.render.objectGroups.default.ids.concat(state.render.mainObject)
        : state.render.objectGroups.default.ids;
export const selectHiddenObjects = (state: RootState) => state.render.objectGroups.defaultHidden.ids;
export const selectViewOnlySelected = (state: RootState) => state.render.viewOnlySelected;
export const selectSelectMultiple = (state: RootState) => state.render.selectMultiple;
export const selectSelectionColor = (state: RootState) =>
    state.render.objectGroups.default.color as ObjectGroup["color"];
export const selectCameraSpeedMultiplier = (state: RootState) => state.render.cameraSpeedMultiplier;
export const selectBaseCameraSpeed = (state: RootState) => state.render.baseCameraSpeed;
export const selectSavedCameraPositions = (state: RootState) => state.render.savedCameraPositions;
export const selectHomeCameraPosition = (state: RootState) => state.render.savedCameraPositions.positions[0];
export const selectBookmarks = (state: RootState) => state.render.bookmarks as Bookmark[];
export const selectRenderType = (state: RootState) => state.render.renderType;
export const selectClippingPlanes = (state: RootState) => state.render.clippingPlanes;

const { reducer, actions } = renderSlice;
export { reducer as renderReducer, actions as renderActions };
