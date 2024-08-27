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
        nameKey: "review",
        Icon: Straighten,
        type: FeatureType.Tag,
    },
} as const;

export const featuresConfig = {
    omegaPims365: {
        // Previous component was called Omega 365, but then it got renamed to PIMS
        // and we have another Omega 365 component now
        key: "omegaPims365",
        nameKey: "pims",
        Icon: Attachment,
        type: FeatureType.Widget,
        // NOTE(OLA): POC! Enable only for nye veier
        defaultLocked: true,
        offline: false,
    },
    omega365: {
        key: "omega365",
        nameKey: "omega365Name",
        Icon: Attachment,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    xsiteManage: {
        key: "xsiteManage",
        nameKey: "xSiteManage",
        Icon: GpsFixed,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    jira: {
        key: "jira",
        nameKey: "jira",
        Icon: Jira,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    area: {
        key: "area",
        nameKey: "area",
        Icon: SquareFoot,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    pointLine: {
        key: "pointLine",
        nameKey: "pointLine",
        Icon: LinearScale,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    manhole: {
        key: "manhole",
        nameKey: "manhole",
        Icon: FiberSmartRecord,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    heightProfile: {
        key: "heightProfile",
        nameKey: "htProfile" as string,
        Icon: Timeline,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    user: {
        key: "user",
        nameKey: "user",
        Icon: Person,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    rangeSearch: {
        key: "rangeSearch",
        nameKey: "rangeSearch",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    ditio: {
        key: "ditio",
        nameKey: "ditio",
        Icon: Ditio,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    myLocation: {
        key: "myLocation",
        nameKey: "myLocation",
        Icon: MyLocation,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    bimcollab: {
        key: "bimcollab",
        nameKey: "bimCollab",
        Icon: Domain,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    bimTrack: {
        key: "bimTrack",
        nameKey: "newFormaKonekt",
        Icon: NewformaKonekt,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    advancedSettings: {
        key: "advancedSettings",
        nameKey: "advSettings" as string,
        Icon: Settings,
        type: FeatureType.AdminWidget,
        defaultLocked: false,
        offline: false,
    },
    selectionBasket: {
        key: "selectionBasket",
        nameKey: "selBasket" as string,
        Icon: Layers,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    modelTree: {
        key: "modelTree",
        nameKey: "modelTree",
        Icon: Category,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    properties: {
        key: "properties",
        nameKey: "properties",
        Icon: List,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    propertyTree: {
        key: "propertyTree",
        nameKey: "propertyTree",
        Icon: AccountTreeRounded,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    bookmarks: {
        key: "bookmarks",
        nameKey: "bookmarks",
        Icon: Star,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    groups: {
        key: "groups",
        nameKey: "groups",
        Icon: Folder,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    search: {
        key: "search",
        nameKey: "search",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    measure: {
        key: "measure",
        nameKey: "measure",
        Icon: Straighten,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    outlineLaser: {
        key: "outlineLaser",
        nameKey: "outlineLaser",
        Icon: Height,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    shareLink: {
        key: "shareLink",
        nameKey: "shareLink",
        Icon: Share,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    clippingPlanes: {
        key: "clippingPlanes",
        nameKey: "clippingPlane",
        Icon: CropLandscape,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    orthoCam: {
        key: "orthoCam",
        nameKey: "2D",
        Icon: Cameraswitch,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    images: {
        key: "images",
        nameKey: "images",
        Icon: Image,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    deviations: {
        key: "deviations",
        nameKey: "deviations",
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
        nameKey: "followPath",
        Icon: RouteOutlined,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    home: {
        key: "home",
        nameKey: "home",
        Icon: Home,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    stepBack: {
        key: "stepBack",
        nameKey: "stepBack",
        Icon: Undo,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    stepForwards: {
        key: "stepForwards",
        nameKey: "stepForwards",
        Icon: Redo,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    orthoShortcut: {
        key: "orthoShortcut",
        nameKey: "2dShortcut",
        Icon: Cameraswitch,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    cameraSpeed: {
        key: "cameraSpeed",
        nameKey: "cameraSpeed",
        Icon: Run,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    flyToSelected: {
        key: "flyToSelected",
        nameKey: "flyToSelected",
        Icon: FlightTakeoff,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: false,
    },
    multipleSelection: {
        key: "multipleSelection",
        nameKey: "multipleSelection",
        Icon: Layers,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    selectionColor: {
        key: "selectionColor",
        nameKey: "selectionColor",
        Icon: ColorLens,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    viewOnlySelected: {
        key: "viewOnlySelected",
        nameKey: "viewOnlySelected",
        Icon: Visibility,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    hideSelected: {
        key: "hideSelected",
        nameKey: "hideSelected",
        Icon: VisibilityOff,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    clearView: {
        key: "clearView",
        nameKey: "clear",
        Icon: RestartAlt,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    clearSelection: {
        key: "clearSelection",
        nameKey: "clearSelection",
        Icon: CheckBox,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    toggleSubtrees: {
        key: "toggleSubtrees",
        nameKey: "toggleRenderTypes",
        Icon: Gradient,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    offline: {
        key: "offline",
        nameKey: "offline",
        Icon: DownloadForOffline,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: true,
    },
    arcgis: {
        key: "arcgis",
        nameKey: "arcGis",
        Icon: Public,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    forms: {
        key: "forms",
        nameKey: "forms",
        Icon: Ballot,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    clash: {
        key: "clash",
        nameKey: "clash",
        Icon: ClashIcon,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        tags: [featureTags.review.key],
        beta: true,
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

export const defaultEnabledWidgets = [featuresConfig.user.key] as WidgetKey[];
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

export const viewerWidgets = Object.values(featuresConfig).filter(
    (widget): widget is Widget => widget.type === FeatureType.Widget,
);
export const releasedViewerWidgets = viewerWidgets.filter((w) => !("beta" in w) || !w.beta);
export const betaViewerWidgets = viewerWidgets.filter((w) => "beta" in w && w.beta);
