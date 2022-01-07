import { ObjectGroup } from "@novorender/data-js-api";
import {
    CameraController,
    CameraControllerParams,
    EnvironmentDescription,
    FlightControllerParams,
    Highlight,
    Internal,
    ObjectId,
    OrthoControllerParams,
    RenderSettings,
    Scene,
    View,
} from "@novorender/webgl-api";

import { api } from "app";
import { store } from "app/store";
import { offscreenCanvas } from "config";
import { CustomGroup, customGroupsActions, DispatchCustomGroups } from "contexts/customGroups";
import { hiddenGroupActions, DispatchHidden } from "contexts/hidden";
import { highlightActions, DispatchHighlighted } from "contexts/highlighted";
import { MutableRefObject } from "react";
import { AdvancedSetting, CameraType, ObjectVisibility, renderActions, RenderType } from "slices/renderSlice";
import { VecRGB, VecRGBA } from "utils/color";
import { sleep } from "utils/timers";

type Settings = {
    taaEnabled: boolean;
    ssaoEnabled: boolean;
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
    const settings = { ssaoEnabled: true, taaEnabled: true };

    return { start, stop, update };

    function update(updated: Partial<Settings>) {
        settings.ssaoEnabled = updated.ssaoEnabled !== undefined ? updated.ssaoEnabled : settings.ssaoEnabled;
        settings.taaEnabled = updated.taaEnabled !== undefined ? updated.taaEnabled : settings.taaEnabled;

        if (settings.ssaoEnabled !== updated.ssaoEnabled || settings.taaEnabled !== updated.taaEnabled) {
            (view as any).settings.generation++;
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
        // let noBlankFrame = true;
        let startRender = 0;
        let fps = 0;
        function blankCallback() {
            // noBlankFrame = false;
        }

        while (running.current) {
            // noBlankFrame = true;
            const output = await view.render(blankCallback);

            if (!running.current) {
                break;
            }

            // const { width, height } = canvas;
            const badPerf = view.performanceStatistics.weakDevice; // || view.settings.quality.resolution.value < 1;

            if (settings.ssaoEnabled && !badPerf) {
                output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: true });
            }

            const image = await output.getImage();

            if (!running.current) {
                break;
            }

            if (ctx && image) {
                // ctx.clearRect(0, 0, width, height);
                // ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                ctx.transferFromImageBitmap(image); // display in canvas
            }

            /* if (noBlankFrame) {
                const dt = performance.now() - startRender;
                fpsTable.splice(0, 0, 1000 / dt);
                if (fpsTable.length > 200) {
                    fpsTable.length = 200;
                }
                let fps = 0;
                for (let f of fpsTable) {
                    fps += f;
                }
                fps /= fpsTable.length;
                (view.performanceStatistics as any).fps = fps;
            } */

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

                /*  if (performance.now() - start < 500) {
                    continue;
                } */

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
                    // ctx.clearRect(0, 0, width, height);
                    // ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                    ctx.transferFromImageBitmap(image); // display in canvas
                }
            }
            (output as any).dispose();
        }
    }
}

/**
 * Applies highlights and hides objects in the 3d view based on the object groups provided
 */
export function refillObjects({
    scene,
    view,
    objectGroups,
    defaultVisibility,
}: {
    scene: Scene;
    view: View;
    objectGroups: (
        | { ids: ObjectId[]; color: VecRGB | VecRGBA; selected: boolean; hidden: boolean }
        | { ids: ObjectId[]; neutral: true; hidden: false; selected: true }
    )[];
    defaultVisibility: ObjectVisibility;
}): void {
    if (!view || !scene) {
        return;
    }

    const { objectHighlighter } = scene;

    view.settings.objectHighlights = [
        getHighlightByObjectVisibility(defaultVisibility),
        ...objectGroups.map((group) => {
            if ("color" in group) {
                return api.createHighlight({ kind: "color", color: group.color });
            }

            return getHighlightByObjectVisibility(ObjectVisibility.Neutral);
        }),
    ];

    objectHighlighter.objectHighlightIndices.fill(defaultVisibility === ObjectVisibility.Transparent ? 255 : 0);

    objectGroups
        .filter((group) => group.hidden)
        .forEach((group) => {
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = 255;
            }
        });

    objectGroups.forEach((group, index) => {
        if (group.selected) {
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = index + 1;
            }
        }
    });

    objectHighlighter.commit();
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

export async function getRenderType(view: View): Promise<RenderType> {
    if (!("advanced" in view.settings)) {
        return RenderType.UnChangeable;
    }

    // should be waitForSceneToRender(view), but big scenes require a stopped camera for a long time to finish rendering
    await sleep(1500);

    const advancedSettings = (view.settings as Internal.RenderSettingsExt).advanced;
    const points = advancedSettings.hidePoints || view.performanceStatistics.points > 0;
    const triangles = advancedSettings.hideTriangles || view.performanceStatistics.triangles > 1000;
    const canChange = points && triangles;

    return !canChange
        ? RenderType.UnChangeable
        : advancedSettings.hidePoints
        ? RenderType.Triangles
        : advancedSettings.hideTriangles
        ? RenderType.Points
        : RenderType.All;
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

        const lastHighlighted = defaultGroup.ids.slice(-1)[0];
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
}: {
    camera: CameraControllerParams;
    canvas: HTMLCanvasElement;
    flightControllerRef?: MutableRefObject<CameraController | undefined>;
    view: View;
}): CameraController {
    const controller = api.createCameraController(camera as any, canvas);

    if (camera) {
        controller.autoZoomToScene = false;
    }

    if (flightControllerRef) {
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

export function initAdvancedSettings(view: View, customProperties: any): void {
    const { diagnostics, advanced, points } = view.settings as Internal.RenderSettingsExt;
    const cameraParams = view.camera.controller.params as FlightControllerParams | OrthoControllerParams;
    const isProd = window.location.origin !== "https://explorer.novorender.com";

    store.dispatch(
        renderActions.setAdvancedSettings({
            [AdvancedSetting.ShowPerformance]: Boolean(isProd && customProperties?.showStats),
            [AdvancedSetting.AutoFps]: view.settings.quality.resolution.autoAdjust.enabled,
            [AdvancedSetting.TriangleBudget]: view.settings.quality.detail.autoAdjust.enabled,
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
        })
    );
}
