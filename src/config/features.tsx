import {
    AccountTreeRounded,
    BlurOn,
    Cameraswitch,
    Category,
    CheckBox,
    ColorLens,
    CropLandscape,
    Domain,
    FlightTakeoff,
    Folder,
    Gradient,
    Home,
    Layers,
    List,
    Movie,
    MyLocation,
    Redo,
    RouteOutlined,
    Search,
    Settings,
    Share,
    Star,
    Straighten,
    Undo,
    Visibility,
    VisibilityOff,
    VrpanoOutlined,
} from "@mui/icons-material";

import { ReactComponent as Clipping } from "media/icons/clipping.svg";
import { ReactComponent as Run } from "media/icons/run.svg";
import { ReactComponent as BimTrack } from "media/icons/bimtrack.svg";

export enum FeatureType {
    SelectionModifier,
    CameraNavigation,
    Widget,
    AdminWidget,
}

export const featuresConfig = {
    myLocation: {
        key: "myLocation",
        name: "My location",
        Icon: MyLocation,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    bimcollab: {
        key: "bimcollab",
        name: "BIMcollab",
        Icon: Domain,
        type: FeatureType.Widget,
        defaultLocked: true,
    },
    bimTrack: {
        key: "bimTrack",
        name: "BIM Track",
        Icon: BimTrack,
        type: FeatureType.Widget,
        defaultLocked: true,
    },
    advancedSettings: {
        key: "advancedSettings",
        name: "Adv. settings",
        Icon: Settings,
        type: FeatureType.AdminWidget,
        defaultLocked: false,
    },
    viewerScenes: {
        key: "viewerScenes",
        name: "Viewer scenes",
        Icon: Movie,
        type: FeatureType.AdminWidget,
        defaultLocked: true,
    },
    selectionBasket: {
        key: "selectionBasket",
        name: "Sel. basket",
        Icon: Layers,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    modelTree: {
        key: "modelTree",
        name: "Model tree",
        Icon: Category,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    properties: {
        key: "properties",
        name: "Properties",
        Icon: List,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    propertyTree: {
        key: "propertyTree",
        name: "Property tree",
        Icon: AccountTreeRounded,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    bookmarks: {
        key: "bookmarks",
        name: "Bookmarks",
        Icon: Star,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    groups: {
        key: "groups",
        name: "Groups",
        Icon: Folder,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    search: {
        key: "search",
        name: "Search",
        Icon: Search,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    clippingBox: {
        key: "clippingBox",
        name: "Clipping box",
        Icon: Clipping,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    measure: {
        key: "measure",
        name: "Measure",
        Icon: Straighten,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    shareLink: {
        key: "shareLink",
        name: "Share link",
        Icon: Share,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    clippingPlanes: {
        key: "clippingPlanes",
        name: "Clipping plane",
        Icon: CropLandscape,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    orthoCam: {
        key: "orthoCam",
        name: "2D",
        Icon: Cameraswitch,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    panoramas: {
        key: "panoramas",
        name: "Panoramas",
        Icon: VrpanoOutlined,
        type: FeatureType.Widget,
        defaultLocked: false,
        dependencies: {
            subtrees: [["points"]],
        },
    },
    deviations: {
        key: "deviations",
        name: "Deviations",
        Icon: BlurOn,
        type: FeatureType.Widget,
        defaultLocked: false,
        dependencies: {
            subtrees: [["points", "triangles"]],
        },
    },
    followPath: {
        key: "followPath",
        name: "Follow Path",
        Icon: RouteOutlined,
        type: FeatureType.Widget,
        defaultLocked: false,
    },
    home: {
        key: "home",
        name: "Home",
        Icon: Home,
        type: FeatureType.CameraNavigation,
        defaultLocked: false,
    },
    stepBack: {
        key: "stepBack",
        name: "Step back",
        Icon: Undo,
        type: FeatureType.CameraNavigation,
        defaultLocked: false,
    },
    stepForwards: {
        key: "stepForwards",
        name: "Step forwards",
        Icon: Redo,
        type: FeatureType.CameraNavigation,
        defaultLocked: false,
    },
    cameraSpeed: {
        key: "cameraSpeed",
        name: "Camera speed",
        Icon: Run,
        type: FeatureType.CameraNavigation,
        defaultLocked: false,
    },
    flyToSelected: {
        key: "flyToSelected",
        name: "Fly to selected",
        Icon: FlightTakeoff,
        type: FeatureType.CameraNavigation,
        defaultLocked: false,
    },
    multipleSelection: {
        key: "multipleSelection",
        name: "Multiple selection",
        Icon: Layers,
        type: FeatureType.SelectionModifier,
        defaultLocked: false,
    },
    selectionColor: {
        key: "selectionColor",
        name: "Selection color",
        Icon: ColorLens,
        type: FeatureType.SelectionModifier,
        defaultLocked: false,
    },
    viewOnlySelected: {
        key: "viewOnlySelected",
        name: "View only selected",
        Icon: Visibility,
        type: FeatureType.SelectionModifier,
        defaultLocked: false,
    },
    hideSelected: {
        key: "hideSelected",
        name: "Hide selected",
        Icon: VisibilityOff,
        type: FeatureType.SelectionModifier,
        defaultLocked: false,
    },
    clearSelection: {
        key: "clearSelection",
        name: "Clear selection",
        Icon: CheckBox,
        type: FeatureType.SelectionModifier,
        defaultLocked: false,
    },
    toggleSubtrees: {
        key: "toggleSubtrees",
        name: "Toggle render types",
        Icon: Gradient,
        type: FeatureType.SelectionModifier,
        defaultLocked: false,
    },
} as const;

type Config = typeof featuresConfig;

export type FeatureKey = keyof Config;

export type WidgetKey = {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget | FeatureType.AdminWidget ? K : never;
}[keyof Config];

export type Widget = Config[WidgetKey];

export const defaultEnabledWidgets = [] as WidgetKey[];
export const allWidgets = Object.values(featuresConfig)
    .filter((widget) => [FeatureType.AdminWidget, FeatureType.Widget].includes(widget.type))
    .map((widget) => widget.key as WidgetKey);
export const defaultEnabledAdminWidgets = Object.values(featuresConfig)
    .filter((widget) => [FeatureType.AdminWidget].includes(widget.type))
    .map((widget) => widget.key as WidgetKey);
export const defaultLockedWidgets = Object.values(featuresConfig)
    .filter((widget) => widget.defaultLocked)
    .map((widget) => widget.key as WidgetKey);

export const viewerWidgets = Object.values(featuresConfig).filter((widget) => widget.type === FeatureType.Widget) as {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget ? Config[K] : never;
}[keyof Config][];
