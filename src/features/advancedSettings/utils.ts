import { Internal, View } from "@novorender/webgl-api";

export function toggleAutoFps(view: View): void {
    const { resolution } = view.settings.quality;

    if (resolution.autoAdjust) {
        resolution.autoAdjust.enabled = !resolution.autoAdjust.enabled;
        return;
    }

    view.applySettings({
        quality: {
            resolution: { autoAdjust: { enabled: true, min: 0.2, max: 1 }, value: resolution.value },
            detail: view.settings.quality.detail,
        },
    });
}

export function toggleShowBoundingBox(view: View): void {
    const { diagnostics } = view.settings as Internal.RenderSettingsExt;
    diagnostics.showBoundingBoxes = !diagnostics.showBoundingBoxes;
}

export function toggleDoubleSidedMaterials(view: View): void {
    const {
        advanced: { doubleSided },
    } = view.settings as Internal.RenderSettingsExt;

    doubleSided.opaque = !doubleSided.opaque;
}

export function toggleDoubleSidedTransparentMaterials(view: View): void {
    const {
        advanced: { doubleSided },
    } = view.settings as Internal.RenderSettingsExt;

    doubleSided.transparent = !doubleSided.transparent;
}

export function toggleHoldDynamic(view: View): void {
    const { diagnostics } = view.settings as Internal.RenderSettingsExt;

    diagnostics.holdDynamic = !diagnostics.holdDynamic;
}

export function toggleTriangleBudget(view: View): void {
    const { detail } = view.settings.quality;

    if (detail.autoAdjust) {
        detail.autoAdjust.enabled = !detail.autoAdjust.enabled;
        return;
    }

    view.applySettings({
        quality: {
            detail: { autoAdjust: { enabled: true, min: -1, max: 1 }, value: detail.value },
            resolution: view.settings.quality.resolution,
        },
    });
}

export function toggleQualityPoints(view: View): void {
    const { points } = view.settings as Internal.RenderSettingsExt;
    points.shape = points.shape === "disc" ? "square" : "disc";
}

export function toggleTerrainAsBackground(view: View): void {
    const { terrain } = view.settings;
    terrain.asBackground = !terrain.asBackground;
}
