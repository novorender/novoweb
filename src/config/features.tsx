import ListIcon from "@mui/icons-material/List";
import StarIcon from "@mui/icons-material/Star";
import ShareIcon from "@mui/icons-material/Share";
import HomeIcon from "@mui/icons-material/Home";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import LayersIcon from "@mui/icons-material/Layers";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import StraightenIcon from "@mui/icons-material/Straighten";
import CategoryIcon from "@mui/icons-material/Category";
import FolderIcon from "@mui/icons-material/Folder";
import SearchIcon from "@mui/icons-material/Search";
import GradientIcon from "@mui/icons-material/Gradient";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import MovieIcon from "@mui/icons-material/Movie";
import CropLandscapeIcon from "@mui/icons-material/CropLandscape";
import CameraswitchIcon from "@mui/icons-material/Cameraswitch";

import { ReactComponent as ClippingIcon } from "media/icons/clipping.svg";
import { ReactComponent as RunIcon } from "media/icons/run.svg";

export enum FeatureType {
    SelectionModifier,
    CameraNavigation,
    Widget,
    AdminWidget,
}

export const config = {
    viewerScenes: {
        key: "viewerScenes",
        name: "Viewer scenes",
        Icon: MovieIcon,
        type: FeatureType.AdminWidget,
    },
    modelTree: {
        key: "modelTree",
        name: "Model tree",
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
    search: {
        key: "search",
        name: "Search",
        Icon: SearchIcon,
        type: FeatureType.Widget,
    },
    clippingBox: {
        key: "clippingBox",
        name: "Clipping box",
        Icon: ClippingIcon,
        type: FeatureType.Widget,
    },
    measure: {
        key: "measure",
        name: "Measure",
        Icon: StraightenIcon,
        type: FeatureType.Widget,
    },
    shareLink: {
        key: "shareLink",
        name: "Share link",
        Icon: ShareIcon,
        type: FeatureType.Widget,
    },
    clippingPlanes: {
        key: "clippingPlanes",
        name: "Clipping plane",
        Icon: CropLandscapeIcon,
        type: FeatureType.Widget,
    },
    orthoCam: {
        key: "orthoCam",
        name: "2D",
        Icon: CameraswitchIcon,
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
        name: "Step back",
        Icon: UndoIcon,
        type: FeatureType.CameraNavigation,
    },
    stepForwards: {
        key: "stepForwards",
        name: "Step forwards",
        Icon: RedoIcon,
        type: FeatureType.CameraNavigation,
    },
    cameraSpeed: {
        key: "cameraSpeed",
        name: "Camera speed",
        Icon: RunIcon,
        type: FeatureType.CameraNavigation,
    },
    flyToSelected: {
        key: "flyToSelected",
        name: "Fly to selected",
        Icon: FlightTakeoffIcon,
        type: FeatureType.CameraNavigation,
    },
    multipleSelection: {
        key: "multipleSelection",
        name: "Multiple selection",
        Icon: LayersIcon,
        type: FeatureType.SelectionModifier,
    },
    selectionColor: {
        key: "selectionColor",
        name: "Selection color",
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
        name: "Clear selection",
        Icon: CheckBoxIcon,
        type: FeatureType.SelectionModifier,
    },
    toggleRenderType: {
        key: "toggleRenderType",
        name: "Render type",
        Icon: GradientIcon,
        type: FeatureType.SelectionModifier,
    },
} as const;

type Config = typeof config;

export type FeatureKey = keyof Config;

export type WidgetKey = {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget | FeatureType.AdminWidget ? K : never;
}[keyof Config];

export type Widget = Config[WidgetKey];

export const defaultEnabledWidgets = [config.shareLink.key, config.orthoCam.key];
export const defaultEnabledAdminWidgets = Object.values(config)
    .filter((value) => [FeatureType.AdminWidget, FeatureType.Widget].includes(value.type))
    .map((widget) => widget.key as WidgetKey);

export const viewerWidgets = Object.values(config).filter((widget) => widget.type === FeatureType.Widget) as {
    [K in keyof Config]: Config[K]["type"] extends FeatureType.Widget ? Config[K] : never;
}[keyof Config][];
