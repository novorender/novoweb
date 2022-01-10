import { Fragment, useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";

import { explorerActions, selectWidgets } from "slices/explorerSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { featuresConfig, WidgetKey } from "config/features";

import { Properties } from "features/properties";
import { PropertiesTree } from "features/propertiesTree";
import { Bookmarks } from "features/bookmarks";
import { ModelTree } from "features/modelTree";
import { Search } from "features/search";
import { ClippingBox } from "features/clippingBox";
import { Measure } from "features/measure";
import { Groups } from "features/groups";
import { ClippingPlanes } from "features/clippingPlanes";
import { ViewerScenes } from "features/viewerScenes";
import { OrthoCam } from "features/orthoCam";
import { Panoramas } from "features/panoramas";
import { AdvancedSettings } from "features/advancedSettings";
import { BimCollab } from "features/bimCollab";
import { Layers } from "features/layers";
import { MenuWidget } from "features/menuWidget";

export function Widgets() {
    const theme = useTheme();
    const isSmall = useMediaQuery(
        `@media (max-width: ${theme.breakpoints.values.sm}px), (max-height: ${theme.customBreakPoints.height.sm}px)`
    );

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
            {(isSmall && slots.length < 1) || (!isSmall && slots.length < 2) ? <MenuWidget /> : null}
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
    switch (key) {
        case featuresConfig.properties.key:
            return <Properties />;
        case featuresConfig.propertyTree.key:
            return <PropertiesTree />;
        case featuresConfig.bookmarks.key:
            return <Bookmarks />;
        case featuresConfig.groups.key:
            return <Groups />;
        case featuresConfig.modelTree.key:
            return <ModelTree />;
        case featuresConfig.search.key:
            return <Search />;
        case featuresConfig.clippingBox.key:
            return <ClippingBox />;
        case featuresConfig.measure.key:
            return <Measure />;
        case featuresConfig.bimcollab.key:
            return <BimCollab />;
        case featuresConfig.viewerScenes.key:
            return <ViewerScenes />;
        case featuresConfig.clippingPlanes.key:
            return <ClippingPlanes />;
        case featuresConfig.orthoCam.key:
            return <OrthoCam />;
        case featuresConfig.panoramas.key:
            return <Panoramas />;
        case featuresConfig.advancedSettings.key:
            return <AdvancedSettings />;
        case featuresConfig.layers.key:
            return <Layers />;
        default:
            return key;
    }
}
