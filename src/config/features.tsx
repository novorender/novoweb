import {
    AccountTree,
    AccountTreeRounded,
    Attachment,
    Ballot,
    BlurOn,
    Cameraswitch,
    Category,
    CheckBox,
    ColorLens,
    ContentCut,
    CropLandscape,
    Domain,
    DownloadForOffline,
    FiberSmartRecord,
    FilterAlt,
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
    Power,
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
    Window,
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
    Group,
}

export const featureTags = {
    review: {
        key: "review",
        nameKey: "review",
        Icon: Straighten,
        type: FeatureType.Tag,
    },
} as const;

export const featureGroups = {
    clipping: {
        key: "clipping",
        name: "Clipping",
        Icon: ContentCut,
        type: FeatureType.Group,
    },
    measure: {
        key: "measure",
        name: "Measure",
        Icon: Straighten,
        type: FeatureType.Group,
    },
    filesAndAttributes: {
        key: "filesAndAttributes",
        name: "Files and attributes",
        Icon: AccountTree,
        type: FeatureType.Group,
    },
    filter: {
        key: "filter",
        name: "Filter",
        Icon: FilterAlt,
        type: FeatureType.Group,
    },
    integrations: {
        key: "integrations",
        name: "Integrations",
        Icon: Power,
        type: FeatureType.Group,
    },
    search: {
        key: "search",
        name: "Search",
        Icon: Search,
        type: FeatureType.Group,
    },
    settings: {
        key: "settings",
        name: "Settings",
        Icon: Settings,
        type: FeatureType.Group,
    },
    other: {
        key: "other",
        name: "Other",
        Icon: Window,
        type: FeatureType.Group,
    },
    favorites: {
        key: "favorites",
        name: "Favorites",
        Icon: Star,
        type: FeatureType.Group,
    },
} as const;

export type FeatureGroupKey = keyof typeof featureGroups;

export const favoritesVirtualGroup = {
    key: "favorites",
    name: "Favorites",
    Icon: Star,
    type: FeatureType.Group,
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
        groups: [featureGroups.integrations.key],
    },
    omega365: {
        key: "omega365",
        nameKey: "omega365Name",
        Icon: Attachment,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    xsiteManage: {
        key: "xsiteManage",
        nameKey: "xSiteManage",
        Icon: GpsFixed,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    jira: {
        key: "jira",
        nameKey: "jira",
        Icon: Jira,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    area: {
        key: "area",
        nameKey: "area",
        Icon: SquareFoot,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
        offline: true,
    },
    pointLine: {
        key: "pointLine",
        nameKey: "pointLine",
        Icon: LinearScale,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
        offline: true,
    },
    manhole: {
        key: "manhole",
        nameKey: "manhole",
        Icon: FiberSmartRecord,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
        offline: true,
    },
    heightProfile: {
        key: "heightProfile",
        nameKey: "htProfile" as string,
        Icon: Timeline,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
        offline: true,
    },
    user: {
        key: "user",
        nameKey: "user",
        Icon: Person,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.settings.key],
    },
    rangeSearch: {
        key: "rangeSearch",
        nameKey: "rangeSearch",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.search.key],
    },
    ditio: {
        key: "ditio",
        nameKey: "ditio",
        Icon: Ditio,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    myLocation: {
        key: "myLocation",
        nameKey: "myLocation",
        Icon: MyLocation,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.other.key],
    },
    bimcollab: {
        key: "bimcollab",
        nameKey: "bimCollab",
        Icon: Domain,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    bimTrack: {
        key: "bimTrack",
        nameKey: "newFormaKonekt",
        Icon: NewformaKonekt,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    advancedSettings: {
        key: "advancedSettings",
        nameKey: "advSettings" as string,
        Icon: Settings,
        type: FeatureType.AdminWidget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.settings.key],
    },
    selectionBasket: {
        key: "selectionBasket",
        nameKey: "selBasket" as string,
        Icon: Layers,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.filesAndAttributes.key],
    },
    modelTree: {
        key: "modelTree",
        nameKey: "modelTree",
        Icon: Category,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.filesAndAttributes.key],
    },
    properties: {
        key: "properties",
        nameKey: "properties",
        Icon: List,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.filesAndAttributes.key],
    },
    propertyTree: {
        key: "propertyTree",
        nameKey: "propertyTree",
        Icon: AccountTreeRounded,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.filesAndAttributes.key],
    },
    bookmarks: {
        key: "bookmarks",
        nameKey: "bookmarks",
        Icon: Star,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.filter.key],
    },
    groups: {
        key: "groups",
        nameKey: "groups",
        Icon: Folder,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.filter.key],
    },
    search: {
        key: "search",
        nameKey: "search",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.search.key],
    },
    measure: {
        key: "measure",
        nameKey: "measure",
        Icon: Straighten,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
    },
    outlineLaser: {
        key: "outlineLaser",
        nameKey: "outlineLaser",
        Icon: Height,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
    },
    shareLink: {
        key: "shareLink",
        nameKey: "shareLink",
        Icon: Share,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.filter.key],
    },
    clippingPlanes: {
        key: "clippingPlanes",
        nameKey: "clippingPlane",
        Icon: CropLandscape,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.clipping.key],
    },
    orthoCam: {
        key: "orthoCam",
        nameKey: "2D",
        Icon: Cameraswitch,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        groups: [featureGroups.other.key],
    },
    images: {
        key: "images",
        nameKey: "images",
        Icon: Image,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
        groups: [featureGroups.filesAndAttributes.key],
    },
    deviations: {
        key: "deviations",
        nameKey: "deviations",
        Icon: BlurOn,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
        groups: [featureGroups.measure.key],
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
        groups: [featureGroups.measure.key],
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
        groups: [featureGroups.settings.key],
    },
    arcgis: {
        key: "arcgis",
        nameKey: "arcGis",
        Icon: Public,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.integrations.key],
    },
    forms: {
        key: "forms",
        nameKey: "forms",
        Icon: Ballot,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
        groups: [featureGroups.filesAndAttributes.key],
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
