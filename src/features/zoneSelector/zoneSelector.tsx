import { useEffect } from "react";
import { Box, Button, FormControlLabel, Grid, List, ListItem } from "@mui/material";
import { AddCircle, DeleteSweep, Undo } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, ScrollBox, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { Picker, renderActions, selectGridDefaults, selectPicker, CameraType } from "slices/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { zoneSelectorActions, selectZoneSelectorPoints } from "./zoneSelectorSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { vec3 } from "gl-matrix";
import { api } from "app";

export function ZoneSelector() {
    const [menuOpen, toggleMenu] = useToggle();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.area.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.area.key;

    const selecting = useAppSelector(selectPicker) === Picker.ZoneSelector;
    const points = useAppSelector(selectZoneSelectorPoints);
    const dispatch = useAppDispatch();

    const {
        state: { view, canvas },
    } = useExplorerGlobals(true);
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
                                disabled={points[points.length - 1].length !== 4}
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
                                <ListItem>
                                    <Grid container>
                                        <Grid item xs={4}>
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
