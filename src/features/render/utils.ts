import { MutableRefObject } from "react";
import { ObjectGroup, SceneData } from "@novorender/data-js-api";
import {
    CameraController,
    CameraControllerParams,
    EnvironmentDescription,
    FlightControllerParams,
    Highlight,
    Internal,
    MeasureInfo,
    ObjectId,
    OrthoControllerParams,
    PickInfo,
    RenderSettings,
    Scene,
    View,
} from "@novorender/webgl-api";
import { vec2 } from "gl-matrix";

import { api, dataApi } from "app";
import { offscreenCanvas } from "config";
import { featuresConfig, WidgetKey } from "config/features";
import { groupsActions, selectLoadingIds } from "features/groups";
import { DeviationMode, deviationsActions } from "features/deviations";

import { store } from "app/store";
import { CustomGroup, customGroupsActions, DispatchCustomGroups } from "contexts/customGroups";
import { hiddenGroupActions, DispatchHidden } from "contexts/hidden";
import { highlightActions, DispatchHighlighted } from "contexts/highlighted";
import {
    AdvancedSetting,
    CameraType,
    ObjectVisibility,
    ProjectSetting,
    renderActions,
    RenderState,
    SelectionBasketMode,
    SubtreeStatus,
} from "slices/renderSlice";
import { explorerActions } from "slices/explorerSlice";

import { VecRGB, VecRGBA } from "utils/color";
import { sleep } from "utils/timers";
import { MAX_FLOAT } from "./consts";

type Settings = {
    taaEnabled: boolean;
    ssaoEnabled: boolean;
    outlineRenderingEnabled: boolean;
    moving: boolean;
};

export function createRendering(
    canvas: HTMLCanvasElement,
    view: View
): {
    start: () => Promise<void>;
    update: (updated: Partial<Settings>) => void;
    stop: () => void;
    pick: typeof view.pick;
    measure: typeof view.measure;
} {
    const running = { current: false };
    let settings: Settings = {
        ssaoEnabled: true,
        taaEnabled: true,
        moving: false,
        outlineRenderingEnabled: true,
    };

    let hook = undefined as undefined | (() => any);
    let pickBufferUpdated = false;
    let lastPickBufferUpdate = 0;

    return { start, stop, update, pick, measure };

    function update(updated: Partial<Settings>) {
        const updatedSettings = { ...settings, ...updated };

        if (
            settings.ssaoEnabled !== updatedSettings.ssaoEnabled ||
            settings.taaEnabled !== updatedSettings.taaEnabled ||
            settings.outlineRenderingEnabled !== updatedSettings.outlineRenderingEnabled ||
            settings.moving !== updatedSettings.moving
        ) {
            settings = updatedSettings;
            (view as any).settings.generation++;
        }
    }

    async function pick(x: number, y: number): Promise<PickInfo | undefined> {
        let cb: (value: PickInfo | undefined) => void = () => {};
        const prom = new Promise<PickInfo | undefined>((res) => {
            cb = res;
        });

        if (pickBufferUpdated || performance.now() - lastPickBufferUpdate < 1000) {
            cb(await view.pick(x, y));
        } else {
            hook = async () => {
                await view.updatePickBuffers();
                lastPickBufferUpdate = performance.now();
                pickBufferUpdated = true;
                cb(await view.pick(x, y));
            };
            (view as any).settings.generation++;
        }

        return prom;
    }

    async function measure(x: number, y: number): Promise<MeasureInfo | undefined> {
        let cb: (value: MeasureInfo | undefined) => void = () => {};
        const prom = new Promise<MeasureInfo | undefined>((res) => {
            cb = res;
        });

        if (pickBufferUpdated || performance.now() - lastPickBufferUpdate < 1000) {
            cb(await view.measure(x, y));
        } else {
            hook = async () => {
                await view.updatePickBuffers();
                lastPickBufferUpdate = performance.now();
                pickBufferUpdated = true;
                cb(await view.measure(x, y));
            };
            (view as any).settings.generation++;
        }

        return prom;
    }

    function stop() {
        running.current = false;
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }

    async function start() {
        running.current = true;

        const ctx = offscreenCanvas ? canvas.getContext("bitmaprenderer") : undefined;

        const fpsTable: number[] = [];
        let startRender = 0;
        let fps = 0;

        while (running.current) {
            const output = await view.render();
            pickBufferUpdated = false;

            if (!running.current) {
                break;
            }

            const badPerf = view.performanceStatistics.weakDevice || settings.moving;
            if (settings.ssaoEnabled && !badPerf) {
                await output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: true });
            }

            if (settings.outlineRenderingEnabled && view.camera.controller.params.kind === "ortho") {
                await output.applyPostEffect({ kind: "outline", color: [0, 0, 0, 0] });
            }

            if (hook) {
                hook();
                hook = undefined;
            }

            const image = await output.getImage();

            if (!running.current) {
                break;
            }

            if (ctx && image) {
                ctx.transferFromImageBitmap(image); // display in canvas
            }

            const now = performance.now();
            if (startRender > 0) {
                const dt = now - startRender;
                fpsTable.splice(0, 0, dt);
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
            startRender = now;

            let run = settings.taaEnabled && view.camera.controller.params.kind !== "ortho";
            let reset = true;

            while (run && running.current) {
                if (output.hasViewChanged) {
                    break;
                }

                await (api as any).waitFrame();

                run = (await output.applyPostEffect({ kind: "taa", reset })) || false;

                if (!running.current) {
                    break;
                }

                if (settings.ssaoEnabled) {
                    output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: reset && badPerf });
                }

                reset = false;
                startRender = 0;
                const image = await output.getImage();
                if (ctx && image) {
                    ctx.transferFromImageBitmap(image); // display in canvas
                }
            }
        }
    }
}

/**
 * Applies highlights and hides objects in the 3d view based on the object groups provided
 */
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
        | { id: string; ids: ObjectId[]; color: VecRGB | VecRGBA; selected: boolean; hidden: boolean }
        | { id: string; ids: ObjectId[]; neutral: true; hidden: false; selected: true }
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

    const { objectHighlighter } = scene;

    objectHighlighter.objectHighlightIndices.fill(defaultVisibility === ObjectVisibility.Transparent ? 255 : 0);

    const proms: Promise<void>[] = objectGroups
        .filter((group) => group.hidden)
        .map(async (group) => {
            if (!group.ids) {
                store.dispatch(groupsActions.setLoadingIds(true));
                group.ids = await dataApi.getGroupIds(sceneId, group.id);
            }
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = 255;
            }
        });

    proms.push(
        ...objectGroups.map(async (group, index) => {
            if (group.selected) {
                if (!group.ids) {
                    store.dispatch(groupsActions.setLoadingIds(true));
                    group.ids = await dataApi.getGroupIds(sceneId, group.id);
                }

                if (selectionBasket.mode === SelectionBasketMode.Loose) {
                    for (const id of group.ids) {
                        objectHighlighter.objectHighlightIndices[id] = index + 1;
                    }
                } else {
                    for (const id of group.ids) {
                        if (selectionBasket.ids[id]) {
                            objectHighlighter.objectHighlightIndices[id] = index + 1;
                        }
                    }
                }
            }
        })
    );

    await Promise.all(proms).finally(() => {
        objectHighlighter.commit();
        view.settings.objectHighlights = [
            getHighlightByObjectVisibility(defaultVisibility),
            ...objectGroups.map((group) => {
                if ("color" in group) {
                    return api.createHighlight({ kind: "color", color: group.color });
                }

                return getHighlightByObjectVisibility(ObjectVisibility.Neutral);
            }),
        ];
    });

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

export async function waitForSceneToRender(view: View): Promise<void> {
    while (!view.performanceStatistics.renderResolved) {
        await sleep(100);
    }
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

export function serializeableObjectGroups(groups: ObjectGroup[]): CustomGroup[] {
    return groups.map((group) =>
        group.color instanceof Float32Array
            ? { ...group, color: [group.color[0], group.color[1], group.color[2]] }
            : group
    ) as CustomGroup[];
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

export function initHighlighted(groups: ObjectGroup[], dispatch: DispatchHighlighted): void {
    const defaultGroup = groups.find((group) => !group.id && group.selected);

    if (defaultGroup) {
        dispatch(
            highlightActions.set({
                ids: defaultGroup.ids as number[],
                color: [defaultGroup.color[0], defaultGroup.color[1], defaultGroup.color[2]],
            })
        );

        const lastHighlighted = defaultGroup.ids?.slice(-1)[0];
        if (lastHighlighted) {
            store.dispatch(renderActions.setMainObject(lastHighlighted));
        }
    } else {
        dispatch(highlightActions.setIds([]));
        store.dispatch(renderActions.setMainObject(undefined));
    }
}

export function initHidden(groups: ObjectGroup[], dispatch: DispatchHidden): void {
    const defaultHiddenGroup = groups.find((group) => !group.id && group.hidden);

    if (defaultHiddenGroup) {
        dispatch(hiddenGroupActions.setIds(defaultHiddenGroup.ids as number[]));
    } else {
        dispatch(hiddenGroupActions.setIds([]));
    }
}

export function initCustomGroups(groups: ObjectGroup[], dispatch: DispatchCustomGroups): void {
    const customGroups = groups.filter((group) => group.id);

    if (customGroups.length) {
        dispatch(customGroupsActions.set(serializeableObjectGroups(customGroups)));
    } else {
        dispatch(customGroupsActions.set([]));
    }
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
        flightControllerRef.current = controller;
    } else if (!flightControllerRef.current) {
        flightControllerRef.current = {
            ...api.createCameraController({ kind: "flight" }, canvas),
            autoZoomToScene: false,
            enabled: false,
        };

        store.dispatch(
            renderActions.setBaseCameraSpeed(
                (flightControllerRef.current.params as Required<FlightControllerParams>).linearVelocity
            )
        );
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
        store.dispatch(renderActions.setBaseCameraSpeed(controller.params.linearVelocity));
    } else if (controller.params.kind === "ortho") {
        store.dispatch(renderActions.setCamera({ type: CameraType.Orthographic }));
    }

    return controller;
}

export function initClippingBox(clipping: RenderSettings["clippingPlanes"]): void {
    // highlight is sometimes saved as null and crashes render
    clipping.highlight = clipping.highlight ?? -1;

    store.dispatch(
        renderActions.setClippingBox({
            enabled: clipping.enabled,
            inside: clipping.inside,
            showBox: clipping.showBox,
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

export function initDeviation(deviation: RenderSettings["points"]["deviation"]): void {
    store.dispatch(
        deviationsActions.setDeviations({
            mode: deviation.mode as DeviationMode,
            colors: deviation.colors
                .map((c) => ({ ...c, color: Array.from(c.color) as VecRGBA }))
                .sort((a, b) => b.deviation - a.deviation),
        })
    );
}

export function initAdvancedSettings(view: View, customProperties: Record<string, any>): void {
    const { diagnostics, advanced, points, light, terrain } = view.settings as Internal.RenderSettingsExt;
    const cameraParams = view.camera.controller.params as FlightControllerParams | OrthoControllerParams;

    store.dispatch(
        renderActions.setAdvancedSettings({
            [AdvancedSetting.ShowPerformance]: Boolean(customProperties?.showStats),
            [AdvancedSetting.AutoFps]: view.settings.quality.resolution.autoAdjust.enabled,
            [AdvancedSetting.TriangleBudget]: view.settings.quality.detail.autoAdjust.enabled,
            [AdvancedSetting.ShowBoundingBoxes]: diagnostics.showBoundingBoxes,
            [AdvancedSetting.HoldDynamic]: diagnostics.holdDynamic,
            [AdvancedSetting.DoubleSidedMaterials]: advanced.doubleSided.opaque,
            [AdvancedSetting.DoubleSidedTransparentMaterials]: advanced.doubleSided.transparent,
            [AdvancedSetting.CameraFarClipping]: cameraParams.far,
            [AdvancedSetting.CameraNearClipping]: cameraParams.kind === "flight" ? cameraParams.near : 0.1,
            [AdvancedSetting.QualityPoints]: points.shape === "disc",
            [AdvancedSetting.PointSize]: points.size.pixel ?? 1,
            [AdvancedSetting.MaxPointSize]: points.size.maxPixel ?? 20,
            [AdvancedSetting.PointToleranceFactor]: points.size.toleranceFactor ?? 0,
            [AdvancedSetting.HeadlightIntensity]: light.camera.brightness,
            [AdvancedSetting.HeadlightDistance]: light.camera.distance,
            [AdvancedSetting.AmbientLight]: light.ambient.brightness,
            [AdvancedSetting.NavigationCube]: Boolean(customProperties?.navigationCube),
            [AdvancedSetting.TerrainAsBackground]: Boolean(terrain.asBackground),
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
        })
    );
}

export async function pickDeviationArea({
    measure,
    size,
    clickX,
    clickY,
}: {
    measure: View["measure"];
    size: number;
    clickX: number;
    clickY: number;
}): Promise<number | undefined> {
    const center = await measure(clickX, clickY);

    if (center?.deviation) {
        return center.deviation;
    }

    const startX = clickX - size / 2;
    const startY = clickY - size / 2;
    const res = [] as Promise<MeasureInfo | undefined>[];

    for (let x = 1; x <= size; x++) {
        for (let y = 1; y <= size; y++) {
            res.push(measure(startX + x, startY + y));
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

export function inversePixelRatio(points: vec2[]): vec2[] {
    return points.map((pts) => vec2.scale(vec2.create(), pts, 1 / devicePixelRatio));
}
