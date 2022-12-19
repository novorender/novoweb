import { Fragment, useEffect, lazy, Suspense } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";

import { explorerActions, selectMaximized, selectWidgets } from "slices/explorerSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { featuresConfig, WidgetKey } from "config/features";
import { WidgetErrorBoundary, WidgetSkeleton } from "components";
import { MenuWidget } from "features/menuWidget";

const Properties = lazy(() => import("features/properties/properties"));
const PropertiesTree = lazy(() => import("features/propertiesTree/propertiesTree"));
const Bookmarks = lazy(() => import("features/bookmarks/bookmarksWidget"));
const ModelTree = lazy(() => import("features/modelTree/modelTree"));
const Search = lazy(() => import("features/search/search"));
const ClippingBox = lazy(() => import("features/clippingBox/clippingBox"));
const Measure = lazy(() => import("features/measure/measure"));
const Groups = lazy(() => import("features/groups/groups"));
const ClippingPlanes = lazy(() => import("features/clippingPlanes/clippingPlanes"));
const OrthoCam = lazy(() => import("features/orthoCam/orthoCam"));
const Panoramas = lazy(() => import("features/panoramas/panoramas"));
const AdvancedSettings = lazy(() => import("features/advancedSettings/advancedSettings"));
const BimCollab = lazy(() => import("features/bimCollab/bimCollab"));
const SelectionBasket = lazy(() => import("features/selectionBasket/selectionBasket"));
const Deviations = lazy(() => import("features/deviations/deviations"));
const FollowPath = lazy(() => import("features/followPath/followPath"));
const BimTrack = lazy(() => import("features/bimTrack/bimTrack"));
const Ditio = lazy(() => import("features/ditio/ditio"));
const MyLocation = lazy(() => import("features/myLocation/myLocation"));
const RangeSearch = lazy(() => import("features/rangeSearch/rangeSearch"));
const User = lazy(() => import("features/user/user"));
const HeightProfile = lazy(() => import("features/heightProfile/heightProfile"));
const Area = lazy(() => import("features/area/area"));
const PointLine = lazy(() => import("features/pointLine/pointLine"));
const Jira = lazy(() => import("features/jira/jira"));
const Manhole = lazy(() => import("features/manhole/manhole"));

export function Widgets() {
    const theme = useTheme();
    const isSmall = useMediaQuery(
        `@media (max-width: ${theme.breakpoints.values.sm}px), (max-height: ${theme.customBreakPoints.height.sm}px)`
    );
    const maximized = useAppSelector(selectMaximized);

    const slots = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    useEffect(
        function handleScreenSizeChange() {
            if (isSmall && slots.length > 1) {
                dispatch(explorerActions.removeWidgetSlot(slots[1]));
            }
        },
        [isSmall, slots, dispatch]
    );

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
            justifyContent="flex-end"
            height={1}
            width={{ xs: "auto", md: "100%" }}
        >
            {(isSmall && slots.length < 1) || (!isSmall && slots.length < 2 && !maximized) ? <MenuWidget /> : null}
            {slots
                .slice(0)
                .reverse()
                .map((key) => (
                    <Fragment key={key}>{getWidgetByKey(key)}</Fragment>
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
        case featuresConfig.clippingBox.key:
            Widget = ClippingBox;
            break;
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
        case featuresConfig.panoramas.key:
            Widget = Panoramas;
            break;
        case featuresConfig.advancedSettings.key:
            Widget = AdvancedSettings;
            break;
        case featuresConfig.selectionBasket.key:
            Widget = SelectionBasket;
            break;
        case featuresConfig.deviations.key:
            Widget = Deviations;
            break;
        case featuresConfig.followPath.key:
            Widget = FollowPath;
            break;
        case featuresConfig.ditio.key:
            Widget = Ditio;
            break;
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
        case featuresConfig.jira.key:
            Widget = Jira;
            break;
        case featuresConfig.manhole.key:
            Widget = Manhole;
            break;
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
