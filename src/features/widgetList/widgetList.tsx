import { Grid, IconButton, Typography } from "@mui/material";
import { View } from "@novorender/webgl-api";

import { useAppDispatch, useAppSelector } from "app/store";
import { explorerActions, selectEnabledWidgets, selectWidgets } from "slices/explorerSlice";
import { WidgetKey, config as featuresConfig } from "config/features";
import { WidgetMenuButtonWrapper } from "components";
import { ShareLink } from "features/shareLink";

type Props = { widgetKey?: WidgetKey; onSelect: () => void; view: View };

export function WidgetList({ widgetKey, onSelect, view }: Props) {
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
        <Grid container wrap="wrap" spacing={1} data-test="widget-list">
            {enabledWidgets
                .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }))
                .map(({ Icon, name, key }) => {
                    const activeCurrent = key === widgetKey;
                    const activeElsewhere = !activeCurrent && activeWidgets.includes(key);

                    return (
                        <Grid xs={4} sm={3} item key={key}>
                            {key === featuresConfig.shareLink.key ? (
                                <ShareLink view={view} />
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
    );
}
