import type {
    API,
    BoundingSphere,
    Camera,
    EnvironmentDescription,
    FlightControllerParams,
    ObjectId,
    OrthoControllerParams,
    RenderSettings,
} from "@novorender/webgl-api";
import type { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { createSlice, createAsyncThunk, PayloadAction, createAction } from "@reduxjs/toolkit";
import { mat4, quat, vec3, vec4 } from "gl-matrix";
import { SceneConfig as OctreeSceneConfig } from "@novorender/web_app";

import type { RootState } from "app/store";
import { VecRGB, VecRGBA } from "utils/color";
import { defaultFlightControls } from "config/camera";
import { AsyncState, AsyncStatus, ViewMode } from "types/misc";
import { LogPoint, MachineLocation } from "features/xsiteManage";

import { getCustomProperties } from "./render";
import { SceneConfig } from "./hooks/useHandleInit";
import { getSubtrees } from "./utils";

export const initScene = createAction<{
    sceneData: Omit<SceneConfig, "db" | "url">;
    octreeSceneConfig: OctreeSceneConfig;
    initialCamera: {
        position: vec3;
        rotation: quat;
    };
}>("initScene");

export const fetchEnvironments = createAsyncThunk("novorender/fetchEnvironments", async (api: API) => {
    const envs = await api.availableEnvironments("https://api.novorender.com/assets/env/index.json");
    return envs;
});

export enum CameraSpeedLevel {
    Slow = "slow",
    Default = "default",
    Fast = "fast",
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
    ClippingBox,
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
export type DeepMutable<T> = { -readonly [P in keyof T]: DeepMutable<T[P]> };
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
type MutableCameraState = DeepMutable<CameraState>;
type MutableGrid = DeepMutable<RenderSettings["grid"]>;
export type ClippingBox = RenderSettings["clippingPlanes"] & {
    defining: boolean;
    baseBounds: RenderSettings["clippingPlanes"]["bounds"];
};
type MutableClippingBox = DeepMutable<ClippingBox>;
type SavedCameraPositions = { currentIndex: number; positions: CameraPosition[] };
type MutableSavedCameraPositions = DeepMutable<SavedCameraPositions>;

export enum StampKind {
    LogPoint,
    MachineLocation,
    Deviation,
    CanvasContextMenu,
    Properties,
}

type LogPointStamp = {
    kind: StampKind.LogPoint;
    data: {
        logPoint: LogPoint;
    };
};

type MachineLocationStamp = {
    kind: StampKind.MachineLocation;
    data: {
        location: MachineLocation;
    };
};

type DeviationStamp = {
    kind: StampKind.Deviation;
    data: {
        deviation: number;
    };
};

type CanvasContextMenuStamp = {
    kind: StampKind.CanvasContextMenu;
    data: {
        object: number;
        position: Vec3;
        normal: Vec3 | undefined;
    };
};

type PropertiesStamp = {
    kind: StampKind.Properties;
    properties: [key: string, value: string][];
};

type Stamp = { mouseX: number; mouseY: number; pinned: boolean } & (
    | LogPointStamp
    | MachineLocationStamp
    | DeviationStamp
    | CanvasContextMenuStamp
    | PropertiesStamp
);

const initialState = {
    sceneStatus: { status: AsyncStatus.Initial } as AsyncState<void>,
    environments: [] as EnvironmentDescription[],
    currentEnvironment: undefined as EnvironmentDescription | undefined,
    mainObject: undefined as ObjectId | undefined,
    defaultVisibility: ObjectVisibility.Neutral,
    selectMultiple: false,
    cameraSpeedLevels: {
        flight: {
            [CameraSpeedLevel.Slow]: 0.01,
            [CameraSpeedLevel.Default]: 0.03,
            [CameraSpeedLevel.Fast]: 0.15,
        },
    },
    proportionalCameraSpeed: {
        enabled: true,
        min: 5,
        max: 300,
        pickDelay: 500,
    } as NonNullable<FlightControllerParams["proportionalCameraSpeed"]> & { enabled: boolean },
    pointerLock: {
        ortho: false,
    },
    currentCameraSpeedLevel: CameraSpeedLevel.Default,
    savedCameraPositions: { currentIndex: -1, positions: [] } as MutableSavedCameraPositions,
    subtrees: {
        triangles: SubtreeStatus.Unavailable,
        lines: SubtreeStatus.Unavailable,
        terrain: SubtreeStatus.Unavailable,
        points: SubtreeStatus.Unavailable,
        documents: SubtreeStatus.Unavailable,
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
    } as MutableClippingBox,
    clippingPlanes: {
        enabled: false,
        mode: "union" as "union" | "intersection",
        planes: [] as {
            plane: Vec4;
            baseW: number;
        }[],
    },
    camera: { type: CameraType.Flight } as MutableCameraState,
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
        // [AdvancedSetting.BackgroundColor]: [0.75, 0.75, 0.75, 1] as VecRGBA,
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
        majorColor: [0.15, 0.15, 0.15] as Vec3,
        minorColor: [0.65, 0.65, 0.65] as Vec3,
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
    } as MutableGrid,
    projectSettings: {
        [ProjectSetting.TmZone]: "",
        [ProjectSetting.DitioProjectNumber]: "",
        [ProjectSetting.Jira]: { space: "", project: "", component: "" },
        [ProjectSetting.XsiteManage]: { siteId: "" },
    },
    picker: Picker.Object,
    viewMode: ViewMode.Default,
    loadingHandles: [] as number[],
    stamp: null as null | Stamp,
    pointerDownState: undefined as
        | undefined
        | {
              timestamp: number;
              x: number;
              y: number;
          },

    // NEW
    background: {
        environments: { status: AsyncStatus.Initial } as AsyncState<EnvironmentDescription[]>,
        color: [0, 0, 0, 1] as vec4,
        url: "",
        blur: 0,
    },
    points: {
        size: {
            pixel: 1,
            maxPixel: 1,
            metric: 1,
            toleranceFactor: 1,
        },
        deviation: {
            index: 0,
            mixFactor: 1,
            colorGradient: {
                knots: [] as any[], // TODO
            },
        },
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
        setEnvironments: (state, action: PayloadAction<EnvironmentDescription[]>) => {
            state.environments = action.payload;
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
            switch (state.currentCameraSpeedLevel) {
                case CameraSpeedLevel.Slow:
                    state.currentCameraSpeedLevel = CameraSpeedLevel.Default;
                    break;
                case CameraSpeedLevel.Default:
                    state.currentCameraSpeedLevel = CameraSpeedLevel.Fast;
                    break;
                case CameraSpeedLevel.Fast:
                    state.currentCameraSpeedLevel = CameraSpeedLevel.Slow;
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
                    rotation: quat.clone(action.payload.rotation),
                });
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.positions.length - 1;
        },
        undoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex - 1;
            state.camera = {
                type: CameraType.Flight,
                goTo: state.savedCameraPositions.positions[state.savedCameraPositions.currentIndex],
            };
        },
        redoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex + 1;
            state.camera = {
                type: CameraType.Flight,
                goTo: state.savedCameraPositions.positions[state.savedCameraPositions.currentIndex],
            };
        },
        setHomeCameraPos: (state, action: PayloadAction<CameraPosition>) => {
            state.savedCameraPositions.positions[0] = {
                position: vec3.clone(action.payload.position),
                rotation: quat.clone(action.payload.rotation),
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

            state.clippingBox = { ...state.clippingBox, ...action.payload } as MutableClippingBox;
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
        addClippingPlane: (state, action: PayloadAction<(typeof initialState)["clippingPlanes"]["planes"][number]>) => {
            state.clippingBox.enabled = false;
            state.clippingPlanes.enabled = true;

            if (state.clippingPlanes.planes.length < 6) {
                state.clippingPlanes.planes.push(action.payload);
            }
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
                cameraSpeedLevels: state.cameraSpeedLevels,
                currentCameraSpeedLevel: state.currentCameraSpeedLevel,
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
            } as MutableCameraState;
        },
        setCameraSpeedLevels: (state, { payload }: PayloadAction<Partial<State["cameraSpeedLevels"]>>) => {
            state.cameraSpeedLevels = { ...state.cameraSpeedLevels, ...payload };
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
            } as MutableGrid;
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
        setStamp: (state, action: PayloadAction<State["stamp"]>) => {
            state.stamp = action.payload;
        },
        setPointerLock: (state, action: PayloadAction<Partial<State["pointerLock"]>>) => {
            state.pointerLock = { ...state.pointerLock, ...action.payload };
        },
        setProportionalCameraSpeed: (state, action: PayloadAction<Partial<State["proportionalCameraSpeed"]>>) => {
            state.proportionalCameraSpeed = { ...state.proportionalCameraSpeed, ...action.payload };
        },
        setPointerDownState: (state, action: PayloadAction<State["pointerDownState"]>) => {
            state.pointerDownState = action.payload;
        },
        setBackground: (state, action: PayloadAction<Partial<State["background"]>>) => {
            state.background = { ...state.background, ...action.payload };
        },
        setSceneStatus: (state, action: PayloadAction<State["sceneStatus"]>) => {
            state.sceneStatus = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(initScene, (state, action) => {
            const {
                sceneData: { customProperties, settings, environment },
                octreeSceneConfig,
                initialCamera,
            } = action.payload;

            const _props = getCustomProperties(customProperties);

            // init props

            if (!settings) {
                return;
            }

            // Home position
            state.savedCameraPositions.positions[0] = initialCamera;
            state.savedCameraPositions.currentIndex = 0;

            // background
            state.background.color = settings.background.color ?? state.background.color;
            state.background.blur = settings.background.skyBoxBlur ?? state.background.blur;
            state.background.url = environment ?? state.background.url;

            // points
            state.points.size.pixel = settings.points.size.pixel ?? state.points.size.pixel;
            state.points.size.maxPixel = settings.points.size.maxPixel ?? state.points.size.maxPixel;
            state.points.size.metric = settings.points.size.metric ?? state.points.size.metric;
            state.points.size.toleranceFactor =
                settings.points.size.toleranceFactor ?? state.points.size.toleranceFactor;

            // deviations
            state.points.deviation.index = settings.points.deviation.index;
            state.points.deviation.mixFactor =
                settings.points.deviation.mode === "mix" ? 1 : settings.points.deviation.mode === "on" ? 0.5 : 0; // TODO map mode to mixFactor?
            state.points.deviation.colorGradient = {
                knots: settings.points.deviation.colors.map((deviation) => ({
                    color: deviation.color,
                    position: deviation.deviation,
                })),
            };

            // subtrees
            state.subtrees = getSubtrees(
                settings.advanced,
                octreeSceneConfig.subtrees ?? ["triangles", "points", "terrain"]
            ); // TODO ["triangles"]
        });
    },
});

export const selectMainObject = (state: RootState) => state.render.mainObject;
export const selectEnvironments = (state: RootState) => state.render.environments;
export const selectCurrentEnvironment = (state: RootState) => state.render.currentEnvironment;
export const selectDefaultVisibility = (state: RootState) => state.render.defaultVisibility;
export const selectSelectMultiple = (state: RootState) => state.render.selectMultiple;
export const selectCameraSpeedLevels = (state: RootState) => state.render.cameraSpeedLevels;
export const selectCurrentCameraSpeedLevel = (state: RootState) => state.render.currentCameraSpeedLevel;
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
export const selectStamp = (state: RootState) => state.render.stamp;
export const selectPointerLock = (state: RootState) => state.render.pointerLock;
export const selectProportionalCameraSpeed = (state: RootState) => state.render.proportionalCameraSpeed;
export const selectPointerDownState = (state: RootState) => state.render.pointerDownState;
export const selectBackground = (state: RootState) => state.render.background;
export const selectSceneStatus = (state: RootState) => state.render.sceneStatus;

const { reducer } = renderSlice;
const actions = { ...renderSlice.actions, initScene };
export { reducer as renderReducer, actions as renderActions };
export type { State as RenderState };
