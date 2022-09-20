import { useEffect } from "react";
import {
    Box,
    Button,
    FormControlLabel,
    Grid,
    InputAdornment,
    List,
    ListItem,
    OutlinedInput,
    Typography,
} from "@mui/material";
import { AddCircle, DeleteSweep, Edit, Undo } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    IosSwitch,
    ScrollBox,
    LogoSpeedDial,
    WidgetContainer,
    WidgetHeader,
    Accordion,
    AccordionDetails,
    AccordionSummary,
} from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { Picker, renderActions, selectGridDefaults, selectPicker, CameraType } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { zoneSelectorActions, selectZoneSelectorPoints, selectZoneSelectorHeight } from "./zoneSelectorSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { vec3 } from "gl-matrix";
import { api } from "app";

export function ZoneSelector() {
    const [menuOpen, toggleMenu] = useToggle();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.area.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.area.key;

    const selecting = useAppSelector(selectPicker) === Picker.ZoneSelector;
    const points = useAppSelector(selectZoneSelectorPoints);
    const heights = useAppSelector(selectZoneSelectorHeight);
    const dispatch = useAppDispatch();
    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);

    useEffect(() => {
        const bs = view.scene?.boundingSphere;
        for (let i = 0; i < heights.length; ++i) {
            if (heights[i] === undefined) {
                dispatch(
                    zoneSelectorActions.setHeight({
                        height: bs
                            ? { min: bs.center[1] - bs.radius, max: bs.center[1] + bs.radius }
                            : { min: 0, max: 0 },
                        index: i,
                    })
                );
            }
        }
    }, [heights, view, dispatch]);

    const gridDefaults = useAppSelector(selectGridDefaults);

    const forceTopDown = () => {
        const bs = view.scene?.boundingSphere;
        const maxY = bs ? bs.center[1] + bs?.radius : 10000;
        const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
        const pos = vec3.copy(vec3.create(), view.camera.position);
        pos[1] = Math.min(pos[1], maxY);
        (orthoController as any).init(pos, [0, 1, 0], view.camera);
        const mat = (orthoController.params as any).referenceCoordSys;
        const right = vec3.fromValues(mat[0], mat[1], mat[2]);
        const up = vec3.fromValues(mat[4], mat[5], mat[6]);
        const pt = vec3.fromValues(mat[12], mat[13], mat[14]);

        const squareSize = 1 * (gridDefaults.minorLineCount + 1);

        dispatch(
            renderActions.setCamera({
                type: CameraType.Orthographic,
                params: {
                    kind: "ortho",
                    referenceCoordSys: mat,
                    fieldOfView: 100,
                    near: -0.001,
                    far: 1000,
                },
            })
        );

        dispatch(
            renderActions.setGrid({
                origo: pt,
                axisY: vec3.scale(vec3.create(), up, squareSize),
                axisX: vec3.scale(vec3.create(), right, squareSize),
            })
        );
    };

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.ZoneSelector));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.zoneSelector}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() => {
                                            selecting
                                                ? dispatch(renderActions.setCamera({ type: CameraType.Flight }))
                                                : forceTopDown();
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.ZoneSelector)
                                            );
                                        }}
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <Button
                                disabled={!points[points.length - 1].length}
                                onClick={() => dispatch(zoneSelectorActions.undoPoint())}
                                color="grey"
                            >
                                <Undo sx={{ mr: 1 }} />
                                Undo
                            </Button>
                            <Button
                                //disabled={points[points.length - 1].length !== 4}
                                onClick={() => dispatch(zoneSelectorActions.addExtent())}
                                color="grey"
                            >
                                <AddCircle sx={{ mr: 1 }} />
                                Add
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"}>
                    <List dense>
                        {points.map((extent, index) =>
                            extent.length === 0 ? (
                                <></>
                            ) : (
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>
                                        <ListItem>
                                            <Grid container>
                                                <Grid item xs={20}>
                                                    Zone_{index}
                                                    <Button
                                                        disabled={points[index].length !== 4}
                                                        onClick={() => dispatch(zoneSelectorActions.removeZone(index))}
                                                        color="grey"
                                                    >
                                                        <DeleteSweep sx={{ mr: 1 }} />
                                                        Delete
                                                    </Button>
                                                </Grid>
                                            </Grid>
                                        </ListItem>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <ListItem>
                                            <Grid container>
                                                <Grid item xs={20}>
                                                    <Typography sx={{ mb: 0.5 }}>From height:</Typography>
                                                    <OutlinedInput
                                                        value={heights[index]?.min ?? 0}
                                                        inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                                        onChange={(e) =>
                                                            dispatch(
                                                                zoneSelectorActions.setHeight({
                                                                    height: {
                                                                        min: Number(e.target.value.replace(",", ".")),
                                                                        max: heights[index]?.max ?? 0,
                                                                    },
                                                                    index,
                                                                })
                                                            )
                                                        }
                                                        fullWidth
                                                        size="small"
                                                        sx={{ fontWeight: 600 }}
                                                        endAdornment={
                                                            <InputAdornment position="end">
                                                                <Edit fontSize="small" />
                                                            </InputAdornment>
                                                        }
                                                    />
                                                </Grid>
                                                <Grid item xs={20}>
                                                    <Typography sx={{ mb: 0.5 }}>To height:</Typography>
                                                    <OutlinedInput
                                                        value={heights[index]?.max ?? 0}
                                                        inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                                        onChange={(e) =>
                                                            dispatch(
                                                                zoneSelectorActions.setHeight({
                                                                    height: {
                                                                        min: heights[index]?.min ?? 0,
                                                                        max: Number(e.target.value.replace(",", ".")),
                                                                    },
                                                                    index,
                                                                })
                                                            )
                                                        }
                                                        fullWidth
                                                        size="small"
                                                        sx={{ fontWeight: 600 }}
                                                        endAdornment={
                                                            <InputAdornment position="end">
                                                                <Edit fontSize="small" />
                                                            </InputAdornment>
                                                        }
                                                    />
                                                </Grid>
                                            </Grid>
                                        </ListItem>
                                    </AccordionDetails>
                                </Accordion>
                            )
                        )}
                    </List>
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.area.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.area.key}-widget-menu-fab`} />
        </>
    );
}
