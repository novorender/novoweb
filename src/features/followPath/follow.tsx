import { FormEvent, SyntheticEvent, useCallback, useEffect, useState } from "react";
import { FollowParametricObject } from "@novorender/measure-api";
import {
    Box,
    Button,
    FormControlLabel,
    Grid,
    InputAdornment,
    OutlinedInput,
    Slider,
    Typography,
    useTheme,
} from "@mui/material";
import { ArrowBack, ArrowForward, Edit, RestartAlt } from "@mui/icons-material";
import { FlightControllerParams, OrthoControllerParams } from "@novorender/webgl-api";
import { vec3, quat, mat3, mat4, glMatrix } from "gl-matrix";
import { useHistory } from "react-router-dom";

import { IosSwitch, Divider, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions } from "features/render/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import {
    followPathActions,
    selectProfile,
    selectPtHeight,
    selectStep,
    selectView2d,
    selectProfileRange,
    selectClipping,
    selectShowGrid,
    selectAutoRecenter,
    selectCurrentCenter,
    selectAutoStepSize,
    selectResetPositionOnInit,
    selectSelectedPath,
    selectLandXmlPaths,
} from "./followPathSlice";
import { AsyncStatus, ViewMode } from "types/misc";

const profileFractionDigits = 3;

export function Follow({ fpObj }: { fpObj: FollowParametricObject }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const currentCenter = useAppSelector(selectCurrentCenter);
    const view2d = useAppSelector(selectView2d);
    const showGrid = useAppSelector(selectShowGrid);
    const autoRecenter = useAppSelector(selectAutoRecenter);
    const autoStepSize = useAppSelector(selectAutoStepSize);
    const profile = useAppSelector(selectProfile);
    const step = useAppSelector(selectStep);
    const ptHeight = useAppSelector(selectPtHeight);
    const profileRange = useAppSelector(selectProfileRange);
    const resetPosition = useAppSelector(selectResetPositionOnInit);
    const selectedPath = useAppSelector(selectSelectedPath);
    const paths = useAppSelector(selectLandXmlPaths);
    const _clipping = useAppSelector(selectClipping);

    const [clipping, setClipping] = useState(_clipping);

    const dispatch = useAppDispatch();

    const goToProfile = useCallback(
        async ({
            view2d,
            showGrid,
            keepOffset,
            p,
        }: {
            p: number;
            view2d: boolean;
            showGrid: boolean;
            keepOffset?: boolean;
        }): Promise<void> => {
            const pos = await fpObj.getCameraValues(p);

            if (!pos) {
                return;
            }

            if (selectedPath !== undefined && paths.status === AsyncStatus.Success) {
                const roadIds = paths.data[selectedPath].roadIds;
                if (roadIds) {
                    dispatch(followPathActions.setDrawRoadId(roadIds));
                }
            }

            const { position: pt, normal: dir } = pos;

            const offset =
                keepOffset && currentCenter
                    ? vec3.sub(vec3.create(), currentCenter, view.camera.position)
                    : vec3.fromValues(0, 0, 0);
            const offsetPt = vec3.sub(vec3.create(), pt, offset);
            const dist = vec3.dot(vec3.sub(vec3.create(), offsetPt, pt), dir);
            vec3.scaleAndAdd(offsetPt, offsetPt, dir, -dist);

            const up = glMatrix.equals(Math.abs(vec3.dot(vec3.fromValues(0, 1, 0), dir)), 1)
                ? vec3.fromValues(0, 0, 1)
                : vec3.fromValues(0, 1, 0);

            const right = vec3.cross(vec3.create(), up, dir);

            vec3.cross(up, dir, right);
            vec3.normalize(up, up);

            vec3.cross(right, up, dir);
            vec3.normalize(right, right);

            const rotation = quat.fromMat3(
                quat.create(),
                mat3.fromValues(right[0], right[1], right[2], up[0], up[1], up[2], dir[0], dir[1], dir[2])
            );

            if (view2d) {
                const mat = mat4.fromRotationTranslation(mat4.create(), rotation, offsetPt);

                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        params: {
                            kind: "ortho",
                            referenceCoordSys: mat,
                            fieldOfView: view.camera.fieldOfView,
                            near: -0.001,
                            far: clipping,
                            position: [0, 0, 0],
                        },
                        gridOrigo: pt as vec3,
                    })
                );

                dispatch(
                    renderActions.setGrid({
                        enabled: showGrid,
                    })
                );
            } else {
                dispatch(renderActions.setGrid({ enabled: false }));
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Flight,
                        goTo: {
                            position: offsetPt,
                            rotation,
                        },
                    })
                );
            }

            dispatch(followPathActions.setCurrentCenter(pt as [number, number, number]));
            dispatch(followPathActions.setPtHeight(pt[1]));
        },
        [clipping, currentCenter, dispatch, fpObj, view, selectedPath, paths]
    );

    useEffect(() => {
        dispatch(
            followPathActions.setProfileRange({ min: fpObj.parameterBounds.start, max: fpObj.parameterBounds.end })
        );
    }, [fpObj, dispatch]);

    useEffect(() => {
        if (!resetPosition || !fpObj) {
            return;
        }

        dispatch(followPathActions.toggleResetPositionOnInit(false));
        dispatch(followPathActions.setProfile(fpObj.parameterBounds.start.toFixed(3)));
        goToProfile({ view2d, showGrid, keepOffset: false, p: fpObj.parameterBounds.start });
    }, [view2d, showGrid, profile, goToProfile, autoRecenter, resetPosition, dispatch, fpObj]);

    const handle2dChange = () => {
        const newState = !view2d;

        dispatch(followPathActions.setView2d(newState));
        goToProfile({ p: Number(profile), view2d: newState, showGrid });
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
            goToProfile({ p: Number(profile), view2d, showGrid, keepOffset: false });
        }

        dispatch(followPathActions.setAutoRecenter(recenter));
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
        goToProfile({ p: next, view2d, showGrid, keepOffset: !autoRecenter });
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
        goToProfile({ p: next, view2d, showGrid, keepOffset: !autoRecenter });
    };

    const handleGoToStart = () => {
        if (!profileRange) {
            return;
        }

        const p = profileRange.min.toFixed(profileFractionDigits);

        dispatch(followPathActions.setProfile(p));
        goToProfile({ p: Number(p), view2d, showGrid });
    };

    const handleProfileSubmit = (e: FormEvent) => {
        e.preventDefault();

        goToProfile({
            p: Number(profile),
            view2d,
            showGrid,
            keepOffset: !autoRecenter,
        });
    };

    const handleClippingChange = (_event: Event, newValue: number | number[]) => {
        if (Array.isArray(newValue)) {
            return;
        }

        setClipping(newValue);
        (view.camera.controller.params as FlightControllerParams | OrthoControllerParams).far = newValue;
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
        dispatch(renderActions.setViewMode(ViewMode.FollowPath));

        return () => {
            dispatch(renderActions.setViewMode(ViewMode.Regular));
        };
    }, [dispatch]);

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
                            Back
                        </Button>
                        <FormControlLabel
                            sx={{ ml: 3 }}
                            control={
                                <IosSwitch size="medium" color="primary" checked={view2d} onChange={handle2dChange} />
                            }
                            label={<Box fontSize={14}>2D</Box>}
                        />
                        <Button
                            disabled={profileRange?.min.toFixed(profileFractionDigits) === profile}
                            onClick={handleGoToStart}
                            color="grey"
                        >
                            <RestartAlt sx={{ mr: 1 }} />
                            Start over
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox p={1} pt={2} pb={4}>
                <Grid container columnSpacing={0} rowSpacing={2}>
                    <Grid item xs={6}>
                        <Typography sx={{ mb: 0.5 }}>Profile start:</Typography>
                        <OutlinedInput
                            size="small"
                            fullWidth
                            readOnly
                            color="secondary"
                            value={profileRange?.min.toFixed(profileFractionDigits) ?? ""}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography sx={{ mb: 0.5 }}>Profile end:</Typography>
                        <OutlinedInput
                            size="small"
                            fullWidth
                            readOnly
                            color="secondary"
                            value={profileRange?.max.toFixed(profileFractionDigits) ?? ""}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <Typography sx={{ mb: 0.5 }}>Height:</Typography>
                        <OutlinedInput
                            size="small"
                            fullWidth
                            readOnly
                            color="secondary"
                            value={ptHeight?.toFixed(profileFractionDigits) ?? ""}
                        />
                    </Grid>
                    <Grid item xs={6} component="form" onSubmit={handleProfileSubmit}>
                        <Typography sx={{ mb: 0.5 }}>Profile:</Typography>
                        <OutlinedInput
                            value={profile}
                            inputProps={{ inputMode: "numeric", pattern: "[0-9,.]*" }}
                            onChange={(e) => dispatch(followPathActions.setProfile(e.target.value.replace(",", ".")))}
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
                        <Typography sx={{ mb: 0.5 }}>Step size (meters):</Typography>
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

                <Box display="flex" flexDirection="column">
                    <FormControlLabel
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                checked={autoRecenter}
                                onChange={handleAutoRecenterChange}
                            />
                        }
                        label={<Box>Automatically recenter</Box>}
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
                                label={<Box>Show grid</Box>}
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
                                label={<Box>Match step size to clipping distance</Box>}
                            />

                            <Divider sx={{ my: 1 }} />

                            <Typography>Clipping: {clipping} m</Typography>
                            <Box mx={2}>
                                <Slider
                                    getAriaLabel={() => "Clipping near/far"}
                                    value={clipping}
                                    min={0.01}
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
            </ScrollBox>
        </>
    );
}
