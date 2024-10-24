import { Add, DeleteSweep } from "@mui/icons-material";
import { Box, Button, FormControlLabel, ListSubheader, MenuItem, OutlinedInput, Select } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch, LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { Picker, renderActions, selectPicker } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { ExtendedMeasureEntity } from "types/misc";

import { snapKinds } from "./config";
import { MeasuredObject, MeasuredResult } from "./measuredObject";
import { measureActions, selectMeasure } from "./measureSlice";

export default function Measure() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.measure.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.measure.key);
    const { duoMeasurementValues } = useAppSelector(selectMeasure);

    const dispatch = useAppDispatch();
    const { selectedEntities, loadingBrep, snapKind, currentIndex } = useAppSelector(selectMeasure);
    const currentEntities = selectedEntities[currentIndex];
    const currentResult = duoMeasurementValues.length > 0 ? duoMeasurementValues[currentIndex] : undefined;
    const selecting = useAppSelector(selectPicker) === Picker.Measurement;
    const isInitial = useRef(true);
    const hasClippingOutline =
        view.renderState.clipping.enabled &&
        view.renderState.clipping.planes.some((a) => {
            return a.outline?.enabled === true;
        });

    useEffect(() => {
        if (isInitial.current) {
            if (!selecting && !currentEntities.length) {
                dispatch(renderActions.setPicker(Picker.Measurement));
            }

            isInitial.current = false;
        }
    }, [dispatch, selecting, currentEntities]);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Measurement));
        };
    }, [dispatch]);

    const onSelectSettingsChange = (newValue: "all" | "point" | "curve" | "surface" | "clippingOutline") => {
        dispatch(measureActions.selectPickSettings(newValue));
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    disableShadow={menuOpen}
                    widget={featuresConfig.measure}
                >
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        name="toggle pick measurement"
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.Measurement),
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>{t("select")}</Box>}
                            />
                            <Select
                                sx={{ width: "auto", minWidth: 110, lineHeight: "normal" }}
                                inputProps={{ sx: { p: 0.8, fontSize: 14 } }}
                                name="snap to"
                                size="small"
                                value={snapKind}
                                onChange={(event) =>
                                    onSelectSettingsChange(
                                        event.target.value as "all" | "point" | "curve" | "surface" | "clippingOutline",
                                    )
                                }
                                input={<OutlinedInput fullWidth />}
                            >
                                <ListSubheader>{t("snapTo")}</ListSubheader>
                                {snapKinds.map((opt) => (
                                    <MenuItem
                                        key={opt.val}
                                        value={opt.val}
                                        disabled={opt.val === "clippingOutline" && !hasClippingOutline}
                                    >
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Button
                                onClick={() => dispatch(measureActions.newMeasurement())}
                                color="grey"
                                disabled={!currentEntities.length}
                            >
                                <Add sx={{ mr: 1 }} />
                                {t("new")}
                            </Button>
                            <Button
                                onClick={() => {
                                    dispatch(renderActions.setPicker(Picker.Object));
                                    dispatch(measureActions.clear());
                                }}
                                color="grey"
                                disabled={!currentEntities.length}
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                {t("clear")}
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                {loadingBrep ? (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    {currentEntities.map((obj, idx) => (
                        <MeasuredObject obj={obj as ExtendedMeasureEntity} idx={idx} key={idx} />
                    ))}
                    <MeasuredResult duoMeasurementValues={currentResult?.result} />
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.measure.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
