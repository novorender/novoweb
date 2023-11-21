import {
    AccountTreeRounded,
    Attachment,
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

import { ReactComponent as Ditio } from "media/icons/ditio.svg";
import { ReactComponent as Jira } from "media/icons/jira-software.svg";
import { ReactComponent as NewformaKonekt } from "media/icons/newforma-konekt.svg";
import { ReactComponent as Run } from "media/icons/run.svg";

export enum FeatureType {
    Button,
    Widget,
    AdminWidget,
    Tag,
}

export const featureTags = {
    review: {
        key: "review",
        name: "Review",
        Icon: Straighten,
        type: FeatureType.Tag,
    },
} as const;

export const featuresConfig = {
    omegaPims365: {
        key: "omegaPims365",
        name: "Omega 365",
        Icon: Attachment,
        type: FeatureType.Widget,
        // NOTE(OLA): POC! Enable only for nye veier
        defaultLocked: true,
        offline: false,
    },
    xsiteManage: {
        key: "xsiteManage",
        name: "Xsite Manage",
        Icon: GpsFixed,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    jira: {
        key: "jira",
        name: "Jira",
        Icon: Jira,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    area: {
        key: "area",
        name: "Area",
        Icon: SquareFoot,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    pointLine: {
        key: "pointLine",
        name: "Point line",
        Icon: LinearScale,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    manhole: {
        key: "manhole",
        name: "Manhole",
        Icon: FiberSmartRecord,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    heightProfile: {
        key: "heightProfile",
        name: "Ht. profile",
        Icon: Timeline,
        type: FeatureType.Widget,
        defaultLocked: false,
        tags: [featureTags.review.key],
        offline: true,
    },
    user: {
        key: "user",
        name: "User",
        Icon: Person,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    rangeSearch: {
        key: "rangeSearch",
        name: "Range search",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    ditio: {
        key: "ditio",
        name: "Ditio",
        Icon: Ditio,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    myLocation: {
        key: "myLocation",
        name: "My location",
        Icon: MyLocation,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    bimcollab: {
        key: "bimcollab",
        name: "BIMcollab",
        Icon: Domain,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    bimTrack: {
        key: "bimTrack",
        name: "Newforma Konekt",
        Icon: NewformaKonekt,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: false,
    },
    advancedSettings: {
        key: "advancedSettings",
        name: "Adv. settings",
        Icon: Settings,
        type: FeatureType.AdminWidget,
        defaultLocked: false,
        offline: false,
    },
    selectionBasket: {
        key: "selectionBasket",
        name: "Sel. basket",
        Icon: Layers,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    modelTree: {
        key: "modelTree",
        name: "Model tree",
        Icon: Category,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    properties: {
        key: "properties",
        name: "Properties",
        Icon: List,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    propertyTree: {
        key: "propertyTree",
        name: "Property tree",
        Icon: AccountTreeRounded,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    bookmarks: {
        key: "bookmarks",
        name: "Bookmarks",
        Icon: Star,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    groups: {
        key: "groups",
        name: "Groups",
        Icon: Folder,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    search: {
        key: "search",
        name: "Search",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    measure: {
        key: "measure",
        name: "Measure",
        Icon: Straighten,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    outlineLaser: {
        key: "outlineLaser",
        name: "Outline laser",
        Icon: Height,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    shareLink: {
        key: "shareLink",
        name: "Share link",
        Icon: Share,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    clippingPlanes: {
        key: "clippingPlanes",
        name: "Clipping plane",
        Icon: CropLandscape,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    orthoCam: {
        key: "orthoCam",
        name: "2D",
        Icon: Cameraswitch,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
    },
    images: {
        key: "images",
        name: "Images",
        Icon: Image,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: false,
    },
    deviations: {
        key: "deviations",
        name: "Deviations",
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
        name: "Follow path",
        Icon: RouteOutlined,
        type: FeatureType.Widget,
        defaultLocked: false,
        offline: true,
        tags: [featureTags.review.key],
    },
    home: {
        key: "home",
        name: "Home",
        Icon: Home,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    stepBack: {
        key: "stepBack",
        name: "Step back",
        Icon: Undo,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    stepForwards: {
        key: "stepForwards",
        name: "Step forwards",
        Icon: Redo,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    orthoShortcut: {
        key: "orthoShortcut",
        name: "2D shortcut",
        Icon: Cameraswitch,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    cameraSpeed: {
        key: "cameraSpeed",
        name: "Camera speed",
        Icon: Run,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    flyToSelected: {
        key: "flyToSelected",
        name: "Fly to selected",
        Icon: FlightTakeoff,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: false,
    },
    multipleSelection: {
        key: "multipleSelection",
        name: "Multiple selection",
        Icon: Layers,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    selectionColor: {
        key: "selectionColor",
        name: "Selection color",
        Icon: ColorLens,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    viewOnlySelected: {
        key: "viewOnlySelected",
        name: "View only selected",
        Icon: Visibility,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    hideSelected: {
        key: "hideSelected",
        name: "Hide selected",
        Icon: VisibilityOff,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    clearView: {
        key: "clearView",
        name: "Clear",
        Icon: RestartAlt,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    clearSelection: {
        key: "clearSelection",
        name: "Clear selection",
        Icon: CheckBox,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    toggleSubtrees: {
        key: "toggleSubtrees",
        name: "Toggle render types",
        Icon: Gradient,
        type: FeatureType.Button,
        defaultLocked: false,
        offline: true,
    },
    offline: {
        key: "offline",
        name: "Offline",
        Icon: DownloadForOffline,
        type: FeatureType.Widget,
        defaultLocked: true,
        offline: true,
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

export const viewerWidgets = Object.values(featuresConfig).filter((widget) => widget.type === FeatureType.Widget) as {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget ? Config[K] : never;
}[keyof Config][];
