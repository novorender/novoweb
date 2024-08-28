import { StarOutline } from "@mui/icons-material";
import {
    accordionClasses,
    accordionSummaryClasses,
    Box,
    css,
    Grid,
    IconButton,
    styled,
    Typography,
    useTheme,
} from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { Accordion } from "components/accordion";
import { AccordionDetails } from "components/accordionDetails";
import { AccordionSummary } from "components/accordionSummary";
import { FeatureGroupKey, featureGroups, featuresConfig, FeatureType, Widget, WidgetKey } from "config/features";
import { ShareLink } from "features/shareLink";
import { sorting } from "features/widgetList/sorting";
import {
    selectEnabledWidgets,
    selectFavoriteWidgets,
    selectIsOnline,
    selectLockedWidgets,
    selectWidgets,
} from "slices/explorer";

import { WidgetBottomScrollBox } from "../../../components/scrollBox";
import { WidgetMenuButtonWrapper } from "../../../components/widgetMenuButtonWrapper";
import { groupSorting } from "../sorting";

const sortedFeatureGroups = Object.values(featureGroups).sort((a, b) => {
    const idxA = groupSorting.indexOf(a.key);
    const idxB = groupSorting.indexOf(b.key);

    return (idxA === -1 ? groupSorting.length : idxA) - (idxB === -1 ? groupSorting.length : idxB);
});

export function Root({
    handleClick,
    currentWidget,
    expandedGroupKey,
    setExpandedGroupKey,
}: {
    currentWidget: WidgetKey | undefined;
    handleClick: (key: WidgetKey) => () => void;
    expandedGroupKey: FeatureGroupKey | null;
    setExpandedGroupKey: (group: FeatureGroupKey | null) => void;
}) {
    const theme = useTheme();
    const { t } = useTranslation();
    const scrollBoxRef = useRef<HTMLDivElement | null>(null);

    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const activeWidgets = useAppSelector(selectWidgets);
    const favoriteWidgets = useAppSelector(selectFavoriteWidgets);
    const isOnline = useAppSelector(selectIsOnline);

    useEffect(() => {
        if (expandedGroupKey) {
            scrollBoxRef.current
                ?.querySelector(`#widget-group-${expandedGroupKey}`)
                ?.scrollIntoView({ behavior: "smooth" });
        }
    }, [expandedGroupKey]);

    const sortAndFilterWidgets = (widgets: Widget[]) =>
        widgets
            .filter((widget) => !lockedWidgets.includes(widget.key))
            .sort((a, b) => {
                const idxA = sorting.indexOf(a.key);
                const idxB = sorting.indexOf(b.key);

                return (idxA === -1 ? sorting.length : idxA) - (idxB === -1 ? sorting.length : idxB);
            });

    const sortedEnabledWidgets = sortAndFilterWidgets(enabledWidgets);

    const widgetGroups = sortedFeatureGroups.map((group) => {
        return {
            groupKey: group.key,
            groupName: t(group.nameKey),
            GroupIcon: group.Icon,
            widgets:
                group.key === featureGroups.favorites.key
                    ? sortedEnabledWidgets.filter((w) => favoriteWidgets.includes(w.key))
                    : sortedEnabledWidgets.filter(
                          (widget) =>
                              (widget.type === FeatureType.Widget || widget.type === FeatureType.AdminWidget) &&
                              "groups" in widget &&
                              widget.groups.includes(group.key as never)
                      ),
        };
    });

    return (
        <>
            <Box position="relative">
                <Box
                    boxShadow={theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
            </Box>
            <WidgetBottomScrollBox flexGrow={1} py={2} ref={scrollBoxRef}>
                {widgetGroups.map(({ groupKey, groupName, GroupIcon, widgets }) => {
                    return (
                        <GroupAccordion
                            key={groupKey}
                            expanded={groupKey === expandedGroupKey}
                            onChange={(_, newExpanded) => {
                                setExpandedGroupKey(newExpanded ? (groupKey as FeatureGroupKey) : null);
                            }}
                            id={`widget-group-${groupKey}`}
                        >
                            <GroupAccordionSummary>
                                <GroupIcon />
                                <Typography sx={{ ml: 1 }}> {groupName}</Typography>
                            </GroupAccordionSummary>
                            <AccordionDetails>
                                {widgets.length === 0 ? (
                                    <Box textAlign="center" color="grey" m={2}>
                                        {groupKey === featureGroups.favorites.key ? (
                                            <>
                                                {t("noFavoriteWidgets1") + " "}
                                                <StarOutline sx={{ verticalAlign: "text-bottom" }} />{" "}
                                                {" " + t("noFavoriteWidgets2")}
                                            </>
                                        ) : (
                                            <>{t("noWidgets")}</>
                                        )}
                                    </Box>
                                ) : (
                                    <Grid container wrap="wrap" spacing={1} data-test="widget-list">
                                        {widgets.map(({ Icon, nameKey, key, type, ...widget }) => {
                                            const activeCurrent = key === currentWidget;
                                            const activeElsewhere = !activeCurrent && activeWidgets.includes(key);
                                            const unavailable = !isOnline && "offline" in widget && !widget.offline;

                                            return (
                                                <Grid sx={{ mb: 1 }} xs={4} item key={type + key}>
                                                    {key === featuresConfig.shareLink.key ? (
                                                        <ShareLink />
                                                    ) : (
                                                        <WidgetMenuButtonWrapper
                                                            activeCurrent={activeCurrent}
                                                            activeElsewhere={activeElsewhere || unavailable}
                                                            onClick={unavailable ? undefined : handleClick(key)}
                                                        >
                                                            <IconButton
                                                                disabled={activeElsewhere || unavailable}
                                                                size="large"
                                                            >
                                                                <Icon />
                                                            </IconButton>
                                                            <Typography textAlign={"center"}>{t(nameKey)}</Typography>
                                                        </WidgetMenuButtonWrapper>
                                                    )}
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                )}
                            </AccordionDetails>
                        </GroupAccordion>
                    );
                })}
            </WidgetBottomScrollBox>
        </>
    );
}

const GroupAccordion = styled(Accordion)(
    () => css`
        &.${accordionClasses.root} {
            &.${accordionClasses.expanded} {
                margin: 0;
            }
        }
    `
);

const GroupAccordionSummary = styled(AccordionSummary)(
    () => css`
        &::after {
            left: 0;
            right: 0;
        }

        &.${accordionSummaryClasses.expanded}, &.${accordionSummaryClasses.disabled} {
            &::after {
                border-bottom: none;
                opacity: 0.2;
            }
        }
    `
);
