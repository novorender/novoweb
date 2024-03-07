import {
    ClippingMode,
    DeviceProfile,
    RecursivePartial,
    SceneConfig as OctreeSceneConfig,
    TonemappingMode,
    View,
} from "@novorender/api";
import type { Bookmark } from "@novorender/data-js-api";
import type { EnvironmentDescription } from "@novorender/webgl-api";
import { createAction, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { quat, vec3, vec4 } from "gl-matrix";

import type { RootState } from "app/store";
import { ProjectType } from "slices/explorerSlice";
import { AsyncState, AsyncStatus, ViewMode } from "types/misc";
import { VecRGB, VecRGBA } from "utils/color";
import { mergeRecursive } from "utils/misc";

import {
    CameraSpeedLevel,
    CameraState,
    CameraStep,
    CameraType,
    ObjectVisibility,
    Picker,
    SavedCameraPositions,
    SceneConfig,
    SelectionBasketMode,
    Stamp,
    Subtree,
    Subtrees,
    SubtreeStatus,
} from "./types";
import { getLegacySubtrees, getSubtrees } from "./utils";

const initialState = {
    sceneStatus: { status: AsyncStatus.Initial } as AsyncState<void>,
    sceneOrganization: "",
    mainObject: undefined as number | undefined,
    defaultVisibility: ObjectVisibility.Neutral,
    selectMultiple: false,
    currentCameraSpeedLevel: CameraSpeedLevel.Default,
    savedCameraPositions: { currentIndex: -1, positions: [] as CameraStep[] },
    subtrees: {
        triangles: SubtreeStatus.Unavailable,
        lines: SubtreeStatus.Unavailable,
        terrain: SubtreeStatus.Unavailable,
        points: SubtreeStatus.Unavailable,
        documents: SubtreeStatus.Unavailable,
    } as Subtrees,
    selectionBasketMode: SelectionBasketMode.Loose,
    selectionBasketColor: {
        color: [0, 0, 1, 1] as VecRGB | VecRGBA,
        use: false,
    },
    camera: { type: CameraType.Pinhole } as CameraState,
    picker: Picker.Object,
    viewMode: ViewMode.Default,
    loadingHandles: [] as number[],
    stamp: null as null | Stamp,
    background: {
        environments: { status: AsyncStatus.Initial } as AsyncState<EnvironmentDescription[]>,
        color: [0.75, 0.75, 0.75, 1] as vec4,
        url: "https://api.novorender.com/assets/env/concrete/",
        blur: 1,
    },
    clipping: {
        outlines: true,
        enabled: false,
        draw: false,
        mode: ClippingMode.union,
        planes: [] as {
            normalOffset: vec4;
            baseW: number;
            color: vec4;
            outline: {
                enabled: boolean;
            };
        }[],
    },
    grid: {
        enabled: false,
        distance: 500,
        origin: [0, 0, 0] as vec3,
        axisX: [0, 0, 0] as vec3,
        axisY: [0, 0, 0] as vec3,
        color1: [0.65, 0.65, 0.65] as vec3,
        color2: [0.15, 0.15, 0.15] as vec3,
        size1: 1,
        size2: 5,
    },
    points: {
        size: {
            pixel: 1,
            maxPixel: 20,
            metric: 1,
            toleranceFactor: 0.4,
        },
        deviation: {
            index: 0,
            mixFactor: 1,
            colorGradient: {
                knots: [] as { position: number; color: VecRGBA }[],
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
            controller: "flight" as "flight" | "cadMiddlePan" | "cadRightPan" | "special",
            clipping: {
                near: 0.1,
                far: 3000,
            },
            speedLevels: {
                slow: 0.3,
                default: 1,
                fast: 5,
            },
            proportionalSpeed: {
                enabled: true,
                min: 0.1,
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
            topDownSnapToAxis: undefined as undefined | "north",
            deAcceleration: false,
            touchRotate: false,
        },
    },
    advanced: {
        dynamicResolutionScaling: true,
        msaa: {
            enabled: true,
            samples: 16,
        },
        toonOutline: {
            enabled: true,
            color: [0, 0, 0] as VecRGB,
            onlyOnIdleFrame: true,
            outlineObjects: false,
        },
        outlines: {
            enabled: false,
            color: [10, 10, 10] as VecRGB,
            plane: [0, -1, 0, 0] as vec4,
            breakingPointAngleThreshold: 30 as number,
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
        tier: 0 as DeviceProfile["tier"],
        features: {
            outline: true,
        },
        limits: {
            maxGPUBytes: 2_000_000_000,
            maxPrimitives: 10_000_000,
            maxSamples: 4,
        },
        quirks: {
            adreno600: false,
            slowShaderRecompile: false,
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
    clippingInEdit: false,
};

type State = typeof initialState;

export const initScene = createAction<{
    projectType: ProjectType;
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

export const selectBookmark = createAction(
    "selectBookmark",
    (payload: NonNullable<Bookmark["explorerState"]>, view: View) => ({
        payload,
        meta: { view },
    })
);

export const renderSlice = createSlice({
    name: "render",
    initialState: initialState as State,
    reducers: {
        setMainObject: (state, action: PayloadAction<number | undefined>) => {
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
        saveCameraPosition: (state, action: PayloadAction<CameraStep>) => {
            const lastPos = state.savedCameraPositions.positions[state.savedCameraPositions.currentIndex];

            if (
                lastPos &&
                vec3.equals(action.payload.position, lastPos.position) &&
                quat.equals(action.payload.rotation, lastPos.rotation) &&
                lastPos.fov &&
                lastPos.fov === action.payload.fov &&
                action.payload.kind === lastPos.kind
            ) {
                return state;
            }

            state.savedCameraPositions.positions = state.savedCameraPositions.positions
                .slice(0, state.savedCameraPositions.currentIndex + 1)
                .concat({
                    ...action.payload,
                    position: vec3.clone(action.payload.position),
                    rotation: quat.clone(action.payload.rotation),
                });
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.positions.length - 1;
        },
        undoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex - 1;
            const step = state.savedCameraPositions.positions[state.savedCameraPositions.currentIndex];
            state.camera = {
                type: step.kind,
                goTo: step,
            };
        },
        redoCameraPosition: (state) => {
            state.savedCameraPositions.currentIndex = state.savedCameraPositions.currentIndex + 1;
            const step = state.savedCameraPositions.positions[state.savedCameraPositions.currentIndex];
            state.camera = {
                type: step.kind,
                goTo: step,
            };
        },
        setHomeCameraPos: (state, action: PayloadAction<CameraStep>) => {
            state.savedCameraPositions.positions[0] = {
                ...action.payload,
                position: vec3.clone(action.payload.position),
                rotation: quat.clone(action.payload.rotation),
            };
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
            state.subtrees = subtreesFromBookmark(state.subtrees, action.payload);
        },
        setSelectionBasketMode: (state, action: PayloadAction<State["selectionBasketMode"]>) => {
            state.selectionBasketMode = action.payload;
        },
        setSelectionBasketColor: (state, action: PayloadAction<Partial<State["selectionBasketColor"]>>) => {
            state.selectionBasketColor = { ...state.selectionBasketColor, ...action.payload };
        },
        setClippingPlanes: (state, action: PayloadAction<RecursivePartial<State["clipping"]>>) => {
            state.clipping = mergeRecursive(state.clipping, action.payload);
            state.clipping.planes = state.clipping.planes.map((plane, idx) => ({
                ...plane,
                outline: {
                    enabled: plane.outline ? plane.outline.enabled : idx === 0,
                },
            }));
        },
        addClippingPlane: (
            state,
            action: PayloadAction<Omit<State["clipping"]["planes"][number], "color" | "outline">>
        ) => {
            if (vec3.exactEquals(action.payload.normalOffset.slice(0, 3) as Vec3, [0, 0, 0])) {
                return state;
            }

            state.clipping.enabled = true;

            if (state.clipping.planes.length < 6) {
                state.clipping.planes.push({
                    ...action.payload,
                    color: [0, 1, 0, 0.2],
                    outline: { enabled: !state.clipping.planes.length },
                });
            }
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

            state.camera = {
                ...payload,
                ...(goTo ? { goTo } : {}),
                ...(zoomTo ? { zoomTo } : {}),
            };
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
        setPoints: (state, action: PayloadAction<RecursivePartial<State["points"]>>) => {
            state.points = mergeRecursive(state.points, action.payload);
            state.points.deviation.colorGradient.knots.sort((a, b) => a.position - b.position);
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
        setBreakingPointAngleThreshold: (state, action: PayloadAction<number>) => {
            state.advanced.outlines.breakingPointAngleThreshold = action.payload;
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
        setClippingInEdit: (state, action: PayloadAction<RecursivePartial<State["clippingInEdit"]>>) => {
            state.clippingInEdit = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(initScene, (state, action) => {
            const {
                sceneData: { organization, customProperties: props, settings, tmZone, ...sceneData },
                sceneConfig,
                initialCamera,
                deviceProfile,
            } = action.payload;

            // Init camera
            state.camera.type = initialCamera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole;
            state.camera.goTo = initialCamera;
            state.savedCameraPositions.positions[0] = { ...initialCamera, kind: state.camera.type };
            state.savedCameraPositions.currentIndex = 0;

            state.sceneOrganization = organization ?? "";
            state.project.tmZone = tmZone ?? state.project.tmZone;
            state.deviceProfile = mergeRecursive(state.deviceProfile, deviceProfile);
            state.debugStats.enabled = window.location.search.includes("debug=true");

            if (props.explorerProjectState) {
                const { points, background, terrain, hide, ...advanced } = props.explorerProjectState.renderSettings;
                points.size.metric = 0; //Variable that cannot be set on novoweb and have had 2 different default. Forcing to 0;
                const { debugStats, navigationCube } = props.explorerProjectState.features;
                const { highlights } = props.explorerProjectState;
                const camera = props.explorerProjectState.camera;

                state.cameraDefaults.pinhole = camera.pinhole;
                state.cameraDefaults.orthographic = mergeRecursive(
                    state.cameraDefaults.orthographic,
                    camera.orthographic
                );

                state.background = mergeRecursive(state.background, {
                    ...background,
                    ...(!background.url ? { url: state.background.url, blur: state.background.blur } : {}),
                });
                state.points = mergeRecursive(state.points, points);
                state.subtrees = getSubtrees(hide, sceneConfig.subtrees ?? ["triangles"]);
                state.terrain = terrain;
                state.terrain.elevationGradient = settings
                    ? {
                          knots: settings.terrain.elevationColors.map((node) => ({
                              position: node.elevation,
                              color: node.color,
                          })),
                      }
                    : state.terrain.elevationGradient;
                state.advanced = mergeRecursive(state.advanced, advanced);
                state.debugStats.enabled = debugStats.enabled || state.debugStats.enabled;
                state.navigationCube.enabled = !state.debugStats.enabled && navigationCube.enabled;
                state.secondaryHighlight.property = highlights.secondary.property;
            } else if (settings) {
                // Legacy settings

                // controls
                if (props.flightFingerMap) {
                    const { rotate, orbit, pan } = props.flightFingerMap;
                    state.cameraDefaults.pinhole.controller =
                        rotate === 1
                            ? "flight"
                            : orbit === 1
                            ? pan === 2
                                ? "cadRightPan"
                                : "cadMiddlePan"
                            : "special";
                }

                // corner features
                state.debugStats.enabled = Boolean(props.showStats) || state.debugStats.enabled;
                state.navigationCube.enabled = !state.debugStats.enabled && Boolean(props.navigationCube);

                // camera
                state.cameraDefaults.pinhole.clipping.far = Math.max(
                    (sceneData.camera as { far?: number })?.far ?? 0,
                    1000
                );
                state.cameraDefaults.pinhole.clipping.near = Math.max(
                    (sceneData.camera as { near?: number })?.near ?? 0,
                    0.1
                );
                state.cameraDefaults.orthographic.topDownElevation = props.defaultTopDownElevation;
                state.cameraDefaults.orthographic.usePointerLock =
                    props.pointerLock !== undefined
                        ? props.pointerLock.ortho
                        : state.cameraDefaults.orthographic.usePointerLock;
                state.cameraDefaults.pinhole.speedLevels = props.cameraSpeedLevels?.flight
                    ? {
                          slow: props.cameraSpeedLevels.flight.slow * 33,
                          default: props.cameraSpeedLevels.flight.default * 33,
                          fast: props.cameraSpeedLevels.flight.fast * 33,
                      }
                    : state.cameraDefaults.pinhole.speedLevels;

                // highlight
                state.secondaryHighlight.property = props.highlights?.secondary.property ?? "";

                // background
                state.background.color = settings.background.color ?? state.background.color;
                state.background.blur =
                    (settings.background as { skyBoxBlur?: number }).skyBoxBlur ?? state.background.blur;
                state.background.url = settings.environment
                    ? `https://api.novorender.com/assets/env/${settings.environment}/`
                    : state.background.url;

                // points
                state.points.size = mergeRecursive(state.points.size, settings.points.size);
                state.points.deviation.index = (settings.points.deviation as { index?: number })?.index ?? 0;
                state.points.deviation.mixFactor =
                    settings.points.deviation?.mode === "mix" ? 0.5 : settings.points.deviation?.mode === "on" ? 1 : 0;
                state.points.deviation.colorGradient = {
                    knots:
                        settings.points.deviation?.colors.map((deviation) => ({
                            color: deviation.color,
                            position: deviation.deviation,
                        })) ?? [],
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
            } else {
                state.subtrees = getSubtrees(
                    { terrain: false, triangles: false, points: false, documents: false, lines: false },
                    sceneConfig.subtrees ?? ["triangles"]
                );
            }
        });
        builder.addCase(resetView, (state, action) => {
            const {
                initialCamera,
                sceneData: { settings, customProperties: props },
            } = action.payload;

            state.defaultVisibility = initialState.defaultVisibility;
            state.mainObject = initialState.mainObject;
            state.picker = initialState.picker;
            state.clipping = initialState.clipping;
            state.selectionBasketMode = initialState.selectionBasketMode;

            // Camera
            if (initialCamera) {
                state.camera.type =
                    initialCamera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole;
                state.camera.goTo = initialCamera;
                state.savedCameraPositions = {
                    positions: [{ ...initialCamera, kind: state.camera.type }],
                    currentIndex: 0,
                };
            }

            const availableSubtrees = Object.keys(state.subtrees).filter(
                (key) => state.subtrees[key as keyof State["subtrees"]] !== SubtreeStatus.Unavailable
            );

            if (props.explorerProjectState) {
                const { points, background, terrain, hide } = props.explorerProjectState.renderSettings;

                // background
                state.background.color = background.color;

                // deviations
                state.points.deviation.index = points.deviation.index;
                state.points.deviation.mixFactor = points.deviation.mixFactor;

                // subtrees
                state.subtrees = getSubtrees(hide, availableSubtrees);

                // terrain
                state.terrain.asBackground = terrain.asBackground;
                state.terrain.elevationGradient = settings
                    ? {
                          knots: settings.terrain.elevationColors.map((node) => ({
                              position: node.elevation,
                              color: node.color,
                          })),
                      }
                    : state.terrain.elevationGradient;
            } else if (settings) {
                // background
                state.background.color = settings.background.color ?? state.background.color;

                // deviations
                state.points.deviation.index = (settings.points.deviation as { index?: number })?.index ?? 0;
                state.points.deviation.mixFactor =
                    settings.points.deviation?.mode === "mix" ? 0.5 : settings.points.deviation?.mode === "on" ? 1 : 0;

                // subtrees
                state.subtrees = getLegacySubtrees(settings.advanced, availableSubtrees);

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
        builder.addCase(selectBookmark, (state, action) => {
            const { camera, subtrees, viewMode, objects, background, terrain, deviations, grid, clipping, options } =
                action.payload;

            state.camera =
                camera.kind === "orthographic"
                    ? {
                          type: CameraType.Orthographic,
                          goTo: {
                              position: [...camera.position],
                              rotation: [...camera.rotation],
                              fov: camera.fov,
                              far: camera.far ?? state.cameraDefaults[camera.kind].clipping.far,
                          },
                      }
                    : {
                          type: CameraType.Pinhole,
                          goTo: {
                              position: [...camera.position],
                              rotation: [...camera.rotation],
                          },
                      };

            state.subtrees = subtreesFromBookmark(state.subtrees, subtrees);
            state.viewMode = viewMode;
            state.selectionBasketMode =
                options.addToSelectionBasket || objects.selectionBasket.ids.length
                    ? objects.selectionBasket.mode
                    : SelectionBasketMode.Loose;
            state.mainObject = objects.mainObject.id;
            state.defaultVisibility = options.addToSelectionBasket
                ? ObjectVisibility.Transparent
                : (objects.defaultVisibility as ObjectVisibility);
            state.background.color = background.color;
            state.terrain.asBackground = terrain.asBackground;
            state.points.deviation.index = deviations.index;
            state.points.deviation.mixFactor = deviations.mixFactor;
            state.grid = grid;
            state.clipping = {
                ...clipping,
                draw: false,
                outlines: clipping.outlines !== undefined ? clipping.outlines : true,
                planes: clipping.planes.map(({ normalOffset, color, outline }, idx) => ({
                    normalOffset,
                    color,
                    outline: {
                        enabled: outline ? outline.enabled : idx === 0,
                    },
                    baseW: normalOffset[3],
                })),
            };
        });
    },
});

function subtreesFromBookmark(
    current: State["subtrees"],
    bm: NonNullable<Bookmark["explorerState"]>["subtrees"]
): State["subtrees"] {
    const subtrees = { ...current };

    subtrees.lines =
        subtrees.lines !== SubtreeStatus.Unavailable
            ? bm.lines
                ? SubtreeStatus.Shown
                : SubtreeStatus.Hidden
            : subtrees.lines;

    subtrees.points =
        subtrees.points !== SubtreeStatus.Unavailable
            ? bm.points
                ? SubtreeStatus.Shown
                : SubtreeStatus.Hidden
            : subtrees.points;

    subtrees.terrain =
        subtrees.terrain !== SubtreeStatus.Unavailable
            ? bm.terrain
                ? SubtreeStatus.Shown
                : SubtreeStatus.Hidden
            : subtrees.terrain;

    subtrees.triangles =
        subtrees.triangles !== SubtreeStatus.Unavailable
            ? bm.triangles
                ? SubtreeStatus.Shown
                : SubtreeStatus.Hidden
            : subtrees.triangles;

    subtrees.documents =
        subtrees.documents !== SubtreeStatus.Unavailable
            ? bm.documents
                ? SubtreeStatus.Shown
                : SubtreeStatus.Hidden
            : subtrees.documents;

    return subtrees;
}

export const selectMainObject = (state: RootState) => state.render.mainObject;
export const selectDefaultVisibility = (state: RootState) => state.render.defaultVisibility;
export const selectSelectMultiple = (state: RootState) => state.render.selectMultiple;
export const selectCameraSpeedLevels = (state: RootState) => state.render.cameraDefaults.pinhole.speedLevels;
export const selectCurrentCameraSpeedLevel = (state: RootState) => state.render.currentCameraSpeedLevel;
export const selectSavedCameraPositions = (state: RootState) =>
    state.render.savedCameraPositions as SavedCameraPositions;
export const selectHomeCameraPosition = (state: RootState) =>
    state.render.savedCameraPositions.positions[0] as CameraStep;
export const selectSubtrees = (state: RootState) => state.render.subtrees;
export const selectSelectionBasketMode = (state: RootState) => state.render.selectionBasketMode;
export const selectSelectionBasketColor = (state: RootState) => state.render.selectionBasketColor;
export const selectClippingPlanes = (state: RootState) => state.render.clipping;
export const selectCamera = (state: RootState) => state.render.camera as CameraState;
export const selectCameraType = (state: RootState) => state.render.camera.type;
export const selectSecondaryHighlightProperty = (state: RootState) => state.render.secondaryHighlight.property;
export const selectBreakingPointAngleThreshold = (state: RootState) =>
    state.render.advanced.outlines.breakingPointAngleThreshold;
export const selectProjectSettings = (state: RootState) => state.render.project;
export const selectGrid = (state: RootState) => state.render.grid;
export const selectPicker = (state: RootState) => state.render.picker;
export const selectViewMode = (state: RootState) => state.render.viewMode;
export const selectLoadingHandles = (state: RootState) => state.render.loadingHandles;
export const selectStamp = (state: RootState) => state.render.stamp;
export const selectPointerLock = (state: RootState) => state.render.cameraDefaults.orthographic.usePointerLock;
export const selectProportionalCameraSpeed = (state: RootState) =>
    state.render.cameraDefaults.pinhole.proportionalSpeed;
export const selectBackground = (state: RootState) => state.render.background;
export const selectSceneStatus = (state: RootState) => state.render.sceneStatus;
export const selectTerrain = (state: RootState) => state.render.terrain;
export const selectCameraDefaults = (state: RootState) => state.render.cameraDefaults;
export const selectAdvanced = (state: RootState) => state.render.advanced;
export const selectDeviceProfile = (state: RootState) => state.render.deviceProfile;
export const selectPoints = (state: RootState) => state.render.points;
export const selectDeviations = (state: RootState) => state.render.points.deviation;
export const selectNavigationCube = (state: RootState) => state.render.navigationCube;
export const selectDebugStats = (state: RootState) => state.render.debugStats;
export const selectClippingInEdit = (state: RootState) => state.render.clippingInEdit;
export const selectSceneOrganization = (state: RootState) => state.render.sceneOrganization;

const { reducer } = renderSlice;
const actions = { ...renderSlice.actions, initScene, resetView, selectBookmark };
export { actions as renderActions, reducer as renderReducer };
export type { State as RenderState };
