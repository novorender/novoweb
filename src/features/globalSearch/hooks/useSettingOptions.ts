import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Permission } from "apis/dataV2/permissions";
import { useAppSelector } from "app/redux-store-interactions";
import { selectSubtrees, SubtreeStatus } from "features/render";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";

import { Category } from "../types";

export function useSettingOptions() {
    const { t } = useTranslation();
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.SceneManage);

    const subtrees = useAppSelector(selectSubtrees);

    return useMemo(() => {
        if (!canManage) {
            return [];
        }

        const showPointSettings = subtrees?.points !== SubtreeStatus.Unavailable;
        const showMeshSettings = subtrees?.triangles !== SubtreeStatus.Unavailable;
        const showLineSettings = subtrees?.lines !== SubtreeStatus.Unavailable;
        const showTerrainSettings = subtrees?.terrain !== SubtreeStatus.Unavailable;
        const showDocumentSettings = subtrees?.documents !== SubtreeStatus.Unavailable;

        return [
            {
                id: "setting-scene-environment",
                route: "/scene",
                accordion: "settings-scene-environment",
                field: "#scene-environment",
                label: `${t("scene")} / ${t("environment")} / ${t("environment")}`,
            },
            {
                id: "setting-scene-blur",
                route: "/scene",
                accordion: "settings-scene-environment",
                field: "#scene-blur",
                label: `${t("scene")} / ${t("environment")} / ${t("blur")}`,
            },
            {
                id: "setting-scene-pick-semi-transparent-objects",
                route: "/scene",
                accordion: "settings-scene-object-picking",
                field: "#scene-pick-semi-transparent-objects",
                label: `${t("scene")} / ${t("objectPicking")} / ${t("pickSemiTransparentObjects")}`,
            },
            {
                id: "setting-scene-2d-background-color",
                route: "/scene",
                field: "#scene-2d-background-color",
                label: `${t("scene")} / ${t("2dBackgroundColor")}`,
            },
            {
                id: "setting-scene-save-default-camera-position",
                route: "/scene",
                field: "#scene-save-default-camera-position",
                label: `${t("scene")} / ${t("saveDefaultCameraPosition")}`,
            },
            {
                id: "setting-features-widgets",
                route: "/features",
                field: "#features-widgets",
                label: `${t("features")} / ${t("widgets")}`,
            },
            {
                id: "setting-features-primary-menu",
                route: "/features",
                field: "#features-primary-menu",
                label: `${t("features")} / ${t("primaryMenu")}`,
            },
            {
                id: "setting-features-context-menu",
                route: "/features",
                field: "#features-context-menu",
                label: `${t("features")} / ${t("contextMenu")}`,
            },
            {
                id: "setting-features-beta",
                route: "/features",
                field: "#features-beta",
                label: `${t("features")} / Beta`,
            },
            {
                id: "setting-features-beta-generated-parametric-data",
                route: "/features",
                accordion: "features-beta",
                field: "#features-beta-generated-parametric-data",
                label: `${t("features")} / Beta / ${t("generatedParametricData")}`,
            },
            {
                id: "setting-features-beta-performance-stats",
                route: "/features",
                accordion: "features-beta",
                field: "#features-beta-performance-stats",
                label: `${t("features")} / Beta / ${t("performanceStats")}`,
            },
            {
                id: "setting-features-beta-new-design",
                route: "/features",
                accordion: "features-beta",
                field: "#features-beta-new-design",
                label: `${t("features")} / Beta / ${t("newDesign")}`,
            },
            {
                id: "setting-features-navigation-cube",
                route: "/features",
                field: "#features-navigation-cube",
                label: `${t("features")} / ${t("navigationCube")}`,
            },
            {
                id: "setting-project-tm-zone",
                route: "/project",
                field: "#project-tm-zone",
                label: `${t("features")} / TM Zone`,
            },
            {
                id: "setting-object-selection-primary-highlight-color",
                route: "/objectSelection",
                field: "#object-selection-primary-highlight-color",
                label: `${t("objectSelection")} / ${t("primaryHighlightColor")}`,
            },
            {
                id: "setting-object-selection-secondary-highlight-color",
                route: "/objectSelection",
                field: "#object-selection-secondary-highlight-color",
                label: `${t("objectSelection")} / ${t("secondaryHighlightColor")}`,
            },
            {
                id: "setting-clipping-breaking-point-threshold",
                route: "/clipping",
                field: "#clipping-breaking-point-threshold",
                label: `${t("clipping")} / ${t("breakingPointThreshold")}`,
            },
            {
                id: "setting-camera-movement-speed",
                route: "/camera",
                field: "#camera-movement-speed",
                label: `${t("camera")} / ${t("movementSpeed")}`,
            },
            {
                id: "setting-camera-proportional-movement-speed",
                route: "/camera",
                field: "#camera-proportional-movement-speed",
                label: `${t("camera")} / ${t("proportionalMovementSpeed")}`,
            },
            {
                id: "setting-camera-controls-controls",
                route: "/camera",
                accordion: "camera-controls",
                field: "#camera-controls-controls",
                label: `${t("camera")} / ${t("controls")} / ${t("controls")}`,
            },
            {
                id: "setting-camera-2d-ortho-pointer-lock",
                route: "/camera",
                accordion: "camera-2d",
                field: "#camera-2d-ortho-pointer-lock",
                label: `${t("camera")} / ${t("2d")} / ${t("resetPointerWhenReleased")}`,
            },
            {
                id: "setting-camera-2d-ortho-de-acceleration",
                route: "/camera",
                accordion: "camera-2d",
                field: "#camera-2d-ortho-de-acceleration",
                label: `${t("camera")} / ${t("2d")} / ${t("gradualDeceleration")}`,
            },
            {
                id: "setting-camera-2d-ortho-touch-rotate",
                route: "/camera",
                accordion: "camera-2d",
                field: "#camera-2d-ortho-touch-rotate",
                label: `${t("camera")} / ${t("2d")} / ${t("twoFingerRotation")}`,
            },
            {
                id: "setting-camera-2d-top-down-snap-to-axis",
                route: "/camera",
                accordion: "camera-2d",
                field: "#camera-2d-top-down-snap-to-axis",
                label: `${t("camera")} / ${t("2d")} / ${t("topDownPointNorth")}`,
            },
            {
                id: "setting-camera-2d-topdown-elevation",
                route: "/camera",
                accordion: "camera-2d",
                field: "#camera-2d-topdown-elevation",
                label: `${t("camera")} / ${t("2d")} / ${t("topDownElevation")}`,
            },
            {
                id: "setting-clipping3d-near",
                route: "/camera",
                accordion: "clipping3d",
                field: "#clipping3d-near",
                label: `${t("camera")} / ${t("clipping3d")} / ${t("nearClipping")}`,
            },
            {
                id: "setting-clipping3d-far",
                route: "/camera",
                accordion: "clipping3d",
                field: "#clipping3d-far",
                label: `${t("camera")} / ${t("clipping3d")} / ${t("farClipping")}`,
            },
            {
                id: "setting-clipping2d-far",
                route: "/camera",
                accordion: "clipping2d",
                field: "#clipping2d-far",
                label: `${t("camera")} / ${t("clipping2d")} / ${t("farClipping")}`,
            },
            {
                id: "setting-render-msaa",
                route: "/render",
                field: "#render-msaa",
                label: `${t("render")} / ${t("antiAliasing")}`,
            },
            {
                id: "setting-render-toon-outline",
                route: "/render",
                field: "#render-toon-outline",
                label: `${t("render")} / ${t("toonOutlines")}`,
            },
            {
                id: "setting-render-toon-outline-each-object",
                route: "/render",
                field: "#render-toon-outline-each-object",
                label: `${t("render")} / ${t("toonOutlineEachObject")}`,
            },
            ...(showPointSettings
                ? [
                      {
                          id: "setting-render-points-show",
                          route: "/render",
                          accordion: "render-points",
                          field: "#render-points-show",
                          label: `${t("render")} / ${t("points")} / ${t("show")}`,
                      },
                      {
                          id: "setting-render-points-size",
                          route: "/render",
                          accordion: "render-points",
                          field: "#render-points-size",
                          label: `${t("render")} / ${t("points")} / ${t("pointSize")}`,
                      },
                      {
                          id: "setting-render-points-max-point-size",
                          route: "/render",
                          accordion: "render-points",
                          field: "#render-points-max-point-size",
                          label: `${t("render")} / ${t("points")} / ${t("maxPointSize")}`,
                      },
                      {
                          id: "setting-render-points-tolerance-factor",
                          route: "/render",
                          accordion: "render-points",
                          field: "#render-points-tolerance-factor",
                          label: `${t("render")} / ${t("points")} / ${t("toleranceFactor")}`,
                      },
                  ]
                : []),
            ...(showLineSettings
                ? [
                      {
                          id: "setting-render-lines-show",
                          route: "/render",
                          accordion: "render-lines",
                          field: "#render-lines-show",
                          label: `${t("render")} / ${t("lines")} / ${t("show")}`,
                      },
                  ]
                : []),
            ...(showTerrainSettings
                ? [
                      {
                          id: "setting-render-terrain-show",
                          route: "/render",
                          accordion: "render-terrain",
                          field: "#render-terrain-show",
                          label: `${t("render")} / ${t("terrain")} / ${t("show")}`,
                      },
                      {
                          id: "setting-render-terrain-as-background",
                          route: "/render",
                          accordion: "render-terrain",
                          field: "#render-terrain-as-background",
                          label: `${t("render")} / ${t("terrain")} / ${t("renderAsBackground")}`,
                      },
                  ]
                : []),
            ...(showDocumentSettings
                ? [
                      {
                          id: "setting-render-document-show",
                          route: "/render",
                          accordion: "render-document",
                          field: "#render-document-show",
                          label: `${t("render")} / ${t("pdf")} / ${t("show")}`,
                      },
                  ]
                : []),
            ...(showMeshSettings
                ? [
                      {
                          id: "setting-render-mesh-show",
                          route: "/render",
                          accordion: "render-mesh",
                          field: "#render-mesh-show",
                          label: `${t("render")} / ${t("mesh")} / ${t("show")}`,
                      },
                  ]
                : []),
            {
                id: "setting-render-light-exposure",
                route: "/render",
                accordion: "render-light",
                field: "#render-light-exposure",
                label: `${t("render")} / ${t("light")} / ${t("lightExposure")}`,
            },
        ].map((item) => {
            return {
                ...item,
                label: item.label.replace(/:$/, ""),
                category: Category.Setting,
            };
        });
    }, [canManage, t, subtrees]);
}
