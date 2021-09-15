import { ObjectGroup } from "@novorender/data-js-api";
import { API, EnvironmentDescription, Internal, Scene, View } from "@novorender/webgl-api";
import { offscreenCanvas } from "config";

import { ObjectGroups, RenderType } from "slices/renderSlice";
import { sleep } from "utils/timers";
import { ssaoEnabled, taaEnabled } from "./consts";

export function createRendering(
    canvas: HTMLCanvasElement,
    view: View,
    api: API
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
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                canvas.width = entry.contentRect.width;
                canvas.height = entry.contentRect.height;
                view.applySettings({ display: { width: canvas.width, height: canvas.height } });
            }
        });

        await sleep(500);
        resizeObserver.observe(canvas);

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
    api,
    scene,
    view,
    objectGroups,
    viewOnlySelected,
}: {
    api: API;
    scene: Scene;
    view: View;
    objectGroups: ObjectGroup[];
    viewOnlySelected: boolean;
}): void {
    if (!view || !scene) {
        return;
    }

    const { objectHighlighter } = scene;

    view.settings.objectHighlights = [
        viewOnlySelected
            ? api.createHighlight({ kind: "transparent", opacity: 0.2 })
            : api.createHighlight({ kind: "neutral" }),
        ...objectGroups.map((group) => api.createHighlight({ kind: "color", color: group.color })),
    ];

    objectHighlighter.objectHighlightIndices.fill(0);

    objectGroups.forEach((group, index) => {
        if (group.selected) {
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = index + 1;
            }
        }
    });

    objectGroups
        .filter((group) => group.hidden)
        .forEach((group) => {
            for (const id of group.ids) {
                objectHighlighter.objectHighlightIndices[id] = 255;
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

export function serializeableObjectGroups(groups: Partial<ObjectGroups>): Partial<ObjectGroups> {
    return Object.fromEntries(
        Object.entries(groups)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => {
                const serializableValue = Array.isArray(value)
                    ? value.map((group) =>
                          group.color instanceof Float32Array
                              ? { ...group, color: [group.color[0], group.color[1], group.color[2]] }
                              : group
                      )
                    : value.color instanceof Float32Array
                    ? { ...value, color: [value.color[0], value.color[1], value.color[2]] }
                    : value;

                return [key, serializableValue];
            })
    );
}

export function addConsoleDebugUtils(): void {
    (window as any).showStats = (val: boolean) =>
        val !== false
            ? localStorage.setItem("show-performance-stats", "true")
            : localStorage.removeItem("show-performance-stats");

    (window as any).disableTaa = (val: boolean) =>
        val !== false ? localStorage.setItem("disable-taa", "true") : localStorage.removeItem("disable-taa");

    (window as any).disableSsao = (val: boolean) =>
        val !== false ? localStorage.setItem("disable-ssao", "true") : localStorage.removeItem("disable-ssao");
}
