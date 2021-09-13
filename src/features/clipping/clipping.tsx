import { Box, Button, FormControlLabel, IconButton, makeStyles } from "@material-ui/core";
import { AddCircle } from "@material-ui/icons";
import { useAppDispatch, useAppSelector } from "app/store";

import { Divider, Switch } from "components";
import { useToggle } from "hooks/useToggle";
import { renderActions, selectClippingPlanes } from "slices/renderSlice";

const useStyles = makeStyles((_theme) => ({
    addButton: {
        cursor: "pointer",
    },
    formControlLabel: {
        marginLeft: 0,
    },
}));

export function Clipping() {
    const classes = useStyles();

    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const { enabled, showBox, inside } = clippingPlanes;
    const dispatch = useAppDispatch();

    const [addBox, toggleAddBox] = useToggle(false);

    const toggle = (func: "enabled" | "showBox" | "inside") => () => {
        return dispatch(renderActions.setClippingPLanes({ ...clippingPlanes, [func]: !clippingPlanes[func] }));
    };

    return (
        <>
            <Box p={1}>
                {!addBox ? (
                    <Box display="flex" alignItems="center" className={classes.addButton} onClick={toggleAddBox}>
                        <IconButton size="small">
                            <AddCircle color="secondary" />
                        </IconButton>
                        Add clipping box
                    </Box>
                ) : (
                    <Box>
                        <Box mt={1} mb={2} display="flex" justifyContent="space-between" flexWrap="wrap">
                            <FormControlLabel
                                className={classes.formControlLabel}
                                control={<Switch checked={enabled} onChange={toggle("enabled")} />}
                                label={<Box ml={0.5}>Enabled</Box>}
                            />
                            <FormControlLabel
                                className={classes.formControlLabel}
                                control={<Switch checked={showBox} onChange={toggle("showBox")} />}
                                label={<Box ml={0.5}>Show (-z)</Box>}
                            />
                            <FormControlLabel
                                className={classes.formControlLabel}
                                control={<Switch checked={inside} onChange={toggle("inside")} />}
                                label={<Box ml={0.5}>Inside</Box>}
                            />
                        </Box>
                        <Box display="flex">
                            <Box mr={1} width={1}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="secondary"
                                    size="large"
                                    onClick={toggleAddBox}
                                >
                                    Cancel
                                </Button>
                            </Box>
                            <Button fullWidth variant="contained" color="primary" size="large">
                                Add clipping
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>
            <Divider />
        </>
    );
}
