import { Internal, View } from "@novorender/webgl-api";

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

export function toggleQualityPoints(view: View): void {
    const { points } = view.settings as Internal.RenderSettingsExt;
    points.shape = points.shape === "disc" ? "square" : "disc";
}

export function toggleTerrainAsBackground(view: View): void {
    const { terrain } = view.settings;
    terrain.asBackground = !terrain.asBackground;
}
