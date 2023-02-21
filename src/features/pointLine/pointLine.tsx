import { useEffect, useRef } from "react";
import { Box, Button, Checkbox, FormControlLabel } from "@mui/material";
import { DeleteSweep, Undo } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    IosSwitch,
    ScrollBox,
    LogoSpeedDial,
    WidgetContainer,
    WidgetHeader,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    VertexTable,
} from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { Picker, renderActions, selectPicker } from "features/render/renderSlice";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { pointLineActions, selectPointLine } from "./pointLineSlice";

export default function PointLine() {
    const [menuOpen, toggleMenu] = useToggle();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.pointLine.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.pointLine.key;

    const selecting = useAppSelector(selectPicker) === Picker.PointLine;
    const { points, lockElevation, result } = useAppSelector(selectPointLine);
    const dispatch = useAppDispatch();

    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !points.length) {
                dispatch(renderActions.setPicker(Picker.PointLine));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, points]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.PointLine));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.pointLine} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.PointLine)
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(pointLineActions.undoPoint())}
                                color="grey"
                            >
                                <Undo sx={{ mr: 1 }} />
                                Undo
                            </Button>
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(pointLineActions.setPoints([]))}
                                color="grey"
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox flexDirection="column" display={menuOpen || minimized ? "none" : "flex"}>
                    <Box px={1} pt={1}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="medium"
                                    color="primary"
                                    checked={lockElevation}
                                    onChange={() => dispatch(pointLineActions.toggleLockElevation())}
                                />
                            }
                            label={<Box fontSize={14}>Lock elevation</Box>}
                        />
                    </Box>
                    {result && result.totalLength > 0 ? (
                        <>
                            <Divider sx={{ py: 0 }} />
                            <Box p={1}>Total length: {result.totalLength.toFixed(3)} m</Box>

                            {points.length > 0 ? (
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>Points</AccordionSummary>
                                    <AccordionDetails>
                                        <Box p={1}>
                                            <VertexTable vertices={points} />
                                        </Box>
                                    </AccordionDetails>
                                </Accordion>
                            ) : null}
                        </>
                    ) : null}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.pointLine.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.pointLine.key}-widget-menu-fab`}
            />
        </>
    );
}
