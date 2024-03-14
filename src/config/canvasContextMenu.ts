export const canvasContextMenuConfig = {
    hide: {
        key: "hide",
        name: "Hide",
    },
    hideLayer: {
        key: "hideLayer",
        name: "Hide class / layer",
    },
    addFileToBasket: {
        key: "addFileToBasket",
        name: "Add file to selection basket",
    },
    measure: {
        key: "measure",
        name: "Measure",
    },
    pointLine: {
        key: "pointLine",
        name: "Point line",
    },
    pickPoint: {
        key: "pickPoint",
        name: "Pick point",
    },
    area: {
        key: "area",
        name: "Area",
    },
    laser: {
        key: "laser",
        name: "Laser",
    },
    clip: {
        key: "clip",
        name: "Add clipping plane",
    },
} as const;

const config = canvasContextMenuConfig;
export const canvasContextMenuFeatures = Object.values(config);
export type CanvasContextMenuFeatureKey = keyof typeof config;
export const defaultCanvasContextMenuFeatures = [
    canvasContextMenuConfig.hide.key,
    canvasContextMenuConfig.hideLayer.key,
    canvasContextMenuConfig.addFileToBasket.key,
    canvasContextMenuConfig.measure.key,
    canvasContextMenuConfig.area.key,
    canvasContextMenuConfig.pickPoint.key,
    canvasContextMenuConfig.pointLine.key,
    canvasContextMenuConfig.laser.key,
    canvasContextMenuConfig.clip.key,
] as CanvasContextMenuFeatureKey[];
