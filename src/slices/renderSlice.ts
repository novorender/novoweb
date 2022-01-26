import type {
    API,
    Camera,
    EnvironmentDescription,
    ObjectId,
    OrthoControllerParams,
    RenderSettings,
} from "@novorender/webgl-api";
import type { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { vec3, vec4 } from "gl-matrix";

import type { RootState } from "app/store";
import type { WidgetKey } from "config/features";
import { ExtendedBookmark } from "features/bookmarks/bookmarks";

export const fetchEnvironments = createAsyncThunk("novorender/fetchEnvironments", async (api: API) => {
    const envs = await api.availableEnvironments("https://api.novorender.com/assets/env/index.json");
    return envs;
});

export enum CameraSpeedMultiplier {
    Slow = 0.2,
    Normal = 1,
    Fast = 5,
}

export enum RenderType {
    Triangles,
    Points,
    TrianglesAndPoints,
    Panorama,
    UnChangeable,
}

export enum ObjectVisibility {
    Neutral,
    SemiTransparent,
    Transparent,
}

export enum CameraType {
    Orthographic,
    Flight,
}

export enum SceneEditStatus {
    Init,
    Loading,
    Editing,
}

export enum AdvancedSetting {
    Taa = "taa",
    Ssao = "ssao",
    AutoFps = "autoFps",
    ShowBoundingBoxes = "showBoundingBoxes",
    DoubleSidedMaterials = "doubleSidedMaterials",
    DoubleSidedTransparentMaterials = "doubleSidedTransparentMaterials",
    HoldDynamic = "holdDynamic",
    TriangleBudget = "triangleBudget",
    ShowPerformance = "showPerformance",
    CameraNearClipping = "cameraNearClipping",
    CameraFarClipping = "cameraFarClipping",
    QualityPoints = "qualityPoints",
    PointSize = "pointSize",
    MaxPointSize = "maxPointSize",
    PointToleranceFactor = "pointToleranceFactor",
}

export enum SelectionBasketMode {
    Strict,
    Loose,
}

type CameraPosition = Pick<Camera, "position" | "rotation">;
export type ObjectGroups = { default: ObjectGroup; defaultHidden: ObjectGroup; custom: ObjectGroup[] };
export type ClippingPlanes = Omit<RenderSettings["clippingPlanes"], "bounds"> & { defining: boolean };

// Redux toolkit with immer removes readonly modifier of state in the reducer so we get ts errors
// unless we cast the types to writable ones.
type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };
type WritableBookmark = DeepWritable<ExtendedBookmark>;
type CameraState =
    | { type: CameraType.Orthographic; params?: OrthoControllerParams }
    | { type: CameraType.Flight; goTo?: { position: Camera["position"]; rotation: Camera["rotation"] } };
type WritableCameraState = DeepWritable<CameraState>;

const initialState = {
    environments: [] as EnvironmentDescription[],
    currentEnvironment: undefined as EnvironmentDescription | undefined,
    mainObject: undefined as ObjectId | undefined,
    bookmarks: undefined as WritableBookmark[] | undefined,
    defaultVisibility: ObjectVisibility.Neutral,
    selectMultiple: false,
    baseCameraSpeed: 0.03,
    cameraSpeedMultiplier: CameraSpeedMultiplier.Normal,
    savedCameraPositions: { currentIndex: -1, positions: [] as CameraPosition[] },
    renderType: RenderType.TrianglesAndPoints as
        | Exclude<RenderType, RenderType.UnChangeable>
        | [RenderType.UnChangeable, "points" | "triangles"],
    selectionBasketMode: SelectionBasketMode.Loose,
    clippingBox: {
        defining: false,
        enabled: false,
        inside: true,
        showBox: false,
        highlight: -1,
    } as ClippingPlanes,
    clippingPlanes: {
        defining: false,
        enabled: false,
        mode: "union" as "union" | "intersection",
        planes: [] as vec4[],
        baseW: 0,
    },
    measure: {
        addingPoint: false,
        selected: -1,
        points: [] as vec3[],
        distance: 0,
        distances: [] as number[],
        angles: [] as number[],
    },
    camera: { type: CameraType.Flight } as WritableCameraState,
    selectingOrthoPoint: false,
    showPerformance: false,
    advancedSettings: {
        [AdvancedSetting.Taa]: true,
        [AdvancedSetting.Ssao]: true,
        [AdvancedSetting.AutoFps]: true,
        [AdvancedSetting.ShowBoundingBoxes]: false,
        [AdvancedSetting.DoubleSidedMaterials]: false,
        [AdvancedSetting.DoubleSidedTransparentMaterials]: false,
        [AdvancedSetting.HoldDynamic]: false,
        [AdvancedSetting.TriangleBudget]: false,
        [AdvancedSetting.ShowPerformance]: false,
        [AdvancedSetting.CameraNearClipping]: 0,
        [AdvancedSetting.CameraFarClipping]: 0,
        [AdvancedSetting.QualityPoints]: true,
        [AdvancedSetting.PointSize]: 1,
        [AdvancedSetting.MaxPointSize]: 20,
        [AdvancedSetting.PointToleranceFactor]: 0,
    },
    deviation: {
        mode: "mix" as "on" | "off" | "mix",
        colors: [] as {
            deviation: number;
            color: vec4;
        }[],
    },
};

type State = typeof initialState & {
    viewerSceneEditing?: {
        status: SceneEditStatus;
        id: string;
        title?: string;
        enabledFeatures?: WidgetKey[];
        requireAuth?: boolean;
        expiration?: string;
    };
};

export const renderSlice = createSlice({
    name: "render",
    initialState: initialState as State,
    reducers: {
        setMainObject: (state, action: PayloadAction<ObjectId | undefined>) => {
            state.mainObject = action.payload;
        },
        setEnvironment: (state, action: PayloadAction<EnvironmentDescription | undefined>) => {
            state.currentEnvironment = action.payload;
        },
        toggleDefaultVisibility: (state) => {
            switch (state.defaultVisibility) {
                case ObjectVisibility.Neutral:
                    state.defaultVisibility = ObjectVisibility.SemiTransparent;
                    break;
                case ObjectVisibility.SemiTransparent:
                    state.defaultVisibility = ObjectVisibility.Transparent;
                    break;
                case ObjectVisibility.Transparent:
                    state.defaultVisibility = ObjectVisibility.Neutral;
            }
        },
        setDefaultVisibility: (state, action: PayloadAction<ObjectVisibility>) => {
            state.defaultVisibility = action.payload;
        },
        toggleSelectMultiple: (state) => {
            state.selectMultiple = !state.selectMultiple;
        },
        toggleCameraSpeed: (state) => {
            switch (state.cameraSpeedMultiplier) {
                case CameraSpeedMultiplier.Slow:
                    state.cameraSpeedMultiplier = CameraSpeedMultiplier.Normal;
                    break;
                case CameraSpeedMultiplier.Normal:
                    state.cameraSpeedMultiplier = CameraSpeedMultiplier.Fast;
                    break;
                case CameraSpeedMultiplier.Fast:
                    state.cameraSpeedMultiplier = CameraSpeedMultiplier.Slow;
                    break;
            }
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
        setBookmarks: (state, action: PayloadAction<Bookmark[] | undefined>) => {
            state.bookmarks = action.payload as WritableBookmark[] | undefined;
        },
        setRenderType: (state, action: PayloadAction<State["renderType"]>) => {
            state.renderType = action.payload;
        },
        setSelectionBasketMode: (state, action: PayloadAction<State["selectionBasketMode"]>) => {
            state.selectionBasketMode = action.payload;
        },
        setClippingBox: (state, action: PayloadAction<Partial<ClippingPlanes>>) => {
            state.clippingBox = { ...state.clippingBox, ...action.payload };
        },
        resetClippingBox: (state) => {
            state.clippingBox = initialState.clippingBox;
        },
        setClippingPlanes: (state, action: PayloadAction<Partial<typeof initialState["clippingPlanes"]>>) => {
            state.clippingPlanes = { ...state.clippingPlanes, ...action.payload };
        },
        resetClippingPlanes: (state) => {
            state.clippingPlanes = initialState.clippingPlanes;
        },
        setMeasure: (state, action: PayloadAction<Partial<State["measure"]>>) => {
            state.measure = {
                ...state.measure,
                ...action.payload,
            };
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
            return { ...initialState, environments: state.environments, viewerSceneEditing: state.viewerSceneEditing };
        },
        setCamera: (state, { payload }: PayloadAction<CameraState>) => {
            state.camera = payload as WritableCameraState;
        },
        setBaseCameraSpeed: (state, { payload }: PayloadAction<number>) => {
            state.baseCameraSpeed = payload;
        },
        setSelectingOrthoPoint: (state, action: PayloadAction<boolean>) => {
            state.selectingOrthoPoint = action.payload;
        },
        setShowPerformance: (state, action: PayloadAction<boolean>) => {
            state.showPerformance = action.payload;
        },
        initViewerSceneEditing: (state, action: PayloadAction<string>) => {
            const { environments } = state;

            return {
                ...initialState,
                environments,
                viewerSceneEditing: { status: SceneEditStatus.Init, id: action.payload },
            };
        },
        setViewerSceneEditing: (state, action: PayloadAction<State["viewerSceneEditing"]>) => {
            state.viewerSceneEditing = action.payload;
        },
        setAdvancedSettings: (state, action: PayloadAction<Partial<State["advancedSettings"]>>) => {
            state.advancedSettings = {
                ...state.advancedSettings,
                ...action.payload,
            };
        },
        setDeviation: (state, action: PayloadAction<Partial<State["deviation"]>>) => {
            state.deviation = { ...state.deviation, ...action.payload };
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
export const selectDefaultVisibility = (state: RootState) => state.render.defaultVisibility;
export const selectSelectMultiple = (state: RootState) => state.render.selectMultiple;
export const selectCameraSpeedMultiplier = (state: RootState) => state.render.cameraSpeedMultiplier;
export const selectBaseCameraSpeed = (state: RootState) => state.render.baseCameraSpeed;
export const selectSavedCameraPositions = (state: RootState) => state.render.savedCameraPositions;
export const selectHomeCameraPosition = (state: RootState) => state.render.savedCameraPositions.positions[0];
export const selectBookmarks = (state: RootState) => state.render.bookmarks as ExtendedBookmark[] | undefined;
export const selectRenderType = (state: RootState) => state.render.renderType;
export const selectSelectionBasketMode = (state: RootState) => state.render.selectionBasketMode;
export const selectClippingBox = (state: RootState) => state.render.clippingBox;
export const selectMeasure = (state: RootState) => state.render.measure;
export const selectClippingPlanes = (state: RootState) => state.render.clippingPlanes;
export const selectCamera = (state: RootState) => state.render.camera as CameraState;
export const selectCameraType = (state: RootState) => state.render.camera.type;
export const selectSelectiongOrthoPoint = (state: RootState) => state.render.selectingOrthoPoint;
export const selectShowPerformance = (state: RootState) => state.render.showPerformance;
export const selectEditingScene = (state: RootState) => state.render.viewerSceneEditing;
export const selectAdvancedSettings = (state: RootState) => state.render.advancedSettings;
export const selectDeviation = (state: RootState) => state.render.deviation;

const { reducer, actions } = renderSlice;
export { reducer as renderReducer, actions as renderActions };
export type { State as RenderState };
