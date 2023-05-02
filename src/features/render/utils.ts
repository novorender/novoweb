import { MutableRefObject } from "react";
import { ObjectGroup as BaseObjectGroup, SceneData } from "@novorender/data-js-api";
import {
    API,
    CameraController,
    CameraControllerParams,
    EnvironmentDescription,
    Highlight,
    Internal,
    MeasureInfo,
    ObjectId,
    RenderSettings,
    Scene,
    View,
} from "@novorender/webgl-api";
import { vec3 } from "gl-matrix";

import { api, dataApi, offscreenCanvas } from "app";
import { featuresConfig, WidgetKey } from "config/features";
import { groupsActions, selectLoadingIds } from "features/groups";
import { DeviationMode, deviationsActions } from "features/deviations";
import { store } from "app/store";
import { ObjectGroup, objectGroupsActions, DispatchObjectGroups } from "contexts/objectGroups";
import { hiddenGroupActions, DispatchHidden } from "contexts/hidden";
import { highlightActions, DispatchHighlighted } from "contexts/highlighted";
import {
    AdvancedSetting,
    CameraSpeedLevel,
    CameraType,
    ObjectVisibility,
    ProjectSetting,
    renderActions,
    RenderState,
    SelectionBasketMode,
    SubtreeStatus,
} from "features/render/renderSlice";
import { explorerActions } from "slices/explorerSlice";
import { VecRGB, VecRGBA } from "utils/color";

import { MAX_FLOAT } from "./consts";
import { orthoCamActions } from "features/orthoCam";

type Settings = {
    taaEnabled: boolean;
    ssaoEnabled: boolean;
    autoFpsEnabled: boolean;
    outlineRenderingEnabled: boolean;
};

export function createRendering(
    canvas: HTMLCanvasElement,
    view: View
): {
    start: () => Promise<void>;
    update: (updated: Partial<Settings>) => void;
    stop: () => void;
} {
    const running = { current: false };
    let settings: Settings = {
        ssaoEnabled: true,
        taaEnabled: true,
        autoFpsEnabled: true,
        outlineRenderingEnabled: true,
    };

    return { start, stop, update };

    function update(updated: Partial<Settings>) {
        const updatedSettings = { ...settings, ...updated };

        if (
            settings.ssaoEnabled !== updatedSettings.ssaoEnabled ||
            settings.taaEnabled !== updatedSettings.taaEnabled ||
            settings.autoFpsEnabled !== updatedSettings.autoFpsEnabled ||
            settings.outlineRenderingEnabled !== updatedSettings.outlineRenderingEnabled
        ) {
            settings = updatedSettings;
            view.invalidateCamera();
        }
    }

    function stop() {
        running.current = false;
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }

    async function start() {
        running.current = true;

        const ctx = offscreenCanvas ? canvas.getContext("bitmaprenderer") : undefined;

        const fpsTable: number[] = [];
        let fps = 0;

        while (running.current) {
            const output = await view.render();

            if (!running.current) {
                break;
            }

            if (settings.autoFpsEnabled) {
                view.adjustQuality({ lowerBound: 40, upperBound: 30 });
            }

            if (settings.outlineRenderingEnabled && view.camera.controller.params.kind === "ortho") {
                await output.applyPostEffect({ kind: "outline", color: [0, 0, 0, 0] });
            }

            const image = await output.getImage();

            if (!running.current) {
                break;
            }

            if (ctx && image) {
                ctx.transferFromImageBitmap(image);
            }

            if (view.performanceStatistics.frameInterval) {
                fpsTable.splice(0, 0, view.performanceStatistics.frameInterval);
                if (fpsTable.length > 50) {
                    fpsTable.length = 50;
                }
                fps = 0;
                for (let f of fpsTable) {
                    fps += f;
                }
                fps = (1000 * fpsTable.length) / fps;
                (view.performanceStatistics as any).fps = fps;
            }

            (view.performanceStatistics as any).resolutionScale = output.renderSettings.quality.resolution.value;
            let taaEnabled = !api.deviceProfile.weakDevice && settings.taaEnabled;

            let runPostEffects =
                output.statistics.sceneResolved &&
                view.camera.controller.params.kind !== "ortho" &&
                (taaEnabled || settings.ssaoEnabled);

            let reset = true;

            while (runPostEffects && running.current && output.isIdleFrame()) {
                await (api as any).waitFrame();

                if (!running.current) {
                    break;
                }

                if (taaEnabled) {
                    runPostEffects = (await output.applyPostEffect({ kind: "taa", reset })) || false;
                }

                if (settings.ssaoEnabled) {
                    await output.applyPostEffect({
                        kind: "ssao",
                        samples: 64,
                        radius: 1,
                        reset: reset,
                    });

                    if (!taaEnabled) {
                        runPostEffects = false;
                    }
                }

                reset = false;
                const image = await output.getImage();
                if (ctx && image) {
                    ctx.transferFromImageBitmap(image);
                }
            }
        }
    }
}

/**
 * Applies highlights and hides objects in the 3d view based on the object groups provided
 */
let refillId = 0;
export async function refillObjects({
    sceneId,
    scene,
    view,
    objectGroups,
    defaultVisibility,
    selectionBasket,
}: {
    sceneId: string;
    scene: Scene;
    view: View;
    objectGroups: (
        | {
              id: string;
              ids: ObjectId[];
              color: VecRGB | VecRGBA;
              opacity?: number;
              selected: boolean;
              hidden: boolean;
              highlightIdx?: number;
          }
        | { id: string; ids: ObjectId[]; neutral: true; hidden: false; selected: true; highlightIdx?: number }
    )[];
    selectionBasket: {
        ids: Record<number, true | undefined>;
        idArr: number[];
        mode: SelectionBasketMode;
    };
    defaultVisibility: ObjectVisibility;
}): Promise<void> {
    if (!view || !scene) {
        return;
    }

    const id = ++refillId;
    const { objectHighlighter } = scene;

    objectHighlighter.objectHighlightIndices.fill(defaultVisibility === ObjectVisibility.Transparent ? 255 : 0);

    const proms: Promise<void>[] = objectGroups.map(async (group) => {
        if ((group.selected || group.hidden) && !group.ids) {
            store.dispatch(groupsActions.setLoadingIds(true));
            group.ids = await dataApi.getGroupIds(sceneId, group.id).catch(() => {
                console.warn("failed to load ids for group - ", group.id);
                return [];
            });
        }
    });

    await Promise.all(proms);

    if (id !== refillId) {
        return;
    }

    let index = 1; // 0 is default visibility
    const [hidden, _highlights] = objectGroups.reduce(
        (prev, group) => {
            delete group.highlightIdx;
            const opacity = group.hidden ? group.opacity ?? 0 : 1;

            if (opacity === 0) {
                group.ids.forEach((id) => prev[0].push(id));
            }

            if ((group.selected || group.hidden) && group.ids.length) {
                const neutral = "neutral" in group;
                const transparent = group.hidden;
                const key = neutral ? "neutral" : transparent ? `opacity-${opacity}` : String(group.color);

                if (!prev[1][key]) {
                    prev[1][key] = {
                        key,
                        idx: index,
                        highlight: neutral
                            ? getHighlightByObjectVisibility(ObjectVisibility.Neutral)
                            : transparent
                            ? api.createHighlight({ kind: "transparent", opacity })
                            : api.createHighlight({ kind: "color", color: group.color }),
                    };

                    group.highlightIdx = index;
                    index = index + 1;

                    return [prev[0], prev[1]];
                } else {
                    group.highlightIdx = prev[1][key].idx;
                }
            }

            return prev;
        },
        [[], {}] as [number[], { [key: string]: { key: string; idx: number; highlight: Highlight } }]
    );

    const highlights = Object.values(_highlights);
    hidden.forEach((id) => (objectHighlighter.objectHighlightIndices[id] = 255));

    objectGroups.forEach((group) => {
        const { highlightIdx } = group;

        if (group.ids?.length && highlightIdx) {
            if (group.selected) {
                group.ids.forEach((id) => {
                    if (selectionBasket.mode === SelectionBasketMode.Loose || selectionBasket.ids[id]) {
                        objectHighlighter.objectHighlightIndices[id] = highlightIdx;
                    }
                });
            } else if (defaultVisibility === ObjectVisibility.Neutral && group.hidden) {
                group.ids.forEach((id) => {
                    objectHighlighter.objectHighlightIndices[id] = highlightIdx;
                });
            }
        }
    });

    view.settings.objectHighlights = [
        getHighlightByObjectVisibility(defaultVisibility),
        ...highlights.sort((a, b) => a.idx - b.idx).map((selected) => selected.highlight),
    ];

    objectHighlighter.commit();

    if (selectLoadingIds(store.getState())) {
        store.dispatch(groupsActions.setLoadingIds(false));
    }
}

export function getEnvironmentDescription(
    name: string,
    environments: EnvironmentDescription[]
): EnvironmentDescription {
    return environments.find((env) => env.name === name) ?? environments[0];
}

export async function getSubtrees(view: View, scene: Scene): Promise<NonNullable<RenderState["subtrees"]>> {
    const subtrees = scene.subtrees ?? ["triangles"];
    const advancedSettings = (view.settings as Internal.RenderSettingsExt).advanced;

    return {
        terrain: subtrees.includes("terrain")
            ? advancedSettings.hideTerrain
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        lines: subtrees.includes("lines")
            ? advancedSettings.hideLines
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        points: subtrees.includes("points")
            ? advancedSettings.hidePoints
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        triangles: subtrees.includes("triangles")
            ? advancedSettings.hideTriangles
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
        documents: subtrees.includes("documents")
            ? advancedSettings.hideDocuments
                ? SubtreeStatus.Hidden
                : SubtreeStatus.Shown
            : SubtreeStatus.Unavailable,
    };
}

export async function initSubtrees(view: View, scene: Scene) {
    const initialSubtrees = await getSubtrees(view, scene);
    store.dispatch(renderActions.setSubtrees(initialSubtrees));

    const toLock = Object.values(featuresConfig)
        .filter((feature) => {
            if ("dependencies" in feature && feature.dependencies.subtrees) {
                return !feature.dependencies.subtrees
                    .map((dep: readonly (keyof typeof initialSubtrees)[]) =>
                        dep.every((val) => initialSubtrees[val] !== SubtreeStatus.Unavailable)
                    )
                    .some((val) => val === true);
            }

            return false;
        })
        .map((feature) => feature.key);

    store.dispatch(explorerActions.lockWidgets(toLock as WidgetKey[]));
}

function getHighlightByObjectVisibility(visibility: ObjectVisibility): Highlight {
    switch (visibility) {
        case ObjectVisibility.Neutral:
            return api.createHighlight({ kind: "neutral" });
        case ObjectVisibility.SemiTransparent:
            return api.createHighlight({ kind: "transparent", opacity: 0.2 });
        case ObjectVisibility.Transparent:
            return api.createHighlight({ kind: "transparent", opacity: 0 });
    }
}

export function initHighlighted(dispatch: DispatchHighlighted, color?: VecRGBA): void {
    dispatch(highlightActions.setIds([]));
    if (color) {
        dispatch(highlightActions.setColor(color));
    }
}

export function initHidden(dispatch: DispatchHidden): void {
    dispatch(hiddenGroupActions.setIds([]));
}

function serializeableObjectGroups(groups: BaseObjectGroup[]): ObjectGroup[] {
    return groups.map((group) =>
        group.color instanceof Float32Array
            ? { ...group, color: [group.color[0], group.color[1], group.color[2]] }
            : group
    ) as ObjectGroup[];
}

export function initObjectGroups(groups: BaseObjectGroup[], dispatch: DispatchObjectGroups): void {
    dispatch(objectGroupsActions.set(serializeableObjectGroups(groups.filter((group) => group.id))));
}

export async function initEnvironment(
    env: string | EnvironmentDescription | undefined,
    environments: EnvironmentDescription[],
    view: View
): Promise<void> {
    const environment = env && typeof env === "object" ? env : getEnvironmentDescription(env ?? "", environments);
    const loadedEnvironment = await api.loadEnvironment(environment);

    store.dispatch(renderActions.setEnvironment(environment));
    view.applySettings({ environment: loadedEnvironment });
}

export function initCamera({
    camera,
    canvas,
    flightControllerRef,
    view,
    controls,
}: {
    camera: CameraControllerParams;
    canvas: HTMLCanvasElement;
    flightControllerRef: MutableRefObject<CameraController | undefined>;
    view: View;
    controls?: {
        mouseButtonMap?: CameraController["mouseButtonsMap"];
        fingerMap?: CameraController["fingersMap"];
    };
}): CameraController {
    const controller = api.createCameraController(camera as any, canvas);

    if (camera) {
        controller.autoZoomToScene = false;
    }

    if (controller.params.kind === "flight") {
        if (controller.params.near <= 0) {
            controller.params.near = 0.1;
        }
        flightControllerRef.current = controller;
    } else if (!flightControllerRef.current) {
        flightControllerRef.current = {
            ...api.createCameraController({ kind: "flight" }, canvas),
            autoZoomToScene: false,
            enabled: false,
        };
    }

    if (controls?.mouseButtonMap) {
        flightControllerRef.current!.mouseButtonsMap = controls.mouseButtonMap;
    }

    if (controls?.fingerMap) {
        flightControllerRef.current!.fingersMap = controls.fingerMap;
    }

    view.camera.controller = controller;

    if (controller.params.kind === "flight") {
        store.dispatch(renderActions.setCamera({ type: CameraType.Flight }));
    } else if (controller.params.kind === "ortho") {
        store.dispatch(renderActions.setCamera({ type: CameraType.Orthographic }));
    }

    return controller;
}

export function initCameraSpeedLevels(customProperties: Record<string, any>, cameraParams: CameraControllerParams) {
    const levels = customProperties?.cameraSpeedLevels;

    if (!levels) {
        // legacy multipliers
        if (cameraParams.kind === "flight" && cameraParams.linearVelocity) {
            const baseSpeed = cameraParams.linearVelocity;
            store.dispatch(
                renderActions.setCameraSpeedLevels({
                    flight: {
                        [CameraSpeedLevel.Slow]: baseSpeed * 0.2,
                        [CameraSpeedLevel.Default]: baseSpeed,
                        [CameraSpeedLevel.Fast]: baseSpeed * 5,
                    },
                })
            );
            return;
        }

        // defaults
        store.dispatch(
            renderActions.setCameraSpeedLevels({
                flight: {
                    [CameraSpeedLevel.Slow]: 0.01,
                    [CameraSpeedLevel.Default]: 0.03,
                    [CameraSpeedLevel.Fast]: 0.15,
                },
            })
        );
        return;
    }

    store.dispatch(renderActions.setCameraSpeedLevels(levels));
}

export function initProportionalCameraSpeed(customProperties: Record<string, any>) {
    const speed = customProperties?.proportionalCameraSpeed;

    if (speed) {
        store.dispatch(renderActions.setProportionalCameraSpeed(speed));
    }
}

export function initPointerLock(customProperties: Record<string, any>) {
    const pointerLock = customProperties?.pointerLock;

    if (pointerLock) {
        store.dispatch(renderActions.setPointerLock(pointerLock));
    }
}

export function initDefaultTopDownElevation(customProperties: Record<string, any>) {
    const defaultTopDownElevation = customProperties?.defaultTopDownElevation;

    if (typeof defaultTopDownElevation === "number") {
        store.dispatch(orthoCamActions.setDefaultTopDownElevation(defaultTopDownElevation));
    } else {
        store.dispatch(orthoCamActions.setDefaultTopDownElevation(undefined));
    }
}

export function initClippingBox(clipping: RenderSettings["clippingPlanes"]): void {
    // highlight is sometimes saved as null and crashes render
    clipping.highlight = clipping.highlight ?? -1;

    store.dispatch(
        renderActions.setClippingBox({
            enabled: clipping.enabled,
            inside: clipping.inside,
            showBox: clipping.showBox,
            bounds: {
                min: vec3.clone(clipping.bounds.min),
                max: vec3.clone(clipping.bounds.max),
            },
            baseBounds: {
                min: vec3.clone(clipping.bounds.min),
                max: vec3.clone(clipping.bounds.max),
            },
        })
    );
}

export function initClippingPlanes(clipping: RenderSettings["clippingVolume"]): void {
    store.dispatch(
        renderActions.setClippingPlanes({
            enabled: clipping.enabled,
            mode: clipping.mode,
            planes: clipping.planes.map((plane) => Array.from(plane) as [number, number, number, number]),
            baseW: clipping.planes.length ? clipping.planes[0][3] : 0,
        })
    );
}

export function initDeviations(deviations: RenderSettings["points"]["deviation"]): void {
    store.dispatch(
        deviationsActions.setDeviations({
            mode: deviations.mode as DeviationMode,
            colors: deviations.colors
                .map((c) => ({ ...c, color: Array.from(c.color) as VecRGBA }))
                .sort((a, b) => b.deviation - a.deviation),
            index: deviations.index ?? 0,
        })
    );
}

export function initAdvancedSettings(view: View, customProperties: Record<string, any>, api: API): void {
    const { diagnostics, advanced, points, light, terrain, background, pickBuffer } =
        view.settings as Internal.RenderSettingsExt;
    const cameraParams = { far: 1000, near: 0.1 };

    if (view.camera.controller.params.kind === "flight") {
        cameraParams.far = Math.max(1000, view.camera.controller.params.far);
        cameraParams.near = Math.max(0.001, view.camera.controller.params.near);
        view.camera.controller.params.far = cameraParams.far;
        view.camera.controller.params.near = cameraParams.near;
    }

    store.dispatch(
        renderActions.setAdvancedSettings({
            [AdvancedSetting.ShowPerformance]:
                Boolean(customProperties?.showStats) || window.location.search.includes("debug=true"),
            [AdvancedSetting.ShowBoundingBoxes]: diagnostics.showBoundingBoxes,
            [AdvancedSetting.HoldDynamic]: diagnostics.holdDynamic,
            [AdvancedSetting.DoubleSidedMaterials]: advanced.doubleSided.opaque,
            [AdvancedSetting.DoubleSidedTransparentMaterials]: advanced.doubleSided.transparent,
            [AdvancedSetting.CameraFarClipping]: cameraParams.far,
            [AdvancedSetting.CameraNearClipping]: cameraParams.near,
            [AdvancedSetting.QualityPoints]: points.shape === "disc",
            [AdvancedSetting.PointSize]: points.size.pixel ?? 1,
            [AdvancedSetting.MaxPointSize]: points.size.maxPixel ?? 20,
            [AdvancedSetting.PointToleranceFactor]: points.size.toleranceFactor ?? 0,
            [AdvancedSetting.HeadlightIntensity]: light.camera.brightness,
            [AdvancedSetting.HeadlightDistance]: light.camera.distance,
            [AdvancedSetting.AmbientLight]: light.ambient.brightness,
            [AdvancedSetting.NavigationCube]: Boolean(customProperties?.navigationCube),
            [AdvancedSetting.TerrainAsBackground]: Boolean(terrain.asBackground),
            [AdvancedSetting.BackgroundColor]: background.color as VecRGBA,
            [AdvancedSetting.SkyBoxBlur]: background.skyBoxBlur,
            [AdvancedSetting.AutoFps]: customProperties?.autoFps ?? true,
            [AdvancedSetting.SecondaryHighlight]: { property: customProperties?.highlights?.secondary?.property ?? "" },
            [AdvancedSetting.PickSemiTransparentObjects]: pickBuffer?.includeTransparent ?? false,
            [AdvancedSetting.TriangleLimit]:
                customProperties?.triangleLimit ?? (api as any).deviceProfile?.triangleLimit ?? 5_000_000,
            ...(customProperties?.flightMouseButtonMap
                ? { [AdvancedSetting.MouseButtonMap]: customProperties?.flightMouseButtonMap }
                : {}),
            ...(customProperties?.flightFingerMap
                ? { [AdvancedSetting.FingerMap]: customProperties?.flightFingerMap }
                : {}),
        })
    );
}

export function initProjectSettings({ sceneData }: { sceneData: SceneData }): void {
    store.dispatch(
        renderActions.setProjectSettings({
            [ProjectSetting.TmZone]: sceneData.tmZone ?? "",
            [ProjectSetting.DitioProjectNumber]: sceneData.customProperties?.ditioProjectNumber ?? "",
            ...(sceneData.customProperties?.jiraSettings
                ? { [ProjectSetting.Jira]: { ...sceneData.customProperties?.jiraSettings } }
                : {}),
            ...(sceneData.customProperties?.xsiteManageSettings
                ? { [ProjectSetting.XsiteManage]: { ...sceneData.customProperties?.xsiteManageSettings } }
                : {}),
        })
    );
}

export async function pickDeviationArea({
    view,
    size,
    clickX,
    clickY,
}: {
    view: View;
    size: number;
    clickX: number;
    clickY: number;
}): Promise<number | undefined> {
    if (!view.lastRenderOutput) {
        return;
    }
    const center = await view.lastRenderOutput.measure(clickX, clickY);

    if (center?.deviation) {
        return center.deviation;
    }

    const startX = clickX - size / 2;
    const startY = clickY - size / 2;
    const res = [] as Promise<MeasureInfo | undefined>[];

    for (let x = 1; x <= size; x++) {
        for (let y = 1; y <= size; y++) {
            res.push(view.lastRenderOutput.measure(startX + x, startY + y));
        }
    }

    return (await Promise.all(res))
        .map((res) => (res?.deviation ? res : undefined))
        .filter((res) => typeof res !== "undefined")
        .reduce((deviation, measureInfo, idx, array) => {
            if (deviation === MAX_FLOAT) {
                return deviation;
            }
            if (idx === array.length - 1) {
                return (deviation + measureInfo!.deviation!) / array.length;
            } else {
                return deviation + measureInfo!.deviation!;
            }
        }, 0);
}
