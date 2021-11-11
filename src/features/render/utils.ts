import { ObjectGroup } from "@novorender/data-js-api";
import { EnvironmentDescription, Highlight, Internal, ObjectId, Scene, View } from "@novorender/webgl-api";

import { api } from "app";
import { offscreenCanvas } from "config";
import { StorageKey } from "config/storage";
import { CustomGroup } from "contexts/customGroups";
import { ObjectVisibility, RenderType } from "slices/renderSlice";
import { deleteFromStorage, saveToStorage } from "utils/storage";
import { sleep } from "utils/timers";
import { ssaoEnabled, taaEnabled } from "./consts";

export function createRendering(
    canvas: HTMLCanvasElement,
    view: View
): {
    start: () => Promise<void>;
    stop: () => void;
} {
    const running = { current: false };

    return { start, stop };

    function stop() {
        running.current = false;
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    }

    async function start() {
        running.current = true;

        const ctx = offscreenCanvas ? canvas.getContext("2d", { alpha: true, desynchronized: false }) : undefined;

        const fpsTable: number[] = [];
        let noBlankFrame = true;
        function blankCallback() {
            noBlankFrame = false;
        }

        while (running.current) {
            noBlankFrame = true;
            const startRender = performance.now();
            const output = await view.render(blankCallback);

            if (!running.current) {
                break;
            }

            const { width, height } = canvas;
            const badPerf = view.performanceStatistics.weakDevice; // || view.settings.quality.resolution.value < 1;

            if (ssaoEnabled && !badPerf) {
                output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: true });
            }

            const image = await output.getImage();

            if (!running.current) {
                break;
            }

            if (ctx && image) {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                // ctx.transferFromImageBitmap(image); // display in canvas
            }

            if (noBlankFrame) {
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
            }

            let run = taaEnabled;
            let reset = true;
            const start = performance.now();
            while (run && running.current) {
                if (output.hasViewChanged) {
                    break;
                }

                await (api as any).waitFrame();

                if (performance.now() - start < 500) {
                    continue;
                }

                run = (await output.applyPostEffect({ kind: "taa", reset })) || false;

                if (!running.current) {
                    break;
                }

                if (ssaoEnabled) {
                    output.applyPostEffect({ kind: "ssao", samples: 64, radius: 1, reset: reset && badPerf });
                }

                reset = false;
                const image = await output.getImage();
                if (ctx && image) {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(image, 0, 0, width, height); // display in canvas (work on all platforms, but might be less performant)
                    // ctx.transferFromImageBitmap(image); // display in canvas
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
        | { ids: ObjectId[]; color: [number, number, number]; selected: boolean; hidden: boolean }
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

    await waitForSceneToRender(view);

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

export function addConsoleDebugUtils(): void {
    window.showStats = (val?: boolean) =>
        val !== false
            ? saveToStorage(StorageKey.ShowPerformanceStats, "true")
            : deleteFromStorage(StorageKey.ShowPerformanceStats);

    window.disableTaa = (val?: boolean) =>
        val !== false ? saveToStorage(StorageKey.DisableTaa, "true") : deleteFromStorage(StorageKey.DisableTaa);

    window.disableSsao = (val?: boolean) =>
        val !== false ? saveToStorage(StorageKey.DisableSssao, "true") : deleteFromStorage(StorageKey.DisableSssao);
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
