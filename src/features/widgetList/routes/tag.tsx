import { useHistory, useParams } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";
import { Box, Button, Grid, IconButton, Typography, useTheme } from "@mui/material";

import { useAppSelector } from "app/store";
import { selectLockedWidgets, selectEnabledWidgets, selectWidgets } from "slices/explorerSlice";
import { WidgetKey, FeatureTagKey } from "config/features";
import { Divider, ScrollBox, WidgetMenuButtonWrapper } from "components";

import { sorting } from "../widgetList";

export function Tag({
    handleClick,
    currentWidget,
}: {
    currentWidget: WidgetKey | undefined;
    handleClick: (key: WidgetKey) => () => void;
}) {
    const theme = useTheme();
    const history = useHistory();
    const { tag } = useParams<{ tag?: FeatureTagKey }>();

    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const activeWidgets = useAppSelector(selectWidgets);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.replace("/")} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>
            <ScrollBox flexGrow={1} px={1} py={2}>
                <Grid container wrap="wrap" spacing={1} data-test="widget-list">
                    {tag &&
                        enabledWidgets
                            .filter(
                                (widget) =>
                                    !lockedWidgets.includes(widget.key) && "tags" in widget && widget.tags.includes(tag)
                            )
                            .sort((a, b) => {
                                const idxA = sorting.indexOf(a.key);
                                const idxB = sorting.indexOf(b.key);

                                return (idxA === -1 ? sorting.length : idxA) - (idxB === -1 ? sorting.length : idxB);
                            })
                            .map(({ Icon, name, key }) => {
                                const activeCurrent = key === currentWidget;
                                const activeElsewhere = !activeCurrent && activeWidgets.includes(key);

                                return (
                                    <Grid sx={{ mb: 1 }} xs={4} item key={key}>
                                        <WidgetMenuButtonWrapper
                                            activeCurrent={activeCurrent}
                                            activeElsewhere={activeElsewhere}
                                            onClick={handleClick(key)}
                                        >
                                            <IconButton disabled={activeElsewhere} size="large">
                                                <Icon />
                                            </IconButton>
                                            <Typography>{name}</Typography>
                                        </WidgetMenuButtonWrapper>
                                    </Grid>
                                );
                            })}
                </Grid>
            </ScrollBox>
        </>
    );
}
