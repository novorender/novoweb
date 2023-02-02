import { useHistory } from "react-router-dom";
import { Box, Grid, IconButton, Typography, useTheme } from "@mui/material";

import { useAppSelector } from "app/store";
import { selectLockedWidgets, selectEnabledWidgets, selectWidgets } from "slices/explorerSlice";
import { WidgetKey, featuresConfig, Widget, FeatureTag, FeatureType, featureTags } from "config/features";
import { ScrollBox, WidgetMenuButtonWrapper } from "components";
import { ShareLink } from "features/shareLink";

import { sorting } from "../widgetList";

export function Root({
    handleClick,
    currentWidget,
}: {
    currentWidget: WidgetKey | undefined;
    handleClick: (key: WidgetKey) => () => void;
}) {
    const theme = useTheme();
    const history = useHistory();

    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const activeWidgets = useAppSelector(selectWidgets);

    return (
        <>
            <Box position="relative">
                <Box
                    boxShadow={theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
            </Box>
            <ScrollBox flexGrow={1} px={1} py={2}>
                <Grid container wrap="wrap" spacing={1} data-test="widget-list">
                    {enabledWidgets
                        .filter((widget) => !lockedWidgets.includes(widget.key))
                        .sort((a, b) => {
                            const idxA = sorting.indexOf(a.key);
                            const idxB = sorting.indexOf(b.key);

                            return (idxA === -1 ? sorting.length : idxA) - (idxB === -1 ? sorting.length : idxB);
                        })
                        .reduce((prev, curr) => {
                            if ("tags" in curr) {
                                return prev.find((v) => v.type === FeatureType.Tag && curr.tags.includes(v.key))
                                    ? prev
                                    : prev.concat(curr.tags.map((tag) => featureTags[tag]));
                            }
                            return prev.concat(curr);
                        }, [] as (Widget | FeatureTag)[])
                        .map(({ Icon, name, key, type }) => {
                            const activeCurrent = type !== FeatureType.Tag ? key === currentWidget : undefined;
                            const activeElsewhere =
                                type !== FeatureType.Tag ? !activeCurrent && activeWidgets.includes(key) : undefined;
                            const activeTag =
                                type === FeatureType.Tag &&
                                activeWidgets.some((widgetKey) => {
                                    const widget = featuresConfig[widgetKey];
                                    return "tags" in widget && widget.tags.includes(key);
                                });

                            return (
                                <Grid sx={{ mb: 1 }} xs={4} item key={type + key}>
                                    {key === featuresConfig.shareLink.key ? (
                                        <ShareLink />
                                    ) : (
                                        <WidgetMenuButtonWrapper
                                            activeCurrent={activeCurrent}
                                            activeElsewhere={activeElsewhere}
                                            activeTag={activeTag}
                                            onClick={
                                                type === FeatureType.Tag
                                                    ? () => history.push(`/tag/${key}`)
                                                    : handleClick(key)
                                            }
                                        >
                                            <IconButton disabled={activeElsewhere} size="large">
                                                <Icon />
                                            </IconButton>
                                            <Typography>{name}</Typography>
                                        </WidgetMenuButtonWrapper>
                                    )}
                                </Grid>
                            );
                        })}
                </Grid>
            </ScrollBox>
        </>
    );
}