import { ArrowBack, ArrowForward, Edit, RestartAlt } from "@mui/icons-material";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    Grid,
    InputAdornment,
    ListItemButton,
    OutlinedInput,
    Slider,
    Typography,
    useTheme,
} from "@mui/material";
import { FollowParametricObject } from "@novorender/measure-api";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { vec3 } from "gl-matrix";
import { FormEvent, SyntheticEvent, useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { rotationFromDirection } from "@novorender/api";

import { useAppDispatch, useAppSelector } from "app/store";
import { Accordion, AccordionDetails, AccordionSummary, Divider, IosSwitch, ScrollBox, Tooltip } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, renderActions } from "features/render/renderSlice";
import { AsyncStatus, ViewMode } from "types/misc";
import { searchByPatterns } from "utils/search";

import {
    followPathActions,
    selectAutoRecenter,
    selectAutoStepSize,
    selectClipping,
    selectCurrentCenter,
    selectDrawRoadIds,
    selectLandXmlPaths,
    selectProfile,
    selectProfileRange,
    selectPtHeight,
    selectResetPositionOnInit,
    selectRoadIds,
    selectSelectedPath,
    selectShowGrid,
    selectShowTracer,
    selectStep,
    selectView2d,
} from "./followPathSlice";

const profileFractionDigits = 3;

export function Follow({ fpObj }: { fpObj: FollowParametricObject }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { view, db },
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
    const roadIds = useAppSelector(selectRoadIds);
    const drawRoadIds = useAppSelector(selectDrawRoadIds);
    const showTracer = useAppSelector(selectShowTracer);

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

            const { position: pt, normal: dir } = pos;

            const offset =
                keepOffset && currentCenter
                    ? vec3.sub(vec3.create(), currentCenter, view.renderState.camera.position)
                    : vec3.fromValues(0, 0, 0);
            const offsetPt = vec3.sub(vec3.create(), pt, offset);
            const rotation = rotationFromDirection(dir);

            if (view2d) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            rotation,
                            position: offsetPt,
                            fov: view.renderState.camera.fov,
                            far: clipping,
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
                        type: CameraType.Pinhole,
                        goTo: {
                            position: offsetPt,
                            rotation: keepOffset ? ([...view.renderState.camera.rotation] as Vec4) : rotation,
                        },
                    })
                );
            }

            const w = vec3.dot(dir, pt);
            dispatch(
                renderActions.setClippingPlanes({
                    enabled: true,
                    planes: [{ normalOffset: [dir[0], dir[1], dir[2], w], baseW: w, color: [0, 1, 0, 0.2] }],
                })
            );
            dispatch(followPathActions.setCurrentCenter(pt as Vec3));
            dispatch(followPathActions.setPtHeight(pt[2]));
        },
        [clipping, currentCenter, dispatch, fpObj, view]
    );

    useEffect(() => {
        dispatch(
            followPathActions.setProfileRange({ min: fpObj.parameterBounds.start, max: fpObj.parameterBounds.end })
        );
    }, [fpObj, dispatch]);

    useEffect(() => {
        loadCrossSection();

        async function loadCrossSection() {
            if (selectedPath !== undefined && paths.status === AsyncStatus.Success && !roadIds) {
                const path = paths.data.find((p) => p.id === selectedPath);

                if (!path) {
                    return;
                }

                const pathName = path.name;
                let roadIds: string[] = [];
                let references = [] as HierarcicalObjectReference[];
                await searchByPatterns({
                    db,
                    searchPatterns: [{ property: "Centerline", value: pathName, exact: true }],
                    callback: (refs) => (references = references.concat(refs)),
                });
                await Promise.all(
                    references.map(async (r) => {
                        const data = await r.loadMetaData();
                        const prop = data.properties.find((p) => p[0] === "Novorender/road");
                        if (prop) {
                            try {
                                const ids = JSON.parse(prop[1]) as string[];
                                ids.forEach((roadId) => roadIds.push(roadId));
                            } catch (e) {
                                console.warn(e);
                                roadIds.push(prop[1]);
                            }
                        }
                    })
                );

                dispatch(followPathActions.setRoadIds(roadIds));
                if (!drawRoadIds) {
                    dispatch(followPathActions.setDrawRoadIds(roadIds));
                }
            }
        }
    }, [dispatch, paths, db, selectedPath, drawRoadIds, roadIds]);

    useEffect(() => {
        if (!resetPosition || !fpObj) {
            return;
        }

        dispatch(followPathActions.toggleResetPositionOnInit(false));
        dispatch(followPathActions.setProfile(fpObj.parameterBounds.start.toFixed(3)));
        goToProfile({ view2d, showGrid, keepOffset: false, p: fpObj.parameterBounds.start });
    }, [view2d, showGrid, profile, goToProfile, autoRecenter, resetPosition, dispatch, fpObj, paths, selectedPath]);

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
        dispatch(renderActions.setViewMode(ViewMode.FollowPath));

        return () => {
            dispatch(renderActions.setViewMode(ViewMode.Default));
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
            <ScrollBox pt={2} pb={4}>
                <Box px={1}>
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
                                onChange={(e) =>
                                    dispatch(followPathActions.setProfile(e.target.value.replace(",", ".")))
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

                    <Box display="flex" flexDirection="column" mb={2}>
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
                {roadIds && roadIds.length >= 1 && (
                    <Accordion>
                        <AccordionSummary>Road layers</AccordionSummary>
                        <AccordionDetails>
                            <Box px={1}>
                                <Divider sx={{ borderColor: theme.palette.grey[300] }} />
                                <FormControlLabel
                                    control={
                                        <IosSwitch
                                            size="medium"
                                            color="primary"
                                            checked={showTracer}
                                            onChange={() => {
                                                dispatch(followPathActions.toggleShowTracer());
                                            }}
                                        />
                                    }
                                    label={<Box>Enable tracer (2D)</Box>}
                                />
                                <Divider sx={{ borderColor: theme.palette.grey[300] }} />
                            </Box>
                            {roadIds.map((road) => (
                                <ListItemButton
                                    key={road}
                                    disableGutters
                                    sx={{
                                        px: 1,
                                    }}
                                    onClick={() => {
                                        if (drawRoadIds?.includes(road)) {
                                            dispatch(followPathActions.removeDrawRoad(road));
                                        } else {
                                            dispatch(followPathActions.addDrawRoad(road));
                                        }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            width: 0,
                                            flex: "1 1 100%",
                                        }}
                                    >
                                        <Tooltip title={road}>
                                            <Typography noWrap>{road}</Typography>
                                        </Tooltip>
                                    </Box>
                                    <Checkbox
                                        aria-label={"Select property"}
                                        size="small"
                                        sx={{ py: 0 }}
                                        checked={drawRoadIds?.includes(road)}
                                        onChange={(_e, checked) => {
                                            if (checked) {
                                                dispatch(followPathActions.addDrawRoad(road));
                                            } else {
                                                dispatch(followPathActions.removeDrawRoad(road));
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </ListItemButton>
                            ))}
                        </AccordionDetails>
                    </Accordion>
                )}
            </ScrollBox>
        </>
    );
}
