import { ArrowBack, ArrowForward, ColorLens, Edit, RestartAlt } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControlLabel,
    Grid,
    InputAdornment,
    OutlinedInput,
    Radio,
    RadioGroup,
    Slider,
    Typography,
    useTheme,
} from "@mui/material";
import { FollowParametricObject } from "@novorender/api";
import { FormEvent, MouseEvent, SyntheticEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Accordion, AccordionDetails, AccordionSummary, Divider, IosSwitch, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ColorPicker } from "features/colorPicker";
import { renderActions, selectViewMode } from "features/render";
import { AsyncStatus, ViewMode } from "types/misc";
import { rgbToVec, vecToRgb } from "utils/color";

import {
    followPathActions,
    selectAutoRecenter,
    selectAutoStepSize,
    selectClipping,
    selectFollowDeviations,
    selectLandXmlPaths,
    selectProfile,
    selectProfileRange,
    selectPtHeight,
    selectReset,
    selectSelectedPath,
    selectShowGrid,
    selectShowTracer,
    selectStep,
    selectVerticalClipping,
    selectView2d,
} from "./followPathSlice";
import { TracerType } from "./types";
import { useGoToProfile } from "./useGoToProfile";

const profileFractionDigits = 3;

export function Follow({ fpObj }: { fpObj: FollowParametricObject }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const view2d = useAppSelector(selectView2d);
    const showGrid = useAppSelector(selectShowGrid);
    const autoRecenter = useAppSelector(selectAutoRecenter);
    const verticalClipping = useAppSelector(selectVerticalClipping);
    const autoStepSize = useAppSelector(selectAutoStepSize);
    const profile = useAppSelector(selectProfile);
    const step = useAppSelector(selectStep);
    const ptHeight = useAppSelector(selectPtHeight);
    const profileRange = useAppSelector(selectProfileRange);
    const reset = useAppSelector(selectReset);
    const selectedPath = useAppSelector(selectSelectedPath);
    const paths = useAppSelector(selectLandXmlPaths);
    const _clipping = useAppSelector(selectClipping);
    const showTracer = useAppSelector(selectShowTracer);
    const deviations = useAppSelector(selectFollowDeviations);
    const goToProfile = useGoToProfile();
    const viewMode = useAppSelector(selectViewMode);
    const viewModeRef = useRef(viewMode);

    const [profileInput, setProfileInput] = useState(profile);
    const [clipping, setClipping] = useState(_clipping);

    const dispatch = useAppDispatch();

    const setTracer = (val: TracerType) => {
        dispatch(followPathActions.setShowTracer(val));
    };

    const pathName =
        paths.status === AsyncStatus.Initial || paths.status === AsyncStatus.Loading
            ? "..."
            : paths.status === AsyncStatus.Success
              ? paths.data.find((p) => p.id === selectedPath)?.name
              : "[error]";

    useEffect(() => {
        viewModeRef.current = viewMode;
    }, [viewMode]);

    useEffect(() => setClipping(_clipping), [_clipping]);

    useEffect(
        function syncProfileInput() {
            setProfileInput(profile);
        },
        [profile],
    );

    useEffect(() => {
        dispatch(
            followPathActions.setProfileRange({ min: fpObj.parameterBounds.start, max: fpObj.parameterBounds.end }),
        );
    }, [fpObj, dispatch]);

    useEffect(() => {
        if (reset === undefined || !fpObj) {
            return;
        }
        let t = Number(profile);
        if (reset === "initPosition") {
            dispatch(followPathActions.setProfile(fpObj.parameterBounds.start.toFixed(3)));
            t = fpObj.parameterBounds.start;
        }
        dispatch(followPathActions.setReset(undefined));
        goToProfile({ fpObj, keepOffset: false, p: t, keepCamera: reset === "default" });
    }, [view2d, showGrid, profile, goToProfile, autoRecenter, reset, dispatch, fpObj, paths, selectedPath]);

    const handle2dChange = () => {
        const newState = !view2d;

        dispatch(followPathActions.setView2d(newState));
        goToProfile({ fpObj, p: Number(profile), newView2d: newState, keepOffset: false });
    };

    const handleGridChange = () => {
        if (!view2d) {
            return;
        }

        const newState = !showGrid;

        dispatch(followPathActions.setShowGrid(newState));
        dispatch(renderActions.setGrid({ enabled: newState }));
    };

    const handleAutoRecenterChange = () => {
        const recenter = !autoRecenter;

        if (recenter) {
            goToProfile({ fpObj, p: Number(profile), keepOffset: false });
        }

        dispatch(followPathActions.setAutoRecenter(recenter));
    };

    const handleVerticalClippingChange = () => {
        const vertical = !verticalClipping;

        goToProfile({ fpObj, p: Number(profile), keepOffset: !autoRecenter, clipVertical: vertical });
        dispatch(followPathActions.setVerticalClipping(vertical));
    };

    const handleToggleLine = () => {
        const newShowLine = !deviations.line;
        dispatch(followPathActions.setShowDeviationLine(newShowLine));
    };

    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const handlePrioritizationChanged = (_: unknown, value: string) => {
        dispatch(followPathActions.setDeviationPrioritization(value as "minimum" | "maximum"));
    };

    const handleAutoStepSizeChange = () => {
        if (!autoStepSize) {
            dispatch(followPathActions.setStep(String(clipping)));
            dispatch(followPathActions.setAutoStepSize(true));
        } else {
            dispatch(followPathActions.setAutoStepSize(false));
        }
    };

    const handlePrev = () => {
        if (!profileRange) {
            return;
        }

        if (!step) {
            dispatch(followPathActions.setStep("1"));
        }

        let next = Number(profile) - Number(step || "1");

        if (next > profileRange.max) {
            next = profileRange.max;
        } else if (next < profileRange.min) {
            next = profileRange.min;
        }

        dispatch(followPathActions.setProfile(next.toFixed(profileFractionDigits)));
        goToProfile({ fpObj, p: next, keepOffset: !autoRecenter });
    };

    const handleNext = () => {
        if (!profileRange) {
            return;
        }

        if (!step) {
            dispatch(followPathActions.setStep("1"));
        }

        let next = Number(profile) + Number(step || "1");

        if (Number.isNaN(next)) {
            next = 1;
        }

        if (next > profileRange.max) {
            next = profileRange.max;
        } else if (next < profileRange.min) {
            next = profileRange.min;
        }

        dispatch(followPathActions.setProfile(next.toFixed(profileFractionDigits)));
        goToProfile({ fpObj, p: next, keepOffset: !autoRecenter });
    };

    const handleGoToStart = () => {
        if (!profileRange) {
            return;
        }

        const p = profileRange.min.toFixed(profileFractionDigits);

        dispatch(followPathActions.setProfile(p));
        goToProfile({ fpObj, p: Number(p) });
    };

    const handleProfileSubmit = (e: FormEvent) => {
        e.preventDefault();

        dispatch(followPathActions.setProfile(profileInput));
        goToProfile({
            fpObj,
            p: Number(profileInput),
            keepOffset: !autoRecenter,
        });
    };

    const handleClippingChange = (_event: Event, newValue: number | number[]) => {
        if (Array.isArray(newValue)) {
            return;
        }

        setClipping(newValue);
        if (view.renderState.camera.kind === "orthographic") {
            view.modifyRenderState({ camera: { far: newValue } });
        }
    };

    const handleClippingCommit = (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
        if (Array.isArray(newValue)) {
            return;
        }

        dispatch(followPathActions.setClipping(newValue));

        if (autoStepSize) {
            dispatch(followPathActions.setStep(String(newValue)));
        }
    };

    useEffect(() => {
        if (viewModeRef.current !== ViewMode.Deviations) {
            dispatch(renderActions.setViewMode(ViewMode.FollowPath));
        }
    }, [dispatch]);

    const { r, g, b } = vecToRgb(deviations.lineColor);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button
                            onClick={() => {
                                history.push("/");
                            }}
                            color="grey"
                        >
                            <ArrowBack sx={{ mr: 1 }} />
                            {t("back")}
                        </Button>
                        <FormControlLabel
                            sx={{ ml: 3 }}
                            control={
                                <IosSwitch size="medium" color="primary" checked={view2d} onChange={handle2dChange} />
                            }
                            label={<Box fontSize={14}>{t("2d")}</Box>}
                        />
                        <Button
                            disabled={profileRange?.min.toFixed(profileFractionDigits) === profile}
                            onClick={handleGoToStart}
                            color="grey"
                        >
                            <RestartAlt sx={{ mr: 1 }} />
                            {t("startOver")}
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox pt={2} pb={4}>
                <Box px={1}>
                    <Grid container columnSpacing={0} rowSpacing={2}>
                        <Grid item xs={6}>
                            <Typography sx={{ mb: 0.5 }}>{t("profileStartName")}</Typography>
                            <OutlinedInput
                                size="small"
                                fullWidth
                                readOnly
                                color="secondary"
                                value={profileRange?.min.toFixed(profileFractionDigits) ?? ""}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <Typography sx={{ mb: 0.5 }}>{t("profileEnd")}</Typography>
                            <OutlinedInput
                                size="small"
                                fullWidth
                                readOnly
                                color="secondary"
                                value={profileRange?.max.toFixed(profileFractionDigits) ?? ""}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <Typography sx={{ mb: 0.5 }}>{t("heightName")}</Typography>
                            <OutlinedInput
                                size="small"
                                fullWidth
                                readOnly
                                color="secondary"
                                value={ptHeight?.toFixed(profileFractionDigits) ?? ""}
                            />
                        </Grid>
                        <Grid item xs={6} component="form" onSubmit={handleProfileSubmit}>
                            <Typography sx={{ mb: 0.5 }}>{t("profileName")}</Typography>
                            <OutlinedInput
                                value={profileInput}
                                inputProps={{ inputMode: "numeric", pattern: "-?[0-9,.]*" }}
                                onChange={(e) => setProfileInput(e.target.value.replace(",", "."))}
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
                        <Grid pt={0} item xs={6}>
                            <Typography sx={{ mb: 0.5 }}>{t("stepSize")}</Typography>
                            <OutlinedInput
                                value={autoStepSize ? String(clipping) : step}
                                inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                                onChange={(e) => {
                                    dispatch(followPathActions.setAutoStepSize(false));
                                    dispatch(followPathActions.setStep(e.target.value.replace(",", ".")));
                                }}
                                size="small"
                                fullWidth
                                sx={{ fontWeight: 600 }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <Edit fontSize="small" />
                                    </InputAdornment>
                                }
                            />
                        </Grid>
                        <Grid item xs={6} display="flex" alignItems="flex-end">
                            <Box display="flex" width={1}>
                                <Button
                                    fullWidth
                                    disabled={profileRange?.min.toFixed(profileFractionDigits) === profile}
                                    color="grey"
                                    onClick={handlePrev}
                                    variant="contained"
                                    sx={{ borderRadius: 0, boxShadow: "none", opacity: 0.7 }}
                                    size="large"
                                >
                                    <ArrowBack />
                                </Button>
                                <Button
                                    fullWidth
                                    disabled={profileRange?.max.toFixed(profileFractionDigits) === profile}
                                    color="grey"
                                    onClick={handleNext}
                                    variant="contained"
                                    sx={{ borderRadius: 0, boxShadow: "none" }}
                                    size="large"
                                >
                                    <ArrowForward />
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Divider sx={{ mt: 2, mb: 1 }} />

                    <Box display="flex" flexDirection="column" mb={2}>
                        <Box mb={1}>
                            {t("selectedCenterline")}
                            <strong>{pathName}</strong>
                        </Box>
                        <FormControlLabel
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={autoRecenter}
                                    onChange={handleAutoRecenterChange}
                                />
                            }
                            label={<Box>{t("automaticallyRecenter")}</Box>}
                        />
                        <FormControlLabel
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={verticalClipping}
                                    onChange={handleVerticalClippingChange}
                                />
                            }
                            label={<Box>{t("verticalClipping")}</Box>}
                        />
                        {view2d ? (
                            <>
                                <FormControlLabel
                                    control={
                                        <IosSwitch
                                            size="medium"
                                            color="primary"
                                            checked={showGrid}
                                            onChange={handleGridChange}
                                        />
                                    }
                                    label={<Box>{t("showGrid")}</Box>}
                                />

                                <FormControlLabel
                                    control={
                                        <IosSwitch
                                            size="medium"
                                            color="primary"
                                            checked={autoStepSize}
                                            onChange={handleAutoStepSizeChange}
                                        />
                                    }
                                    label={<Box>{t("matchStepSizeToClippingDistance")}</Box>}
                                />

                                <Divider sx={{ my: 1 }} />

                                <Typography>{`${t("clippingName")} ${clipping} m`}</Typography>
                                <Box mx={2}>
                                    <Slider
                                        getAriaLabel={() => "Clipping far"}
                                        value={clipping}
                                        min={0.001}
                                        max={1}
                                        step={0.01}
                                        onChange={handleClippingChange}
                                        onChangeCommitted={handleClippingCommit}
                                        valueLabelDisplay="off"
                                    />
                                </Box>
                            </>
                        ) : null}
                    </Box>
                </Box>

                {view2d && (
                    <Accordion>
                        <AccordionSummary>{t("deviations")}</AccordionSummary>
                        <AccordionDetails sx={{ p: 1, display: "flex", flexDirection: "column" }}>
                            <FormControlLabel
                                sx={{ mb: 1 }}
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={deviations.line}
                                        onChange={handleToggleLine}
                                    />
                                }
                                label={<Box>{t("showDeviationLine")}</Box>}
                            />
                            <Button
                                sx={{ mb: 1, alignSelf: "start" }}
                                variant="outlined"
                                color="grey"
                                onClick={toggleColorPicker}
                            >
                                <ColorLens sx={{ mr: 1, color: `rgb(${r}, ${g}, ${b})` }} fontSize="small" />
                                {t("lineColor")}
                            </Button>
                            <Divider sx={{ my: 1, borderColor: theme.palette.grey[300] }} />
                            <Typography fontWeight={600}>{t("prioritization")}</Typography>
                            <RadioGroup
                                aria-label="Prioritize deviations"
                                value={deviations.prioritization}
                                onChange={handlePrioritizationChanged}
                                name="radio-buttons-group"
                            >
                                <FormControlLabel value={"maximum"} control={<Radio />} label="Maximum" />
                                <FormControlLabel value={"minimum"} control={<Radio />} label="Minimum" />
                            </RadioGroup>
                        </AccordionDetails>
                    </Accordion>
                )}

                <RadioGroup
                    aria-label="Tracer 2d"
                    value={showTracer}
                    onChange={(e) => setTracer(e.target.value as TracerType)}
                    name="radio-buttons-group"
                >
                    <FormControlLabel value="off" control={<Radio />} label={t("off")} />
                    <FormControlLabel value="vertical" control={<Radio />} label={t("vertical")} />
                    <FormControlLabel value="normal" control={<Radio />} label={t("normal")} />
                </RadioGroup>
            </ScrollBox>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={deviations.lineColor}
                onChangeComplete={({ rgb }) => {
                    dispatch(followPathActions.setDeviationLineColor(rgbToVec(rgb)));
                }}
            />
        </>
    );
}
