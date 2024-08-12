import "../i18n";

import {
    AccountTreeRounded,
    Attachment,
    Ballot,
    BlurOn,
    Cameraswitch,
    Category,
    CheckBox,
    ColorLens,
    CropLandscape,
    Domain,
    DownloadForOffline,
    FiberSmartRecord,
    FlightTakeoff,
    Folder,
    GpsFixed,
    Gradient,
    Height,
    Home,
    Image,
    Layers,
    LinearScale,
    List,
    MyLocation,
    Person,
    Public,
    Redo,
    RestartAlt,
    RouteOutlined,
    Search,
    Settings,
    Share,
    SquareFoot,
    Star,
    Straighten,
    Timeline,
    Undo,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";
import { t } from "i18next";

import ClashIcon from "media/icons/clash.svg?react";
import Ditio from "media/icons/ditio.svg?react";
import Jira from "media/icons/jira-software.svg?react";
import NewformaKonekt from "media/icons/newforma-konekt.svg?react";
import Run from "media/icons/run.svg?react";

export enum FeatureType {
    Button,
    Widget,
    AdminWidget,
    Tag,
}

export const featureTags = {
    review: {
        key: "review",
        name: t("review"),
        Icon: Straighten,
        type: FeatureType.Tag,
    },
} as const;

export const featuresConfig = {
    omegaPims365: {
        // Previous component was called Omega 365, but then it got renamed to PIMS
        // and we have another Omega 365 component now
        key: "omegaPims365",
        name: t("pims"),
        Icon: Attachment,
        type: FeatureType.Widget,
        // NOTE(OLA): POC! Enable only for nye veier
        defaultLocked: true,
        offline: false,
    },
    omega365: {
        key: "omega365",
        name: t("omega365Name"),
        Icon: Attachment,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    xsiteManage: {
        key: "xsiteManage",
        name: t("xSiteManage"),
        Icon: GpsFixed,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    jira: {
        key: "jira",
        name: t("jira"),
        Icon: Jira,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    area: {
        key: "area",
        name: t("area"),
        Icon: SquareFoot,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    pointLine: {
        key: "pointLine",
        name: t("pointLine"),
        Icon: LinearScale,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    manhole: {
        key: "manhole",
        name: t("manhole"),
        Icon: FiberSmartRecord,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    heightProfile: {
        key: "heightProfile",
        name: t("htProfile"),
        Icon: Timeline,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    user: {
        key: "user",
        name: t("user"),
        Icon: Person,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    rangeSearch: {
        key: "rangeSearch",
        name: t("rangeSearch"),
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    ditio: {
        key: "ditio",
        name: t("ditio"),
        Icon: Ditio,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    myLocation: {
        key: "myLocation",
        name: t("myLocation"),
        Icon: MyLocation,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    bimcollab: {
        key: "bimcollab",
        name: t("bimCollab"),
        Icon: Domain,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    bimTrack: {
        key: "bimTrack",
        name: t("newFormaKonekt"),
        Icon: NewformaKonekt,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    advancedSettings: {
        key: "advancedSettings",
        name: t("advSettings"),
        Icon: Settings,
        type: FeatureType.AdminWidget,
        defaultLocked: false,
        offline: false,
    },
    selectionBasket: {
        key: "selectionBasket",
        name: t("selBasket"),
        Icon: Layers,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    modelTree: {
        key: "modelTree",
        name: t("modelTree"),
        Icon: Category,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    properties: {
        key: "properties",
        name: t("properties"),
        Icon: List,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    propertyTree: {
        key: "propertyTree",
        name: t("propertyTree"),
        Icon: AccountTreeRounded,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    bookmarks: {
        key: "bookmarks",
        name: t("bookmarks"),
        Icon: Star,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    groups: {
        key: "groups",
        name: t("groups"),
        Icon: Folder,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    search: {
        key: "search",
        name: t("search"),
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    measure: {
        key: "measure",
        name: t("measure"),
        Icon: Straighten,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    outlineLaser: {
        key: "outlineLaser",
        name: t("outlineLaser"),
        Icon: Height,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    shareLink: {
        key: "shareLink",
        name: t("shareLink"),
        Icon: Share,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    clippingPlanes: {
        key: "clippingPlanes",
        name: t("clippingPlane"),
        Icon: CropLandscape,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    orthoCam: {
        key: "orthoCam",
        name: t("2D"),
        Icon: Cameraswitch,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    images: {
        key: "images",
        name: t("images"),
        Icon: Image,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    deviations: {
        key: "deviations",
        name: t("deviations"),
        Icon: BlurOn,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
        dependencies: {
            subtrees: [["points"]],
        },
    },
    followPath: {
        key: "followPath",
        name: t("followPath"),
        Icon: RouteOutlined,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    home: {
        key: "home",
        name: t("home"),
        Icon: Home,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    stepBack: {
        key: "stepBack",
        name: t("stepBack"),
        Icon: Undo,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    stepForwards: {
        key: "stepForwards",
        name: t("stepForwards"),
        Icon: Redo,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    orthoShortcut: {
        key: "orthoShortcut",
        name: t("2dShortcut"),
        Icon: Cameraswitch,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    cameraSpeed: {
        key: "cameraSpeed",
        name: t("cameraSpeed"),
        Icon: Run,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    flyToSelected: {
        key: "flyToSelected",
        name: t("flyToSelected"),
        Icon: FlightTakeoff,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: false,
    },
    multipleSelection: {
        key: "multipleSelection",
        name: t("multipleSelection"),
        Icon: Layers,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    selectionColor: {
        key: "selectionColor",
        name: t("selectionColor"),
        Icon: ColorLens,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    viewOnlySelected: {
        key: "viewOnlySelected",
        name: t("viewOnlySelected"),
        Icon: Visibility,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    hideSelected: {
        key: "hideSelected",
        name: t("hideSelected"),
        Icon: VisibilityOff,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    clearView: {
        key: "clearView",
        name: t("clear"),
        Icon: RestartAlt,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    clearSelection: {
        key: "clearSelection",
        name: t("clearSelection"),
        Icon: CheckBox,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    toggleSubtrees: {
        key: "toggleSubtrees",
        name: t("toggleRenderTypes"),
        Icon: Gradient,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    offline: {
        key: "offline",
        name: t("offline"),
        Icon: DownloadForOffline,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: true,
    },
    arcgis: {
        key: "arcgis",
        name: t("arcGis"),
        Icon: Public,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    forms: {
        key: "forms",
        name: t("forms"),
        Icon: Ballot,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    clash: {
        key: "clash",
        name: t("clash"),
        Icon: ClashIcon,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        tags: [featureTags.review.key],
        beta: true,
    },
    settings: {
        key: "settings",
        name: t("settings"),
        Icon: Settings,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
} as const;

type Config = typeof featuresConfig;
type Tags = typeof featureTags;

export type FeatureKey = keyof Config;
export type FeatureTagKey = keyof Tags;

export type WidgetKey = {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget | FeatureType.AdminWidget ? K : never;
}[keyof Config];
export type ButtonKey = {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Button ? K : never;
}[keyof Config];

export type Widget = Config[WidgetKey];
export type FeatureTag = Tags[FeatureTagKey];

export const defaultEnabledWidgets = [featuresConfig.user.key, featuresConfig.settings.key] as WidgetKey[];
export const allWidgets = Object.values(featuresConfig)
    .filter((widget) => [FeatureType.AdminWidget, FeatureType.Widget].includes(widget.type))
    .map((widget) => widget.key as WidgetKey);
export const defaultEnabledAdminWidgets = Object.values(featuresConfig)
    .filter((widget) => [FeatureType.AdminWidget].includes(widget.type))
    .map((widget) => widget.key as WidgetKey)
    .concat(defaultEnabledWidgets);
export const defaultLockedWidgets = Object.values(featuresConfig)
    .filter((widget) => widget.defaultLocked)
    .map((widget) => widget.key as WidgetKey);

export const viewerWidgets = Object.values(featuresConfig).filter((widget) => widget.type === FeatureType.Widget) as {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget ? Config[K] : never;
}[keyof Config][];
export const releasedViewerWidgets = viewerWidgets.filter((w) => !("beta" in w) || !w.beta);
export const betaViewerWidgets = viewerWidgets.filter((w) => "beta" in w && w.beta);
