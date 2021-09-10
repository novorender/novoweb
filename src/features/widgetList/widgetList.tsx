import { Box, createStyles, Grid, IconButton, makeStyles, Typography } from "@material-ui/core";

import { useAppDispatch, useAppSelector } from "app/store";
import { appActions, selectEnabledWidgets, selectWidgets } from "slices/appSlice";
import type { WidgetKey } from "config/features";

const useStyles = makeStyles((theme) =>
    createStyles({
        buttonContainer: {
            cursor: "pointer",

            "&:hover button:not(:disabled)": {
                background: theme.palette.grey[300],
            },

            "&:hover $activeCurrentButton:not(:disabled)": {
                background: theme.palette.primary.dark,
            },
        },
        activeElsewhere: {
            opacity: 0.3,
        },
        activeCurrentButton: {
            background: theme.palette.primary.main,
            "& svg": {
                fill: "#FFF",
            },
        },
        button: {
            background: theme.palette.grey[100],
        },
        buttonRoot: {
            "&.Mui-disabled": {
                background: theme.palette.grey[100],
                color: "inherit",
            },
        },
    })
);

type Props = { widgetKey?: WidgetKey; onSelect: () => void };

export function WidgetList({ widgetKey, onSelect }: Props) {
    const classes = useStyles();
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
            return dispatch(appActions.addWidgetSlot(key));
        }

        onSelect();
        dispatch(appActions.replaceWidgetSlot({ replace: widgetKey, key }));
    };

    return (
        <Grid container wrap="wrap" spacing={1} data-test="widget-list">
            {enabledWidgets.map(({ Icon, name, key }) => {
                const activeCurrent = key === widgetKey;
                const activeElsewhere = !activeCurrent && activeWidgets.includes(key);

                return (
                    <Grid xs={4} sm={3} item key={key}>
                        <Box
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            onClick={handleClick(key)}
                            className={
                                activeElsewhere
                                    ? `${classes.activeElsewhere} ${classes.buttonContainer}`
                                    : classes.buttonContainer
                            }
                        >
                            <IconButton
                                disabled={activeElsewhere}
                                classes={{ root: classes.buttonRoot }}
                                className={activeCurrent ? classes.activeCurrentButton : classes.button}
                            >
                                <Icon />
                            </IconButton>
                            <Typography>{name}</Typography>
                        </Box>
                    </Grid>
                );
            })}
        </Grid>
    );
}
