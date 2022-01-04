import { BoxProps, Grid, IconButton, Typography } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { explorerActions, selectEnabledWidgets, selectWidgets } from "slices/explorerSlice";
import { WidgetKey, featuresConfig } from "config/features";
import { ScrollBox, WidgetMenuButtonWrapper } from "components";
import { ShareLink } from "features/shareLink";

type Props = { display?: BoxProps["display"]; widgetKey?: WidgetKey; onSelect: () => void };

export function WidgetList({ display, widgetKey, onSelect }: Props) {
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const activeWidgets = useAppSelector(selectWidgets);

    const dispatch = useAppDispatch();

    const handleClick = (key: WidgetKey) => () => {
        const active = key !== widgetKey && activeWidgets.includes(key);

        if (active) {
            return;
        }

        if (!widgetKey) {
            onSelect();
            return dispatch(explorerActions.addWidgetSlot(key));
        }

        onSelect();
        dispatch(explorerActions.replaceWidgetSlot({ replace: widgetKey, key }));
    };

    return (
        <ScrollBox display={display} flexGrow={1} mt={2} mb={2} px={1}>
            <Grid container wrap="wrap" spacing={1} data-test="widget-list">
                {enabledWidgets
                    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }))
                    .map(({ Icon, name, key }) => {
                        const activeCurrent = key === widgetKey;
                        const activeElsewhere = !activeCurrent && activeWidgets.includes(key);

                        return (
                            <Grid sx={{ mb: 1 }} xs={4} item key={key}>
                                {key === featuresConfig.shareLink.key ? (
                                    <ShareLink />
                                ) : (
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
                                )}
                            </Grid>
                        );
                    })}
            </Grid>
        </ScrollBox>
    );
}
