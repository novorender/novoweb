import type { Bookmark, ObjectGroup } from "@novorender/data-js-api";
import { ClippingMode, SceneConfig as OctreeSceneConfig, RecursivePartial, TonemappingMode } from "@novorender/web_app";
import type { BoundingSphere, Camera, EnvironmentDescription, ObjectId, RenderSettings } from "@novorender/webgl-api";
import { PayloadAction, createAction, createSlice } from "@reduxjs/toolkit";
import { quat, vec3, vec4 } from "gl-matrix";

import type { RootState } from "app/store";
import { LogPoint, MachineLocation } from "features/xsiteManage";
import { AsyncState, AsyncStatus, ViewMode } from "types/misc";
import { VecRGB, VecRGBA } from "utils/color";
import { mergeRecursive } from "utils/misc";

import { SceneConfig } from "./hooks/useHandleInit";
import { getLegacySubtrees, getSubtrees } from "./utils";

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
    Pinhole,
}

export enum SubtreeStatus {
    Unavailable,
    Shown,
    Hidden,
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
          goTo?: { position: Camera["position"]; rotation: Camera["rotation"]; fov?: number };
          gridOrigo?: vec3;
      }
    | {
          type: CameraType.Pinhole;
          goTo?: { position: Camera["position"]; rotation: Camera["rotation"]; fov?: number };
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
    mainObject: undefined as ObjectId | undefined,
    defaultVisibility: ObjectVisibility.Neutral,
    selectMultiple: false,
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
    camera: { type: CameraType.Pinhole } as MutableCameraState,
    defaultDeviceProfile: {} as any,
    gridDefaults: {
        size1: 1001,
        size2: 4,
        color: [0.15, 0.15, 0.15],
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
    clipping: {
        enabled: false,
        mode: ClippingMode.union,
        planes: [] as {
            plane: vec4;
            baseW: number;
        }[],
    },
    grid: {
        enabled: false,
        color: [0.15, 0.15, 0.15] as vec3,
        origin: [0, 0, 0] as vec3,
        axisX: [0, 0, 0] as vec3,
        axisY: [0, 0, 0] as vec3,
        size1: 1001,
        size2: 4,
        distance: 0,
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
    terrain: {
        asBackground: false,
        elevationGradient: {
            knots: [] as { position: number; color: VecRGB }[],
        },
    },
    secondaryHighlight: {
        property: "",
    },
    project: {
        tmZone: "",
    },
    cameraDefaults: {
        pinhole: {
            controller: "flight" as "flight" | "cad",
            clipping: {
                near: 0.1,
                far: 1000,
            },
            speedLevels: {
                slow: 0.01,
                default: 0.03,
                fast: 0.15,
            },
            proportionalSpeed: {
                enabled: false,
                min: 5,
                max: 300,
            },
        },
        orthographic: {
            controller: "ortho" as const,
            clipping: {
                near: -0.1,
                far: 1000,
            },
            usePointerLock: false,
            topDownElevation: undefined as undefined | number,
        },
    },
    advanced: {
        dynamicResolutionScaling: true, // todo?
        msaa: {
            enabled: true,
            samples: 16,
        },
        toonOutline: {
            enabled: true,
            color: [0, 0, 0] as VecRGB,
        },
        outlines: {
            enabled: false,
            color: [10, 10, 10] as VecRGB,
            plane: [0, -1, 0, 0] as vec4,
        },
        tonemapping: {
            exposure: 0.5,
            mode: TonemappingMode.color,
        },
        pick: {
            opacityThreshold: 1,
        },
        limits: {
            maxPrimitives: 5_000_000,
        },
        // NOTE(OLA): Debug props should not be saved
        debug: {
            showNodeBounds: false,
        },
    },
    deviceProfile: {
        debugProfile: false,
        isMobile: false,
        tier: -1,
        features: {
            outline: true,
        },
        limits: {
            maxGPUBytes: 2_000_000_000,
            maxPrimitives: 10_000_000,
            maxSamples: 4,
        },
        quirks: {
            iosShaderBug: false,
        },
        detailBias: 0.6,
        renderResolution: 1,
        framerateTarget: 30,
    },
    navigationCube: {
        enabled: false,
    },
    debugStats: {
        enabled: false,
    },
};

type State = typeof initialState;

export const initScene = createAction<{
    sceneData: Omit<SceneConfig, "db" | "url">;
    sceneConfig: OctreeSceneConfig;
    initialCamera: {
        kind: "pinhole" | "orthographic";
        position: vec3;
        rotation: quat;
        fov: number;
    };
    deviceProfile: RecursivePartial<State["deviceProfile"]>;
}>("initScene");

export const resetView = createAction<{
    sceneData: Omit<SceneConfig, "db" | "url">;
    initialCamera?: {
        kind: "pinhole" | "orthographic";
        position: vec3;
        rotation: quat;
        fov: number;
    };
}>("resetView");

export const renderSlice = createSlice({
    name: "render",
    initialState: initialState as State,
    reducers: {
        setMainObject: (state, action: PayloadAction<ObjectId | undefined>) => {
            state.mainObject = action.payload;
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
                type: CameraType.Pinhole,
                goTo: state.savedCameraPositions.positions[state.savedCameraPositions.currentIndex],
            };
        },
        redoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex + 1;
            state.camera = {
                type: CameraType.Pinhole,
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
        // setClippingBox: (state, action: PayloadAction<Partial<ClippingBox>>) => {
        //     if (action.payload.enabled) {
        //         state.clippingPlanes.enabled = false;
        //     }

        //     state.clippingBox = { ...state.clippingBox, ...action.payload } as MutableClippingBox;
        // },
        // resetClippingBox: (state) => {
        //     state.clippingBox = initialState.clippingBox;
        // },
        // setClippingPlanes: (state, action: PayloadAction<Partial<(typeof initialState)["clippingPlanes"]>>) => {
        //     if (action.payload.enabled) {
        //         state.clippingBox.enabled = false;
        //     }

        //     state.clippingPlanes = { ...state.clippingPlanes, ...action.payload };
        // },
        // addClippingPlane: (state, action: PayloadAction<(typeof initialState)["clippingPlanes"]["planes"][number]>) => {
        //     state.clippingBox.enabled = false;
        //     state.clippingPlanes.enabled = true;

        //     if (state.clippingPlanes.planes.length < 6) {
        //         state.clippingPlanes.planes.push(action.payload);
        //     }
        // },
        // resetClippingPlanes: (state) => {
        //     state.clippingPlanes = initialState.clippingPlanes;
        // },
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

            state.camera = {
                ...payload,
                ...(goTo ? { goTo } : {}),
                ...(zoomTo ? { zoomTo } : {}),
            } as MutableCameraState;
        },
        setGridDefaults: (state, action: PayloadAction<Partial<State["gridDefaults"]>>) => {
            // state.gridDefaults = { ...state.gridDefaults, ...action.payload };
            // state.grid = { ...state.grid, ...state.gridDefaults };
        },
        setGrid: (state, action: PayloadAction<RecursivePartial<State["grid"]>>) => {
            state.grid = mergeRecursive(state.grid, action.payload);
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
        setPointerDownState: (state, action: PayloadAction<State["pointerDownState"]>) => {
            state.pointerDownState = action.payload;
        },
        setPoints: (state, action: PayloadAction<RecursivePartial<State["points"]>>) => {
            state.points = mergeRecursive(state.points, action.payload);
        },
        setBackground: (state, action: PayloadAction<Partial<State["background"]>>) => {
            state.background = { ...state.background, ...action.payload };
        },
        setTerrain: (state, action: PayloadAction<Partial<State["terrain"]>>) => {
            state.terrain = { ...state.terrain, ...action.payload };
        },
        setSecondaryHighlight: (state, action: PayloadAction<Partial<State["secondaryHighlight"]>>) => {
            state.secondaryHighlight = { ...state.secondaryHighlight, ...action.payload };
        },
        setSceneStatus: (state, action: PayloadAction<State["sceneStatus"]>) => {
            state.sceneStatus = action.payload;
        },
        setCameraDefaults: (state, action: PayloadAction<RecursivePartial<State["cameraDefaults"]>>) => {
            state.cameraDefaults = mergeRecursive(state.cameraDefaults, action.payload);
        },
        setAdvanced: (state, action: PayloadAction<RecursivePartial<State["advanced"]>>) => {
            state.advanced = mergeRecursive(state.advanced, action.payload);
        },
        setDeviceProfile: (state, action: PayloadAction<RecursivePartial<State["deviceProfile"]>>) => {
            state.deviceProfile = mergeRecursive(state.deviceProfile, action.payload);
        },
        setProject: (state, action: PayloadAction<RecursivePartial<State["project"]>>) => {
            state.project = mergeRecursive(state.project, action.payload);
        },
        setNavigationCube: (state, action: PayloadAction<RecursivePartial<State["navigationCube"]>>) => {
            state.navigationCube = mergeRecursive(state.navigationCube, action.payload);
        },
        setDebugStats: (state, action: PayloadAction<RecursivePartial<State["debugStats"]>>) => {
            state.debugStats = mergeRecursive(state.debugStats, action.payload);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(initScene, (state, action) => {
            const {
                sceneData: { customProperties: props, settings, tmZone, ...sceneData },
                sceneConfig,
                initialCamera,
                deviceProfile,
            } = action.payload;

            // Init camera
            state.camera.type = initialCamera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole;
            state.camera.goTo = initialCamera;
            state.savedCameraPositions.positions[0] = initialCamera;
            state.savedCameraPositions.currentIndex = 0;

            // project
            state.project.tmZone = tmZone ?? state.project.tmZone;

            // device profile
            state.deviceProfile = mergeRecursive(state.deviceProfile, deviceProfile);

            if (props.v1) {
                const { points, background, terrain, hide, ...advanced } = props.v1.renderSettings;
                const { debugStats, navigationCube } = props.v1.features;
                const camera = props.v1.camera;

                state.cameraDefaults.pinhole = camera.pinhole;
                state.cameraDefaults.orthographic = camera.orthographic;
                state.background = mergeRecursive(state.background, background);
                state.points = points;
                state.subtrees = getSubtrees(hide, sceneConfig.subtrees ?? ["triangles"]);
                state.terrain = terrain;
                state.advanced = mergeRecursive(state.advanced, advanced);
                state.debugStats = debugStats;
                state.navigationCube = navigationCube;
            } else if (settings) {
                // Legacy settings

                state.cameraDefaults.pinhole.clipping.far = Math.max((sceneData.camera as any)?.far ?? 0, 1000);
                state.cameraDefaults.pinhole.clipping.far = Math.max((sceneData.camera as any)?.near ?? 0, 0.1);
                state.secondaryHighlight.property = props.highlights?.secondary.property ?? "";

                // background
                state.background.color = settings.background.color ?? state.background.color;
                state.background.blur = (settings.background as any).skyBoxBlur ?? state.background.blur;
                state.background.url = settings.environment
                    ? `https://api.novorender.com/assets/env/${settings.environment}/`
                    : state.background.url;

                // points
                state.points.size = mergeRecursive(state.points.size, settings.points.size);
                state.points.deviation.index = (settings.points.deviation as any).index;
                state.points.deviation.mixFactor =
                    settings.points.deviation.mode === "mix" ? 1 : settings.points.deviation.mode === "on" ? 0.5 : 0; // TODO map mode to mixFactor?
                state.points.deviation.colorGradient = {
                    knots: settings.points.deviation.colors.map((deviation) => ({
                        color: deviation.color,
                        position: deviation.deviation,
                    })),
                };

                // subtrees
                state.subtrees = getLegacySubtrees(settings.advanced, sceneConfig.subtrees ?? ["triangles"]);

                // terrain
                state.terrain.asBackground = settings.terrain.asBackground;
                state.terrain.elevationGradient = {
                    knots: settings.terrain.elevationColors.map((node) => ({
                        position: node.elevation,
                        color: node.color,
                    })),
                };
            }
        });
        builder.addCase(resetView, (state, action) => {
            const {
                initialCamera,
                sceneData: { settings, customProperties: props },
            } = action.payload;

            // Highlight
            state.defaultVisibility = ObjectVisibility.Neutral;

            // Camera
            if (initialCamera) {
                // todo support ortho
                state.camera.type =
                    initialCamera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole;
                state.camera.goTo = initialCamera;
                state.savedCameraPositions = {
                    positions: [initialCamera],
                    currentIndex: 0,
                };
            }

            const availableSubtrees = Object.keys(state.subtrees).filter(
                (key: any) => state.subtrees[key as keyof State["subtrees"]] !== SubtreeStatus.Unavailable
            );

            if (props.v1) {
                const { points, background, terrain, hide } = props.v1.renderSettings;

                // background
                state.background.color = background.color;

                // deviations
                state.points.deviation.index = points.deviation.index;
                state.points.deviation.mixFactor = points.deviation.mixFactor;

                // subtrees
                state.subtrees = getSubtrees(hide, availableSubtrees);

                // terrain
                state.terrain.asBackground = terrain.asBackground;
            } else if (settings) {
                // background
                state.background.color = settings.background.color ?? state.background.color;

                // deviations
                state.points.deviation.index = (settings.points.deviation as any).index;
                state.points.deviation.mixFactor =
                    settings.points.deviation.mode === "mix" ? 1 : settings.points.deviation.mode === "on" ? 0.5 : 0; // TODO map mode to mixFactor?

                // subtrees
                state.subtrees = getLegacySubtrees(settings.advanced, availableSubtrees);

                // terrain
                state.terrain.asBackground = settings.terrain.asBackground;
            }
        });
    },
});

export const selectMainObject = (state: RootState) => state.render.mainObject;
export const selectDefaultVisibility = (state: RootState) => state.render.defaultVisibility;
export const selectSelectMultiple = (state: RootState) => state.render.selectMultiple;
export const selectCameraSpeedLevels = (state: RootState) => state.render.cameraDefaults.pinhole.speedLevels;
export const selectCurrentCameraSpeedLevel = (state: RootState) => state.render.currentCameraSpeedLevel;
export const selectSavedCameraPositions = (state: RootState) =>
    state.render.savedCameraPositions as SavedCameraPositions;
export const selectHomeCameraPosition = (state: RootState) =>
    state.render.savedCameraPositions.positions[0] as CameraPosition;
export const selectSubtrees = (state: RootState) => state.render.subtrees;
export const selectSelectionBasketMode = (state: RootState) => state.render.selectionBasketMode;
export const selectSelectionBasketColor = (state: RootState) => state.render.selectionBasketColor;
export const selectClippingBox = (state: RootState) => ({} as ClippingBox);
export const selectClippingPlanes = (state: RootState) => state.render.clipping;
export const selectCamera = (state: RootState) => state.render.camera as CameraState;
export const selectCameraType = (state: RootState) => state.render.camera.type;
export const selectSecondaryHighlightProperty = (state: RootState) => state.render.secondaryHighlight.property;
export const selectProjectSettings = (state: RootState) => state.render.project;
export const selectGridDefaults = (state: RootState) => state.render.gridDefaults;
export const selectGrid = (state: RootState) => state.render.grid;
export const selectPicker = (state: RootState) => state.render.picker;
export const selectDefaultDeviceProfile = (state: RootState) => state.render.defaultDeviceProfile;
export const selectViewMode = (state: RootState) => state.render.viewMode;
export const selectLoadingHandles = (state: RootState) => state.render.loadingHandles;
export const selectStamp = (state: RootState) => state.render.stamp;
export const selectPointerLock = (state: RootState) => state.render.cameraDefaults.orthographic.usePointerLock;
export const selectProportionalCameraSpeed = (state: RootState) =>
    state.render.cameraDefaults.pinhole.proportionalSpeed;
export const selectPointerDownState = (state: RootState) => state.render.pointerDownState;
export const selectBackground = (state: RootState) => state.render.background;
export const selectSceneStatus = (state: RootState) => state.render.sceneStatus;
export const selectTerrain = (state: RootState) => state.render.terrain;
export const selectCameraDefaults = (state: RootState) => state.render.cameraDefaults;
export const selectAdvanced = (state: RootState) => state.render.advanced;
export const selectDeviceProfile = (state: RootState) => state.render.deviceProfile;
export const selectPoints = (state: RootState) => state.render.points;
export const selectNavigationCube = (state: RootState) => state.render.navigationCube;
export const selectDebugStats = (state: RootState) => state.render.debugStats;

const { reducer } = renderSlice;
const actions = { ...renderSlice.actions, initScene, resetView };
export { actions as renderActions, reducer as renderReducer };
export type { State as RenderState };
