import { Box, css, styled, useTheme } from "@mui/material";
import { lazy, Suspense, useEffect, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { WidgetErrorBoundary, WidgetSkeleton } from "components";
import { featuresConfig, WidgetKey } from "config/features";
import { MenuWidget } from "features/menuWidget";
import {
    explorerActions,
    selectGridSize,
    selectIsOnline,
    selectMaximized,
    selectMaximizedHorizontal,
    selectNewDesign,
    selectPositionedWidgets,
    selectWidgetGroupPanelState,
    selectWidgetLayout,
    selectWidgets,
    selectWidgetSlot,
} from "slices/explorer";
import { PositionedWidgetState } from "slices/explorer/types";
import { getNextSlotPos, getTakenWidgetSlotCount } from "slices/explorer/utils";
import { compareStrings } from "utils/misc";

const Properties = lazy(() => import("features/properties/properties"));
const PropertiesTree = lazy(() => import("features/propertyTree/propertyTree"));
const Bookmarks = lazy(() => import("features/bookmarks/bookmarksWidget"));
const ModelTree = lazy(() => import("features/modelTree/modelTree"));
const Search = lazy(() => import("features/search/search"));
const Measure = lazy(() => import("features/measure/measure"));
const Groups = lazy(() => import("features/groups/groups"));
const ClippingPlanes = lazy(() => import("features/clippingPlanes/clippingPlanes"));
const OutlineLaser = lazy(() => import("features/outlineLaser/outlineLaser"));
const OrthoCam = lazy(() => import("features/orthoCam/orthoCam"));
const Images = lazy(() => import("features/images/images"));
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
const XsiteManage = lazy(() => import("features/xsiteManage/xsiteManage"));
const Offline = lazy(() => import("features/offline/offline"));
const Pims = lazy(() => import("features/pims/pims"));
const Omega365 = lazy(() => import("features/omega365/omega365"));
const Arcgis = lazy(() => import("features/arcgis/arcgis"));
const Forms = lazy(() => import("features/forms/forms"));
const Clash = lazy(() => import("features/clash/clash"));

const emptySlotKey = "emptySlot" as const;

export function Widgets() {
    const useNewDesign = useAppSelector(selectNewDesign);

    if (useNewDesign) {
        return <NewWidgets />;
    } else {
        return <OldWidgets />;
    }
}

function NewWidgets() {
    const theme = useTheme();
    const maximized = useAppSelector(selectMaximized);
    const maximizedHorizontal = useAppSelector(selectMaximizedHorizontal);
    const isOnline = useAppSelector(selectIsOnline);
    const widgetGroupPanelState = useAppSelector(selectWidgetGroupPanelState);
    const widgetSlot = useAppSelector(selectWidgetSlot);
    const gridSize = useAppSelector(selectGridSize);

    const layout = useAppSelector(selectWidgetLayout);
    const slots = useAppSelector(selectWidgets);
    const positionedWidgets = useAppSelector(selectPositionedWidgets);
    const dispatch = useAppDispatch();

    const showNewSlot = useMemo(() => {
        return widgetSlot.open && getTakenWidgetSlotCount(slots, maximized, maximizedHorizontal) < layout.widgets;
    }, [widgetSlot, slots, maximized, maximizedHorizontal, layout]);

    useEffect(
        function handleSettingsChange() {
            if (getTakenWidgetSlotCount(slots, maximized, maximizedHorizontal) > layout.widgets) {
                dispatch(explorerActions.clearMaximized());
                dispatch(explorerActions.setWidgets(slots.slice(0, layout.widgets)));
            }
        },
        [layout, slots, dispatch, maximized, maximizedHorizontal]
    );

    useEffect(() => {
        if (!isOnline) {
            slots.forEach((slot) => {
                if (!featuresConfig[slot].offline) {
                    dispatch(explorerActions.removeWidgetSlot(slot));
                }
            });
        }
    }, [dispatch, isOnline, slots]);

    const positionedSlots = useMemo(() => {
        const gap = theme.spacing(2);

        let widgets = positionedWidgets as (Omit<PositionedWidgetState, "key"> & {
            key: WidgetKey | typeof emptySlotKey;
        })[];
        if (showNewSlot) {
            const pos = getNextSlotPos(positionedWidgets, gridSize.width, gridSize.height);
            if (pos) {
                widgets = [...widgets, { key: emptySlotKey, x: pos.x, y: pos.y, width: 1, height: 1 }];
            }
        }

        return widgets
            .map((widget) => {
                const x = gridSize.width - (widget.x + widget.width);
                const y = gridSize.height - (widget.y + widget.height);
                const width = widget.width === gridSize.width ? "100%" : `calc((100% - ${gap}) / ${gridSize.width})`;
                const left = x === 0 ? "0px" : `calc(((100% - ${gap}) / ${gridSize.width} + ${gap}) * ${x})`;
                const height =
                    widget.height === gridSize.height ? "100%" : `calc((100% - ${gap}) / ${gridSize.height})`;
                const top = y === 0 ? "0px" : `calc(((100% - ${gap}) / ${gridSize.height} + ${gap}) * ${y})`;
                return {
                    key: widget.key,
                    left,
                    top,
                    width,
                    height,
                };
            })
            .sort((w1, w2) => compareStrings(w1.key, w2.key));
    }, [positionedWidgets, gridSize, theme, showNewSlot]);

    const widgetGroupPanelWidth =
        widgetGroupPanelState.expanded && widgetGroupPanelState.open
            ? theme.customSpacing.widgetGroupPanelExpandedWidth
            : widgetGroupPanelState.open
            ? 12
            : 0;
    const maxWidgetGroupPanelWidth = 12;

    const getGridLayout = () => {
        if (layout.widgets === 4) {
            return {
                width: `50%`,
                minWidth: "800px",
                maxWidth: `min(1400px, 100% - 640px - ${theme.spacing(maxWidgetGroupPanelWidth + 2)})`,
            };
        } else if (layout.widgets === 2) {
            return {
                width: `30%`,
                minWidth: "400px",
                maxWidth: "700px",
            };
        } else if (layout.widgets === 1 && layout.sideBySide) {
            return {
                width: `420px`,
            };
        } else if (layout.widgets === 1 && !layout.sideBySide) {
            return {
                width: `100%`,
            };
        }
    };

    return (
        <Box
            sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                height: `calc(100% - ${theme.spacing(layout.padWidgetsTop ? 18 : 9)})`,
                mb: 9,
                mr: widgetGroupPanelWidth,
                transition: "margin 0.2s",
                gap: 2,
                pointerEvents: "none",
            }}
            {...getGridLayout()}
        >
            {positionedSlots.map(({ key, left, top, width, height }, idx) => (
                <WidgetBox
                    maxHeight={1}
                    gridArea={idxToAreaName(idx)}
                    key={key}
                    sx={{
                        left,
                        top,
                        width,
                        height,
                    }}
                >
                    {key !== emptySlotKey ? getWidgetByKey(key) : <MenuWidget />}
                </WidgetBox>
            ))}
        </Box>
    );
}

const WidgetBox = styled(Box)(
    () => css`
        display: flex;
        flexdirection: column;
        alignitems: flex-end;
        justifycontent: flex-end;
        transition: top 0.2s, left 0.2s, width 0.2s, height 0.2s;
        position: absolute;
    `
);

function OldWidgets() {
    const maximized = useAppSelector(selectMaximized);
    const isOnline = useAppSelector(selectIsOnline);

    const layout = useAppSelector(selectWidgetLayout);
    const slots = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    useEffect(
        function handleSettingsChange() {
            if (slots.length + (layout.widgets === 1 ? 0 : maximized.length) > layout.widgets) {
                dispatch(explorerActions.clearMaximized());
                dispatch(explorerActions.setWidgets(slots.slice(0, layout.widgets)));
            }
        },
        [layout, slots, dispatch, maximized],
    );

    useEffect(() => {
        if (!isOnline) {
            slots.forEach((slot) => {
                if (!featuresConfig[slot].offline) {
                    dispatch(explorerActions.removeWidgetSlot(slot));
                }
            });
        }
    }, [dispatch, isOnline, slots]);

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
        case featuresConfig.measure.key:
            Widget = Measure;
            break;
        case featuresConfig.outlineLaser.key:
            Widget = OutlineLaser;
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
        case featuresConfig.images.key:
            Widget = Images;
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
        case featuresConfig.xsiteManage.key:
            Widget = XsiteManage;
            break;
        case featuresConfig.offline.key:
            Widget = Offline;
            break;
        case featuresConfig.omegaPims365.key:
            Widget = Pims;
            break;
        case featuresConfig.omega365.key:
            Widget = Omega365;
            break;
        case featuresConfig.arcgis.key:
            Widget = Arcgis;
            break;
        case featuresConfig.forms.key:
            Widget = Forms;
            break;
        case featuresConfig.clash.key:
            Widget = Clash;
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

function idxToAreaName(idx: number) {
    return idx === 0 ? "one" : idx === 1 ? "two" : idx === 2 ? "three" : "four";
}
