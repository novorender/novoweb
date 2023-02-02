import { DeleteSweep } from "@mui/icons-material";
import { useRef, useEffect } from "react";
import { Box, Button, FormControlLabel, ListSubheader, MenuItem, OutlinedInput, Select } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";
import { ExtendedMeasureEntity } from "types/misc";

import { measureActions, selectMeasure } from "./measureSlice";
import { MeasuredObject, MeasuredResult } from "./measuredObject";
import { snapKinds } from "./config";

export default function Measure() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.measure.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.measure.key;
    const { duoMeasurementValues } = useAppSelector(selectMeasure);

    const dispatch = useAppDispatch();
    const { selectedEntities, loadingBrep, snapKind } = useAppSelector(selectMeasure);
    const selecting = useAppSelector(selectPicker) === Picker.Measurement;
    const isInitial = useRef(true);

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !selectedEntities.length) {
                dispatch(renderActions.setPicker(Picker.Measurement));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, selectedEntities]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Measurement));
        };
    }, [dispatch]);

    const onSelectSettingsChange = (newValue: "all" | "point" | "curve" | "surface") => {
        dispatch(measureActions.selectPickSettings(newValue));
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader disableShadow={menuOpen} widget={featuresConfig.measure}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.Measurement)
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Selecting</Box>}
                            />
                            <Select
                                sx={{ width: "auto", minWidth: 110, lineHeight: "normal" }}
                                inputProps={{ sx: { p: 0.8, fontSize: 14 } }}
                                name="snap to"
                                size="small"
                                value={snapKind}
                                onChange={(event) =>
                                    onSelectSettingsChange(event.target.value as "all" | "point" | "curve" | "surface")
                                }
                                input={<OutlinedInput fullWidth />}
                            >
                                <ListSubheader>Snap to</ListSubheader>
                                {snapKinds.map((opt) => (
                                    <MenuItem key={opt.val} value={opt.val}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Button
                                onClick={() => dispatch(measureActions.clear())}
                                color="grey"
                                disabled={!selectedEntities.length}
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                {loadingBrep ? (
                    <Box>
                        <LinearProgress />
                    </Box>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    {selectedEntities.map((obj, idx) => (
                        <MeasuredObject obj={obj as ExtendedMeasureEntity} idx={idx} key={idx} />
                    ))}
                    <MeasuredResult duoMeasurementValues={duoMeasurementValues} />
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.measure.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.measure.key}-widget-menu-fab`}
            />
        </>
    );
}
