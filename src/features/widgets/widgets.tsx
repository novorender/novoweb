import { Box } from "@mui/material";
import { Suspense, lazy, useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { WidgetErrorBoundary, WidgetSkeleton } from "components";
import { WidgetKey, featuresConfig } from "config/features";
import { MenuWidget } from "features/menuWidget";
import { explorerActions, selectMaximized, selectWidgets } from "slices/explorerSlice";

import { useWidgetLayout } from "./useWidgetLayout";

const Properties = lazy(() => import("features/properties/properties"));
const PropertiesTree = lazy(() => import("features/propertiesTree/propertiesTree"));
const Bookmarks = lazy(() => import("features/bookmarks/bookmarksWidget"));
const ModelTree = lazy(() => import("features/modelTree/modelTree"));
const Search = lazy(() => import("features/search/search"));
// const ClippingBox = lazy(() => import("features/clippingBox/clippingBox"));
const Measure = lazy(() => import("features/measure/measure"));
const Groups = lazy(() => import("features/groups/groups"));
const ClippingPlanes = lazy(() => import("features/clippingPlanes/clippingPlanes"));
const OrthoCam = lazy(() => import("features/orthoCam/orthoCam"));
// const Images = lazy(() => import("features/images/images"));
const AdvancedSettings = lazy(() => import("features/advancedSettings/advancedSettings"));
const BimCollab = lazy(() => import("features/bimCollab/bimCollab"));
const SelectionBasket = lazy(() => import("features/selectionBasket/selectionBasket"));
// const Deviations = lazy(() => import("features/deviations/deviations"));
// const FollowPath = lazy(() => import("features/followPath/followPath"));
const BimTrack = lazy(() => import("features/bimTrack/bimTrack"));
// const Ditio = lazy(() => import("features/ditio/ditio"));
const MyLocation = lazy(() => import("features/myLocation/myLocation"));
const RangeSearch = lazy(() => import("features/rangeSearch/rangeSearch"));
const User = lazy(() => import("features/user/user"));
const HeightProfile = lazy(() => import("features/heightProfile/heightProfile"));
const Area = lazy(() => import("features/area/area"));
const PointLine = lazy(() => import("features/pointLine/pointLine"));
// const Jira = lazy(() => import("features/jira/jira"));
const Manhole = lazy(() => import("features/manhole/manhole"));
// const XsiteManage = lazy(() => import("features/xsiteManage/xsiteManage"));

export function Widgets() {
    const layout = useWidgetLayout();
    const maximized = useAppSelector(selectMaximized);

    const slots = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    useEffect(
        function handleSettingsChange() {
            if (slots.length + (layout.widgets === 1 ? 0 : maximized.length) > layout.widgets) {
                dispatch(explorerActions.clearMaximized());
                dispatch(explorerActions.setWidgets(slots.slice(0, layout.widgets)));
            }
        },
        [layout, slots, dispatch, maximized]
    );

    const getGridLayout = () => {
        if (layout.widgets === 4) {
            return {
                gridColumn: "3 / 5",
                gridRow: "1 / 3",
                gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                gridTemplateColumns: "repeat(2, minmax(0, 600px))",
                gridTemplateAreas:
                    maximized.length === 2
                        ? `"two one" "two one"`
                        : maximized.length === 1
                        ? slots.indexOf(maximized[0]) === 0
                            ? `"three one" "two one"`
                            : `"three two" "three one"`
                        : `"four two" "three one"`,
            };
        } else if (layout.widgets === 2) {
            return {
                gridColumn: "3 / 5",
                gridRow: "1 / 3",
                gridTemplateRows: "repeat(2, minmax(0, 1fr))",
                gridTemplateColumns: "minmax(0, 600px)",
                gridTemplateAreas: maximized.length ? `"one" "one"` : `"two" "one"`,
            };
        } else if (layout.widgets === 1 && layout.sideBySide) {
            return {
                gridColumn: "3 / 4",
                gridRow: "1 / 3",
                gridTemplateColumns: "minmax(420px, 1fr)",
                gridTemplateRows: "minmax(0, 1fr)",
                gridTemplateAreas: `"one"`,
            };
        } else if (layout.widgets === 1 && !layout.sideBySide) {
            return {
                gridColumn: "1 / 4",
                gridRow: "1 / 3",
                gridTemplateColumns: "1fr",
                gridTemplateRows: "1fr",
                gridTemplateAreas: `"one"`,
            };
        }
    };

    return (
        <Box
            sx={{ pb: 3, pr: 3 }}
            display="grid"
            gap={5}
            justifyItems="stretch"
            alignItems="stretch"
            justifyContent="end"
            alignContent="center"
            {...getGridLayout()}
        >
            {slots.length + maximized.length < layout.widgets ? (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="flex-end"
                    justifyContent="flex-end"
                    gridArea={
                        slots.length === 0 ? "one" : slots.length === 1 ? "two" : slots.length === 2 ? "three" : "four"
                    }
                >
                    <MenuWidget />
                </Box>
            ) : null}
            {slots.map((key, idx) => (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="flex-end"
                    justifyContent="flex-end"
                    maxHeight={1}
                    gridArea={idx === 0 ? "one" : idx === 1 ? "two" : idx === 2 ? "three" : "four"}
                    key={key}
                >
                    {getWidgetByKey(key)}
                </Box>
            ))}
        </Box>
    );
}

function getWidgetByKey(key: WidgetKey): JSX.Element | string {
    let Widget: React.LazyExoticComponent<() => JSX.Element>;

    switch (key) {
        case featuresConfig.properties.key:
            Widget = Properties;
            break;
        case featuresConfig.propertyTree.key:
            Widget = PropertiesTree;
            break;
        case featuresConfig.bookmarks.key:
            Widget = Bookmarks;
            break;
        case featuresConfig.groups.key:
            Widget = Groups;
            break;
        case featuresConfig.modelTree.key:
            Widget = ModelTree;
            break;
        case featuresConfig.search.key:
            Widget = Search;
            break;
        // case featuresConfig.clippingBox.key:
        //     Widget = ClippingBox;
        //     break;
        case featuresConfig.measure.key:
            Widget = Measure;
            break;
        case featuresConfig.bimcollab.key:
            Widget = BimCollab;
            break;
        case featuresConfig.bimTrack.key:
            Widget = BimTrack;
            break;
        case featuresConfig.clippingPlanes.key:
            Widget = ClippingPlanes;
            break;
        case featuresConfig.orthoCam.key:
            Widget = OrthoCam;
            break;
        // case featuresConfig.images.key:
        //     Widget = Images;
        //     break;
        case featuresConfig.advancedSettings.key:
            Widget = AdvancedSettings;
            break;
        case featuresConfig.selectionBasket.key:
            Widget = SelectionBasket;
            break;
        // case featuresConfig.deviations.key:
        //     Widget = Deviations;
        //     break;
        // case featuresConfig.followPath.key:
        //     Widget = FollowPath;
        //     break;
        // case featuresConfig.ditio.key:
        //     Widget = Ditio;
        //     break;
        case featuresConfig.myLocation.key:
            Widget = MyLocation;
            break;
        case featuresConfig.rangeSearch.key:
            Widget = RangeSearch;
            break;
        case featuresConfig.user.key:
            Widget = User;
            break;
        case featuresConfig.heightProfile.key:
            Widget = HeightProfile;
            break;
        case featuresConfig.area.key:
            Widget = Area;
            break;
        case featuresConfig.pointLine.key:
            Widget = PointLine;
            break;
        // case featuresConfig.jira.key:
        //     Widget = Jira;
        //     break;
        case featuresConfig.manhole.key:
            Widget = Manhole;
            break;
        // case featuresConfig.xsiteManage.key:
        //     Widget = XsiteManage;
        //     break;
        default:
            return key;
    }

    return (
        <WidgetErrorBoundary widgetKey={key}>
            <Suspense fallback={<WidgetSkeleton widgetKey={key} />}>
                <Widget />
            </Suspense>
        </WidgetErrorBoundary>
    );
}
