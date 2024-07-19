import { ProjectInfo } from "apis/dataV2/projectTypes";
import { CanvasContextMenuFeatureKey } from "config/canvasContextMenu";
import { defaultEnabledWidgets, featuresConfig, WidgetKey } from "config/features";
import { uniqueArray } from "utils/misc";

import { PrimaryMenuConfigType, SceneType, UserRole } from "./types";

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
        role = projectV2Info.permissions.has("scene:manage") ? "administrator" : "viewer";
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
