import { Permission } from "apis/dataV2/permissions";
import { ProjectInfo } from "apis/dataV2/projectTypes";
import { CanvasContextMenuFeatureKey } from "config/canvasContextMenu";
import { defaultEnabledWidgets, featuresConfig, WidgetKey } from "config/features";
import { uniqueArray } from "utils/misc";

import { PositionedWidgetState, PrimaryMenuConfigType, SceneType, UserRole } from "./types";

export function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): WidgetKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        measurement: [featuresConfig.measure.key, featuresConfig.orthoCam.key],
        clipping: [
            // featuresConfig.clippingBox.key,
            featuresConfig.clippingPlanes.key,
        ],
        tree: featuresConfig.modelTree.key,
        layers: [featuresConfig.selectionBasket.key],
    };

    if (enabledFeatures.disableLink === false && enabledFeatures.shareLink !== false) {
        enabledFeatures.shareLink = true;
    }

    return uniqueArray(
        Object.keys(enabledFeatures)
            .map((key) => ({ key, enabled: enabledFeatures[key] }))
            .filter((feature) => feature.enabled)
            .map((feature) => (dictionary[feature.key] ? dictionary[feature.key] : feature.key))
            .concat(defaultEnabledWidgets)
            .flat() as WidgetKey[]
    );
}

export function getEnabledFeatures(customProperties: unknown): WidgetKey[] {
    const features =
        customProperties && typeof customProperties === "object" && "enabledFeatures" in customProperties
            ? (customProperties as { enabledFeatures?: Record<string, boolean> }).enabledFeatures
            : undefined;

    return features ? enabledFeaturesToFeatureKeys(features) : [];
}

export function getSceneType(customProperties: unknown): SceneType {
    return customProperties && typeof customProperties === "object" && "isViewer" in customProperties
        ? (customProperties as { isViewer: boolean }).isViewer
            ? SceneType.Viewer
            : SceneType.Admin
        : SceneType.Admin;
}

export function getRequireConsent(customProperties: unknown): boolean {
    if (!customProperties || typeof customProperties !== "object") {
        return false;
    }

    if ("requireConsent" in customProperties) {
        return (customProperties as { requireConsent: boolean }).requireConsent;
    } else if ("enabledFeatures" in customProperties) {
        return Boolean(
            (customProperties as { enabledFeatures?: { requireConsent?: boolean } })?.enabledFeatures?.requireConsent
        );
    }

    return false;
}

export function getUserRole(customProperties: unknown, projectV2Info: ProjectInfo | null): UserRole {
    let role =
        customProperties && typeof customProperties === "object" && "role" in customProperties
            ? (customProperties as { role: string }).role
            : "administrator";
    if (role !== "owner" && projectV2Info) {
        role =
            projectV2Info.permissions.includes(Permission.SceneManage) ||
            projectV2Info.permissions.includes(Permission.Scene)
                ? "administrator"
                : "viewer";
    }
    return role === "owner" ? UserRole.Owner : role === "administrator" ? UserRole.Admin : UserRole.Viewer;
}

export function getPrimaryMenu(customProperties: unknown): PrimaryMenuConfigType | undefined {
    return customProperties && typeof customProperties === "object" && "primaryMenu" in customProperties
        ? (customProperties as { primaryMenu: PrimaryMenuConfigType }).primaryMenu
        : undefined;
}

export function getCanvasContextMenuFeatures(customProperties: unknown): CanvasContextMenuFeatureKey[] | undefined {
    return customProperties && typeof customProperties === "object" && "canvasContextMenu" in customProperties
        ? (customProperties as { canvasContextMenu: { features: CanvasContextMenuFeatureKey[] } }).canvasContextMenu
              .features
        : undefined;
}

export function getTakenWidgetSlotCount(
    widgets: WidgetKey[],
    maximized: WidgetKey[],
    maximizedHorizontal: WidgetKey[]
) {
    let area = 0;
    for (const widget of widgets) {
        area += (maximized.includes(widget) ? 2 : 1) * (maximizedHorizontal.includes(widget) ? 2 : 1);
    }
    return area;
}

export function getPositionedWidgets({
    widgets,
    gridWidth,
    gridHeight,
    maximized,
    maximizedHorizontal,
}: {
    widgets: WidgetKey[];
    gridWidth: number;
    gridHeight: number;
    maximized: WidgetKey[];
    maximizedHorizontal: WidgetKey[];
}) {
    const grid: number[][] = [];
    for (let i = 0; i < gridHeight; i++) {
        grid.push(new Array(gridWidth).fill(-1));
    }

    return widgets
        .map((widget, index) => {
            const height = maximized.includes(widget) ? 2 : 1;
            const width = maximizedHorizontal.includes(widget) ? 2 : 1;
            const pos = findNextWidgetPlace(grid, width, height);
            if (!pos) {
                return;
            }

            markGrid(grid, pos.x, pos.y, width, height, index);
            return { key: widget, x: pos.x, y: pos.y, width, height };
        })
        .filter((e) => e) as PositionedWidgetState[];
}

function findNextWidgetPlace(grid: number[][], width: number, height: number) {
    for (let x = 0; x <= grid[0].length - width; x++) {
        for (let y = 0; y <= grid.length - height; y++) {
            if (canPlaceAt(grid, x, y, width, height)) {
                return { x, y };
            }
        }
    }
}

function canPlaceAt(grid: number[][], x: number, y: number, width: number, height: number) {
    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            if (grid[y + dy][x + dx] !== -1) {
                return false;
            }
        }
    }
    return true;
}

function markGrid(grid: number[][], x: number, y: number, width: number, height: number, value: number) {
    for (let dx = 0; dx < width; dx++) {
        for (let dy = 0; dy < height; dy++) {
            grid[y + dy][x + dx] = value;
        }
    }
}

export function getNextSlotPos(widgets: PositionedWidgetState[], gridWidth: number, gridHeight: number) {
    for (let x = 0; x < gridWidth; x++) {
        for (let y = 0; y < gridHeight; y++) {
            const hasWidgetAtPos = widgets.some((w) => x >= w.x && x < w.x + w.width && y >= w.y && y < w.y + w.height);
            if (!hasWidgetAtPos) {
                return { x, y };
            }
        }
    }
}
