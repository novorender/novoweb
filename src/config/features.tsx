import ListIcon from "@material-ui/icons/List";
import StarIcon from "@material-ui/icons/Star";
import ShareIcon from "@material-ui/icons/Share";
import HomeIcon from "@material-ui/icons/Home";
import UndoIcon from "@material-ui/icons/Undo";
import RedoIcon from "@material-ui/icons/Redo";
import DirectionsRunIcon from "@material-ui/icons/DirectionsRun";
import FullscreenIcon from "@material-ui/icons/Fullscreen";
import LayersIcon from "@material-ui/icons/Layers";
import ColorLensIcon from "@material-ui/icons/ColorLens";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
// import StraightenIcon from "@material-ui/icons/Straighten";
import CategoryIcon from "@material-ui/icons/Category";
import FolderIcon from "@material-ui/icons/Folder";

// import ClippingIcon from "media/icons/clipping.svg";

export enum FeatureType {
    SelectionModifier,
    CameraNavigation,
    Widget,
}

export const config = {
    modelTree: {
        key: "modelTree",
        name: "Model Tree",
        Icon: CategoryIcon,
        type: FeatureType.Widget,
    },
    properties: {
        key: "properties",
        name: "Properties",
        Icon: ListIcon,
        type: FeatureType.Widget,
    },
    bookmarks: {
        key: "bookmarks",
        name: "Bookmarks",
        Icon: StarIcon,
        type: FeatureType.Widget,
    },
    groups: {
        key: "groups",
        name: "Groups",
        Icon: FolderIcon,
        type: FeatureType.Widget,
    },
    /*     clipping: {
        key: "clipping",
        name: "Clipping",
        Icon: ClippingIcon,
        type: FeatureType.Widget,
    },
    measure: {
        key: "measure",
        name: "Measure",
        Icon: StraightenIcon,
        type: FeatureType.Widget,
    }, */
    shareLink: {
        key: "shareLink",
        name: "Share Link",
        Icon: ShareIcon,
        type: FeatureType.Widget,
    },
    home: {
        key: "home",
        name: "Home",
        Icon: HomeIcon,
        type: FeatureType.CameraNavigation,
    },
    stepBack: {
        key: "stepBack",
        name: "Step Back",
        Icon: UndoIcon,
        type: FeatureType.CameraNavigation,
    },
    stepForwards: {
        key: "stepForwards",
        name: "Step Forwards",
        Icon: RedoIcon,
        type: FeatureType.CameraNavigation,
    },
    cameraSpeed: {
        key: "cameraSpeed",
        name: "Camera Speed",
        Icon: DirectionsRunIcon,
        type: FeatureType.CameraNavigation,
    },
    fullscreen: {
        key: "fullscreen",
        name: "Fullscreen",
        Icon: FullscreenIcon,
        type: FeatureType.CameraNavigation,
    },
    multipleSelection: {
        key: "multipleSelection",
        name: "Multiple Selection",
        Icon: LayersIcon,
        type: FeatureType.SelectionModifier,
    },
    selectionColor: {
        key: "selectionColor",
        name: "Selection Color",
        Icon: ColorLensIcon,
        type: FeatureType.SelectionModifier,
    },
    viewOnlySelected: {
        key: "viewOnlySelected",
        name: "View only selected",
        Icon: VisibilityIcon,
        type: FeatureType.SelectionModifier,
    },
    hideSelected: {
        key: "hideSelected",
        name: "Hide selected",
        Icon: VisibilityOffIcon,
        type: FeatureType.SelectionModifier,
    },
    clearSelection: {
        key: "clearSelection",
        name: "Clear Selection",
        Icon: CheckBoxIcon,
        type: FeatureType.SelectionModifier,
    },
} as const;

type Config = typeof config;

export type FeatureKey = keyof Config;

export type WidgetKey = {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget ? K : never;
}[keyof Config];

export type Widget = Config[WidgetKey];
