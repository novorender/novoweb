import { Permission } from "apis/dataV2/permissions";

export const canvasContextMenuConfig = {
    hide: {
        key: "hide",
        name: "Hide",
        permission: Permission.ContextHide,
    },
    hideLayer: {
        key: "hideLayer",
        name: "Hide class / layer",
        permission: Permission.ContextHideLayer,
    },
    addFileToBasket: {
        key: "addFileToBasket",
        name: "Add file to selection basket",
        permission: Permission.ContextAddFileToBasket,
    },
    measure: {
        key: "measure",
        name: "Measure",
        permission: Permission.ContextMeasure,
    },
    pointLine: {
        key: "pointLine",
        name: "Point line",
        permission: Permission.ContextPointLine,
    },
    pickPoint: {
        key: "pickPoint",
        name: "Pick point",
        permission: Permission.ContextPickPoint,
    },
    area: {
        key: "area",
        name: "Area",
        permission: Permission.ContextArea,
    },
    laser: {
        key: "laser",
        name: "Laser",
        permission: Permission.ContextLaser,
    },
    clip: {
        key: "clip",
        name: "Add clipping plane",
        permission: Permission.ContextClip,
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
