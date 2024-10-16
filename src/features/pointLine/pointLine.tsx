import { Add, DeleteSweep, Undo } from "@mui/icons-material";
import { Box, Button, Checkbox, FormControlLabel } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    IosSwitch,
    LogoSpeedDial,
    ScrollBox,
    VertexTable,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { Picker, renderActions, selectPicker } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import {
    pointLineActions,
    selectCurrentPointLine,
    selectLockPointLineElevation,
    selectLockPointLineVertical,
} from "./pointLineSlice";

export default function PointLine() {
    const [menuOpen, toggleMenu] = useToggle();
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.pointLine.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.pointLine.key);

    const selecting = useAppSelector(selectPicker) === Picker.PointLine;
    const { points, result } = useAppSelector(selectCurrentPointLine);
    const lockElevation = useAppSelector(selectLockPointLineElevation);
    const lockVertical = useAppSelector(selectLockPointLineVertical);
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
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.pointLine}
                    disableShadow={menuOpen}
                >
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        name="toggle select points"
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(
                                                renderActions.setPicker(selecting ? Picker.Object : Picker.PointLine),
                                            )
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>{t("select")}</Box>}
                            />
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(pointLineActions.undoPoint(view))}
                                color="grey"
                            >
                                <Undo sx={{ mr: 1 }} />
                                {t("undo")}
                            </Button>
                            <Button
                                onClick={() => dispatch(pointLineActions.newPointLine())}
                                color="grey"
                                disabled={!points.length}
                            >
                                <Add sx={{ mr: 1 }} />
                                {t("new")}
                            </Button>
                            <Button
                                disabled={!points.length}
                                onClick={() => dispatch(pointLineActions.clearCurrent())}
                                color="grey"
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                {t("clear")}
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox flexDirection="column" display={menuOpen || minimized ? "none" : "flex"}>
                    <Box px={1} pt={1} display="flex">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="toggle lock elevation"
                                    size="medium"
                                    color="primary"
                                    checked={lockElevation}
                                    onChange={() => dispatch(pointLineActions.toggleLockElevation())}
                                />
                            }
                            label={<Box fontSize={14}>{t("lockElevation")}</Box>}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="toggle lock vertical"
                                    size="medium"
                                    color="primary"
                                    checked={lockVertical}
                                    onChange={() => dispatch(pointLineActions.toggleLockVertical())}
                                />
                            }
                            label={<Box fontSize={14}>{t("lockVertical")}</Box>}
                        />
                    </Box>
                    {result && result.totalLength > 0 ? (
                        <>
                            <Divider sx={{ py: 0 }} />
                            <Box p={1}>{t("totalLength", { length: result.totalLength.toFixed(3) })}</Box>

                            {points.length > 0 ? (
                                <Accordion defaultExpanded={false}>
                                    <AccordionSummary>{t("points")}</AccordionSummary>
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
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
