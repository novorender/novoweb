import { Add, DeleteSweep, Undo } from "@mui/icons-material";
import { Box, Button, FormControlLabel } from "@mui/material";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render/renderSlice";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";

import { areaActions, selectCurrentAreaPoints, selectCurrentAreaValue } from "./areaSlice";

export default function Area() {
    const [menuOpen, toggleMenu] = useToggle();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.area.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.area.key);

    const selecting = useAppSelector(selectPicker) === Picker.Area;
    const points = useAppSelector(selectCurrentAreaPoints);
    const area = useAppSelector(selectCurrentAreaValue);
    const dispatch = useAppDispatch();

    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !points.length) {
                dispatch(renderActions.setPicker(Picker.Area));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, points]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Area));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.area} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(renderActions.setPicker(selecting ? Picker.Object : Picker.Area))
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Select</Box>}
                            />
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(areaActions.undoPoint())}
                                color="grey"
                            >
                                <Undo sx={{ mr: 1 }} />
                                Undo
                            </Button>
                            <Button
                                onClick={() => dispatch(areaActions.newArea())}
                                color="grey"
                                disabled={!points.length}
                            >
                                <Add sx={{ mr: 1 }} />
                                New
                            </Button>
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(areaActions.setPoints({ points: [], normals: [] }))}
                                color="grey"
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"}>
                    <Box p={1}>{area > 0 ? <>Area: {area.toFixed(3)} &#13217;</> : null}</Box>
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.area.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
