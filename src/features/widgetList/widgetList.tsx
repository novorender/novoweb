import { Box, Grid, IconButton, Typography, styled, BoxProps, iconButtonClasses } from "@mui/material";
import { css } from "@mui/styled-engine";

import { useAppDispatch, useAppSelector } from "app/store";
import { explorerActions, selectEnabledWidgets, selectWidgets } from "slices/explorerSlice";
import type { WidgetKey } from "config/features";

const ButtonWrapper = styled(Box, {
    shouldForwardProp: (prop: string) => !["activeCurrent", "activeElsewhere"].includes(prop),
})<BoxProps & { activeCurrent?: boolean; activeElsewhere?: boolean }>(
    ({ activeCurrent, activeElsewhere, theme }) => css`
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        opacity: ${activeElsewhere ? 0.3 : 1};

        &:hover .${iconButtonClasses.root}:not(:disabled) {
            background: ${activeCurrent ? theme.palette.primary.dark : theme.palette.grey[300]};
        }

        .${iconButtonClasses.root} {
            background: ${activeCurrent ? theme.palette.primary.main : theme.palette.grey[100]};

            svg,
            svg path {
                fill: ${activeCurrent ? theme.palette.common.white : theme.palette.text.primary};
            }
        }
    `
);

type Props = { widgetKey?: WidgetKey; onSelect: () => void };

export function WidgetList({ widgetKey, onSelect }: Props) {
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
                            <ButtonWrapper
                                activeCurrent={activeCurrent}
                                activeElsewhere={activeElsewhere}
                                onClick={handleClick(key)}
                            >
                                <IconButton disabled={activeElsewhere} size="large">
                                    <Icon />
                                </IconButton>
                                <Typography>{name}</Typography>
                            </ButtonWrapper>
                        </Grid>
                    );
                })}
        </Grid>
    );
}
