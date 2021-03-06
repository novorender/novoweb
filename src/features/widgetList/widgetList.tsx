import { BoxProps, Grid, IconButton, Typography } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { explorerActions, selectLockedWidgets, selectEnabledWidgets, selectWidgets } from "slices/explorerSlice";
import { WidgetKey, featuresConfig } from "config/features";
import { ScrollBox, WidgetMenuButtonWrapper } from "components";
import { ShareLink } from "features/shareLink";

type Props = { display?: BoxProps["display"]; widgetKey?: WidgetKey; onSelect: () => void };

const sorting = [
    featuresConfig.properties.key,
    featuresConfig.modelTree.key,
    featuresConfig.bookmarks.key,
    featuresConfig.selectionBasket.key,
    featuresConfig.groups.key,
    featuresConfig.search.key,
    featuresConfig.measure.key,
    featuresConfig.shareLink.key,
    featuresConfig.clippingPlanes.key,
    featuresConfig.clippingBox.key,
    featuresConfig.orthoCam.key,
    featuresConfig.bimcollab.key,
    featuresConfig.panoramas.key,
    featuresConfig.propertyTree.key,
    featuresConfig.deviations.key,
    featuresConfig.followPath.key,
    featuresConfig.viewerScenes.key,
    featuresConfig.advancedSettings.key,
] as WidgetKey[];

export function WidgetList({ display, widgetKey, onSelect }: Props) {
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
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
        <ScrollBox display={display} flexGrow={1} p={1} pb={2}>
            <Grid container wrap="wrap" spacing={1} data-test="widget-list">
                {enabledWidgets
                    .filter((widget) => !lockedWidgets.includes(widget.key))
                    .sort((a, b) => {
                        const idxA = sorting.indexOf(a.key);
                        const idxB = sorting.indexOf(b.key);

                        return (idxA === -1 ? sorting.length : idxA) - (idxB === -1 ? sorting.length : idxB);
                    })
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
