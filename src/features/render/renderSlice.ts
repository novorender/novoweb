import type {
    API,
    BoundingSphere,
    Camera,
    EnvironmentDescription,
    ObjectId,
    OrthoControllerParams,
    RenderSettings,
} from "@novorender/webgl-api";
import type { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { mat4, quat, vec3, vec4 } from "gl-matrix";

import type { RootState } from "app/store";
import { VecRGB, VecRGBA } from "utils/color";
import { defaultFlightControls } from "config/camera";
import { ViewMode } from "types/misc";

export const fetchEnvironments = createAsyncThunk("novorender/fetchEnvironments", async (api: API) => {
    const envs = await api.availableEnvironments("https://api.novorender.com/assets/env/index.json");
    return envs;
});

export enum CameraSpeedMultiplier {
    Slow = 0.2,
    Normal = 1,
    Fast = 5,
}

export enum ObjectVisibility {
    Neutral = "neutral",
    SemiTransparent = "semiTransparent",
    Transparent = "transparent",
}

export enum CameraType {
    Orthographic,
    Flight,
}

export enum SubtreeStatus {
    Unavailable,
    Shown,
    Hidden,
}

export enum AdvancedSetting {
    Taa = "taa",
    Ssao = "ssao",
    AutoFps = "autoFps",
    ShowBoundingBoxes = "showBoundingBoxes",
    DoubleSidedMaterials = "doubleSidedMaterials",
    DoubleSidedTransparentMaterials = "doubleSidedTransparentMaterials",
    HoldDynamic = "holdDynamic",
    ShowPerformance = "showPerformance",
    CameraNearClipping = "cameraNearClipping",
    CameraFarClipping = "cameraFarClipping",
    QualityPoints = "qualityPoints",
    PointSize = "pointSize",
    MaxPointSize = "maxPointSize",
    PointToleranceFactor = "pointToleranceFactor",
    HeadlightIntensity = "headlightIntensity",
    HeadlightDistance = "headlightDistance",
    AmbientLight = "ambientLight",
    NavigationCube = "navigationCube",
    TerrainAsBackground = "terrainAsBackground",
    MouseButtonMap = "mouseButtonMap",
    FingerMap = "fingerMap",
    BackgroundColor = "backgroundColor",
    TriangleLimit = "triangleLimit",
    SkyBoxBlur = "skyBoxBlur",
    SecondaryHighlight = "secondaryHighlight",
    PickSemiTransparentObjects = "pickSemiTransparentObjects",
}

export enum ProjectSetting {
    TmZone = "tmZone",
    DitioProjectNumber = "ditioProjectNumber",
    Jira = "jira",
    XsiteManage = "xsiteManage",
}

export enum SelectionBasketMode {
    Loose,
    Strict,
}

export enum Picker {
    Object,
    Measurement,
    FollowPathObject,
    ClippingPlane,
    OrthoPlane,
    CrossSection,
    Area,
    PointLine,
    HeightProfileEntity,
    Manhole,
}

export type Subtree = keyof NonNullable<State["subtrees"]>;

type CameraPosition = Pick<Camera, "position" | "rotation">;
export type ObjectGroups = { default: ObjectGroup; defaultHidden: ObjectGroup; custom: ObjectGroup[] };

// Redux toolkit with immer removes readonly modifier of state in the reducer so we get ts errors
// unless we cast the types to writable ones.
export type DeepWritable<T> = { -readonly [P in keyof T]: DeepWritable<T[P]> };
type CameraState =
    | {
          type: CameraType.Orthographic;
          params?: OrthoControllerParams;
          goTo?: { position: Camera["position"]; rotation: Camera["rotation"]; fieldOfView?: number };
          gridOrigo?: vec3;
      }
    | {
          type: CameraType.Flight;
          goTo?: { position: Camera["position"]; rotation: Camera["rotation"]; fieldOfView?: number };
          zoomTo?: BoundingSphere;
      };
type WritableCameraState = DeepWritable<CameraState>;
type WritableGrid = DeepWritable<RenderSettings["grid"]>;
export type ClippingBox = RenderSettings["clippingPlanes"] & {
    defining: boolean;
    baseBounds: RenderSettings["clippingPlanes"]["bounds"];
};
type WritableClippingBox = DeepWritable<ClippingBox>;
type SavedCameraPositions = { currentIndex: number; positions: CameraPosition[] };
type WritableSavedCameraPositions = DeepWritable<SavedCameraPositions>;

const initialState = {
    environments: [] as EnvironmentDescription[],
    currentEnvironment: undefined as EnvironmentDescription | undefined,
    mainObject: undefined as ObjectId | undefined,
    defaultVisibility: ObjectVisibility.Neutral,
    selectMultiple: false,
    baseCameraSpeed: 0.03,
    cameraSpeedMultiplier: CameraSpeedMultiplier.Normal,
    savedCameraPositions: { currentIndex: -1, positions: [] } as WritableSavedCameraPositions,
    subtrees: undefined as
        | undefined
        | {
              triangles: SubtreeStatus;
              lines: SubtreeStatus;
              terrain: SubtreeStatus;
              points: SubtreeStatus;
              documents: SubtreeStatus;
          },
    selectionBasketMode: SelectionBasketMode.Loose,
    selectionBasketColor: {
        color: [0, 0, 1, 1] as VecRGB | VecRGBA,
        use: false,
    },
    clippingBox: {
        defining: false,
        enabled: false,
        inside: true,
        showBox: false,
        highlight: -1,
        bounds: { min: [0, 0, 0], max: [0, 0, 0] },
        baseBounds: { min: [0, 0, 0], max: [0, 0, 0] },
    } as WritableClippingBox,
    clippingPlanes: {
        enabled: false,
        mode: "union" as "union" | "intersection",
        planes: [] as vec4[],
        baseW: 0,
    },
    camera: { type: CameraType.Flight } as WritableCameraState,
    advancedSettings: {
        [AdvancedSetting.Taa]: true,
        [AdvancedSetting.Ssao]: true,
        [AdvancedSetting.AutoFps]: true,
        [AdvancedSetting.ShowBoundingBoxes]: false,
        [AdvancedSetting.DoubleSidedMaterials]: false,
        [AdvancedSetting.DoubleSidedTransparentMaterials]: false,
        [AdvancedSetting.HoldDynamic]: false,
        [AdvancedSetting.ShowPerformance]: false,
        [AdvancedSetting.CameraNearClipping]: 0,
        [AdvancedSetting.CameraFarClipping]: 0,
        [AdvancedSetting.QualityPoints]: true,
        [AdvancedSetting.PointSize]: 1,
        [AdvancedSetting.MaxPointSize]: 20,
        [AdvancedSetting.PointToleranceFactor]: 0,
        [AdvancedSetting.HeadlightIntensity]: 0,
        [AdvancedSetting.HeadlightDistance]: 0,
        [AdvancedSetting.AmbientLight]: 0,
        [AdvancedSetting.NavigationCube]: false,
        [AdvancedSetting.TerrainAsBackground]: false,
        [AdvancedSetting.FingerMap]: defaultFlightControls.touch,
        [AdvancedSetting.MouseButtonMap]: defaultFlightControls.mouse,
        [AdvancedSetting.BackgroundColor]: [0.75, 0.75, 0.75, 1] as VecRGBA,
        [AdvancedSetting.TriangleLimit]: 0,
        [AdvancedSetting.SkyBoxBlur]: 0,
        [AdvancedSetting.SecondaryHighlight]: { property: "" },
        [AdvancedSetting.PickSemiTransparentObjects]: false,
    },
    defaultDeviceProfile: {} as any,
    gridDefaults: {
        enabled: false,
        majorLineCount: 1001,
        minorLineCount: 4,
        majorColor: [0.15, 0.15, 0.15] as [number, number, number],
        minorColor: [0.65, 0.65, 0.65] as [number, number, number],
    },
    grid: {
        enabled: false,
        majorLineCount: 1001,
        minorLineCount: 4,
        origo: [0, 0, 0],
        axisX: [0, 0, 0],
        axisY: [0, 0, 0],
        majorColor: [0, 0, 0],
        minorColor: [0, 0, 0],
    } as WritableGrid,
    projectSettings: {
        [ProjectSetting.TmZone]: "",
        [ProjectSetting.DitioProjectNumber]: "",
        [ProjectSetting.Jira]: { space: "", project: "", component: "" },
        [ProjectSetting.XsiteManage]: { siteId: "" },
    },
    picker: Picker.Object,
    viewMode: ViewMode.Regular,
    loadingHandles: [] as number[],
    deviationStamp: null as null | {
        mouseX: number;
        mouseY: number;
        data: {
            deviation: number;
        };
    },
};

type State = typeof initialState;

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
                .concat({
                    position: vec3.clone(action.payload.position),
                    rotation: vec4.clone(action.payload.rotation),
                });
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.positions.length - 1;
        },
        undoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex - 1;
        },
        redoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex + 1;
        },
        setHomeCameraPos: (state, action: PayloadAction<CameraPosition>) => {
            state.savedCameraPositions.positions[0] = {
                position: vec3.clone(action.payload.position),
                rotation: vec4.clone(action.payload.rotation),
            };
        },
        setDefaultDeviceProfile: (state, action: PayloadAction<State["defaultDeviceProfile"]>) => {
            state.defaultDeviceProfile = action.payload;
        },
        setSubtrees: (state, action: PayloadAction<State["subtrees"]>) => {
            state.subtrees = action.payload;
        },
        toggleSubtree: (state, action: PayloadAction<{ subtree: Subtree; newState?: SubtreeStatus }>) => {
            if (!state.subtrees || state.subtrees[action.payload.subtree] === SubtreeStatus.Unavailable) {
                return;
            }

            state.subtrees[action.payload.subtree] =
                action.payload.newState ?? state.subtrees[action.payload.subtree] === SubtreeStatus.Shown
                    ? SubtreeStatus.Hidden
                    : SubtreeStatus.Shown;
        },
        setSubtreesFromBookmark: (state, action: PayloadAction<Required<Bookmark>["subtrees"]>) => {
            if (!state.subtrees) {
                return;
            }

            state.subtrees.lines =
                state.subtrees.lines !== SubtreeStatus.Unavailable
                    ? action.payload.lines
                        ? SubtreeStatus.Shown
                        : SubtreeStatus.Hidden
                    : state.subtrees.lines;

            state.subtrees.points =
                state.subtrees.points !== SubtreeStatus.Unavailable
                    ? action.payload.points
                        ? SubtreeStatus.Shown
                        : SubtreeStatus.Hidden
                    : state.subtrees.points;

            state.subtrees.terrain =
                state.subtrees.terrain !== SubtreeStatus.Unavailable
                    ? action.payload.terrain
                        ? SubtreeStatus.Shown
                        : SubtreeStatus.Hidden
                    : state.subtrees.terrain;

            state.subtrees.triangles =
                state.subtrees.triangles !== SubtreeStatus.Unavailable
                    ? action.payload.triangles
                        ? SubtreeStatus.Shown
                        : SubtreeStatus.Hidden
                    : state.subtrees.triangles;

            state.subtrees.documents =
                state.subtrees.documents !== SubtreeStatus.Unavailable
                    ? action.payload.documents
                        ? SubtreeStatus.Shown
                        : SubtreeStatus.Hidden
                    : state.subtrees.documents;
        },
        disableAllSubtrees: (state) => {
            state.subtrees = {
                terrain: SubtreeStatus.Unavailable,
                triangles: SubtreeStatus.Unavailable,
                lines: SubtreeStatus.Unavailable,
                points: SubtreeStatus.Unavailable,
                documents: SubtreeStatus.Unavailable,
            };
        },
        setSelectionBasketMode: (state, action: PayloadAction<State["selectionBasketMode"]>) => {
            state.selectionBasketMode = action.payload;
        },
        setSelectionBasketColor: (state, action: PayloadAction<Partial<State["selectionBasketColor"]>>) => {
            state.selectionBasketColor = { ...state.selectionBasketColor, ...action.payload };
        },
        setClippingBox: (state, action: PayloadAction<Partial<ClippingBox>>) => {
            if (action.payload.enabled) {
                state.clippingPlanes.enabled = false;
            }

            state.clippingBox = { ...state.clippingBox, ...action.payload } as WritableClippingBox;
        },
        resetClippingBox: (state) => {
            state.clippingBox = initialState.clippingBox;
        },
        setClippingPlanes: (state, action: PayloadAction<Partial<(typeof initialState)["clippingPlanes"]>>) => {
            if (action.payload.enabled) {
                state.clippingBox.enabled = false;
            }

            state.clippingPlanes = { ...state.clippingPlanes, ...action.payload };
        },
        resetClippingPlanes: (state) => {
            state.clippingPlanes = initialState.clippingPlanes;
        },
        resetState: (state) => {
            return {
                ...initialState,
                defaultDeviceProfile: state.defaultDeviceProfile,
                environments: state.environments,
                projectSettings: state.projectSettings,
                savedCameraPositions: { currentIndex: 0, positions: [state.savedCameraPositions.positions[0]] },
            };
        },
        setCamera: (state, { payload }: PayloadAction<CameraState>) => {
            const goTo =
                "goTo" in payload && payload.goTo
                    ? {
                          ...payload.goTo,
                          position: Array.from(payload.goTo.position) as vec3,
                          rotation: Array.from(payload.goTo.rotation) as quat,
                      }
                    : undefined;

            const zoomTo =
                "zoomTo" in payload && payload.zoomTo
                    ? {
                          center: Array.from(payload.zoomTo.center) as vec3,
                          radius: payload.zoomTo.radius,
                      }
                    : undefined;

            const params =
                "params" in payload && payload.params
                    ? {
                          ...payload.params,
                          ...(payload.params.referenceCoordSys
                              ? { referenceCoordSys: Array.from(payload.params.referenceCoordSys) as mat4 }
                              : {}),
                          ...(payload.params.position ? { position: Array.from(payload.params.position) as vec3 } : {}),
                      }
                    : undefined;

            state.camera = {
                ...payload,
                ...(goTo ? { goTo } : {}),
                ...(zoomTo ? { zoomTo } : {}),
                ...(params ? { params } : {}),
            } as WritableCameraState;
        },
        setBaseCameraSpeed: (state, { payload }: PayloadAction<number>) => {
            state.baseCameraSpeed = payload;
        },
        setAdvancedSettings: (state, action: PayloadAction<Partial<State["advancedSettings"]>>) => {
            state.advancedSettings = {
                ...state.advancedSettings,
                ...action.payload,
            };
        },
        setProjectSettings: (state, action: PayloadAction<Partial<State["projectSettings"]>>) => {
            state.projectSettings = {
                ...state.projectSettings,
                ...action.payload,
            };
        },
        setGridDefaults: (state, action: PayloadAction<Partial<State["gridDefaults"]>>) => {
            state.gridDefaults = { ...state.gridDefaults, ...action.payload };
            state.grid = { ...state.grid, ...state.gridDefaults };
        },
        setGrid: (state, action: PayloadAction<Partial<State["grid"]>>) => {
            state.grid = {
                ...state.grid,
                ...state.gridDefaults,
                enabled: state.grid.enabled,
                ...action.payload,
            } as WritableGrid;
        },
        setPicker: (state, action: PayloadAction<State["picker"]>) => {
            state.picker = action.payload;
        },
        stopPicker: (state, action: PayloadAction<State["picker"]>) => {
            if (action.payload === state.picker) {
                state.picker = Picker.Object;
            }
        },
        setViewMode: (state, action: PayloadAction<State["viewMode"]>) => {
            state.viewMode = action.payload;
        },
        addLoadingHandle: (state, action: PayloadAction<State["loadingHandles"][number]>) => {
            state.loadingHandles.push(action.payload);
        },
        removeLoadingHandle: (state, action: PayloadAction<State["loadingHandles"][number]>) => {
            state.loadingHandles = state.loadingHandles.filter((handle) => handle !== action.payload);
        },
        setDeviationStamp: (state, action: PayloadAction<State["deviationStamp"]>) => {
            state.deviationStamp = action.payload;
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
export const selectSavedCameraPositions = (state: RootState) =>
    state.render.savedCameraPositions as SavedCameraPositions;
export const selectHomeCameraPosition = (state: RootState) =>
    state.render.savedCameraPositions.positions[0] as CameraPosition;
export const selectSubtrees = (state: RootState) => state.render.subtrees;
export const selectSelectionBasketMode = (state: RootState) => state.render.selectionBasketMode;
export const selectSelectionBasketColor = (state: RootState) => state.render.selectionBasketColor;
export const selectClippingBox = (state: RootState) => state.render.clippingBox as ClippingBox;
export const selectClippingPlanes = (state: RootState) => state.render.clippingPlanes;
export const selectCamera = (state: RootState) => state.render.camera as CameraState;
export const selectCameraType = (state: RootState) => state.render.camera.type;
export const selectAdvancedSettings = (state: RootState) => state.render.advancedSettings;
export const selectSecondaryHighlightProperty = (state: RootState) =>
    state.render.advancedSettings.secondaryHighlight.property;
export const selectProjectSettings = (state: RootState) => state.render.projectSettings;
export const selectGridDefaults = (state: RootState) => state.render.gridDefaults;
export const selectGrid = (state: RootState) => state.render.grid as RenderSettings["grid"];
export const selectPicker = (state: RootState) => state.render.picker;
export const selectDefaultDeviceProfile = (state: RootState) => state.render.defaultDeviceProfile;
export const selectViewMode = (state: RootState) => state.render.viewMode;
export const selectLoadingHandles = (state: RootState) => state.render.loadingHandles;
export const selectDeviationStamp = (state: RootState) => state.render.deviationStamp;

const { reducer, actions } = renderSlice;
export { reducer as renderReducer, actions as renderActions };
export type { State as RenderState };