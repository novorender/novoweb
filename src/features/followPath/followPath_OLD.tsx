// @ts-nocheck

import { FormEvent, SyntheticEvent, useEffect, useState } from "react";
import {
    Box,
    Button,
    FormControlLabel,
    Grid,
    InputAdornment,
    List,
    ListItemButton,
    OutlinedInput,
    Slider,
    Typography,
} from "@mui/material";
import { ArrowBack, ArrowForward, Edit, LinearScale, RestartAlt } from "@mui/icons-material";
import { FlightControllerParams, OrthoControllerParams, Scene } from "@novorender/webgl-api";
import { vec3, quat, mat3, mat4 } from "gl-matrix";

import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import {
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
    LinearProgress,
    IosSwitch,
    Divider,
} from "components";

import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions, selectGridDefaults } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { searchByPatterns } from "utils/search";
import { getObjectNameFromPath, getParentPath } from "utils/objectData";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import {
    Brep,
    Nurbs,
    followPathActions,
    LandXmlPath,
    selectLandXmlPaths,
    selectCurrentPath,
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
} from "./followPathSlice";

enum Status {
    Initial,
    Loading,
}

const profileFractionDigits = 3;

export function FollowPath() {
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);

    const gridDefaults = useAppSelector(selectGridDefaults);
    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const currentPath = useAppSelector(selectCurrentPath);
    const currentCenter = useAppSelector(selectCurrentCenter);
    const view2d = useAppSelector(selectView2d);
    const showGrid = useAppSelector(selectShowGrid);
    const autoRecenter = useAppSelector(selectAutoRecenter);
    const autoStepSize = useAppSelector(selectAutoStepSize);
    const profile = useAppSelector(selectProfile);
    const step = useAppSelector(selectStep);
    const ptHeight = useAppSelector(selectPtHeight);
    const profileRange = useAppSelector(selectProfileRange);
    const _clipping = useAppSelector(selectClipping);

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.followPath.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.followPath.key;
    const [status, setStatus] = useMountedState(Status.Initial);
    const [clipping, setClipping] = useState(_clipping);

    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    useEffect(() => {
        if (!landXmlPaths) {
            dispatch(followPathActions.setPaths([]));
            getLandXmlPaths();
        }

        async function getLandXmlPaths() {
            let paths = [] as LandXmlPath[];

            setStatus(Status.Loading);
            await searchByPatterns({
                scene,
                searchPatterns: [{ property: "Novorender/Path", value: "true", exact: true }],
                callback: (refs) =>
                    (paths = paths.concat(
                        refs.map(({ path, id }) => ({ id, name: getObjectNameFromPath(getParentPath(path)) }))
                    )),
            });

            dispatch(followPathActions.setPaths(paths));
            setStatus(Status.Initial);
        }
    }, [scene, landXmlPaths, dispatch, setStatus]);

    const handlePathClick = async (path: LandXmlPath) => {
        dispatch(renderActions.setMainObject(path.id));
        dispatchHighlighted(highlightActions.setIds([path.id]));

        if (currentPath?.id === path.id) {
            return;
        }

        setStatus(Status.Loading);
        const nurbs = await getNurbs({ scene, objectId: path.id }).catch((e) => console.warn(e));
        setStatus(Status.Initial);

        if (!nurbs) {
            return;
        }

        const start = nurbs.knots[0];

        dispatch(followPathActions.setProfile(start.toFixed(profileFractionDigits)));
        dispatch(followPathActions.setProfileRange({ min: nurbs.knots[0], max: nurbs.knots.slice(-1)[0] }));
        goToProfile({ nurbs, view2d, showGrid, p: start });
        dispatch(
            followPathActions.setCurrentPath({
                ...path,
                nurbs,
            })
        );
    };

    const goToProfile = ({
        nurbs,
        p,
        view2d,
        showGrid,
        keepOffset,
    }: {
        nurbs: Nurbs;
        p: number;
        view2d: boolean;
        showGrid: boolean;
        keepOffset?: boolean;
    }): void => {
        if (p < nurbs.knots[0] || p > nurbs.knots.slice(-1)[0]) {
            return;
        }

        let knot2Idx = nurbs.knots.findIndex((knot) => knot >= p);

        if (knot2Idx === -1) {
            dispatch(followPathActions.setPtHeight(0));
            return;
        }

        knot2Idx = Math.max(1, knot2Idx);
        const knot1Idx = knot2Idx - 1;

        const knot1 = nurbs.knots[knot1Idx];
        const knot2 = nurbs.knots[knot2Idx];

        const cp1 = vec3.fromValues(...nurbs.controlPoints[knot1Idx]);
        const cp2 = vec3.fromValues(...nurbs.controlPoints[knot2Idx]);

        const dir = vec3.sub(vec3.create(), cp1, cp2);
        vec3.normalize(dir, dir);

        const l = knot2 - knot1;
        const t = (p - knot1) / l;

        const pt = vec3.lerp(vec3.create(), cp1, cp2, t);
        const offset =
            keepOffset && currentCenter
                ? vec3.sub(vec3.create(), currentCenter, view.camera.position)
                : vec3.fromValues(0, 0, 0);
        const offsetPt = vec3.sub(vec3.create(), pt, offset);
        const dist = vec3.dot(vec3.sub(vec3.create(), offsetPt, pt), dir);
        vec3.scaleAndAdd(offsetPt, offsetPt, dir, -dist);

        const up = vec3.fromValues(0, 1, 0);
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
                renderActions.setGrid({
                    ...gridDefaults,
                    enabled: showGrid,
                    origo: pt,
                    axisY: vec3.scale(vec3.create(), up, 5),
                    axisX: vec3.scale(vec3.create(), right, 5),
                })
            );

            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    params: {
                        kind: "ortho",
                        referenceCoordSys: mat,
                        fieldOfView: view.camera.fieldOfView,
                        near: -0.001,
                        far: clipping,
                    },
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
    };

    const handle2dChange = () => {
        if (!currentPath) {
            return;
        }

        const newState = !view2d;

        dispatch(followPathActions.setView2d(newState));
        goToProfile({ nurbs: currentPath.nurbs, p: Number(profile), view2d: newState, showGrid });
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
        if (!currentPath) {
            return;
        }

        const recenter = !autoRecenter;

        if (recenter) {
            goToProfile({ nurbs: currentPath.nurbs, p: Number(profile), view2d, showGrid, keepOffset: false });
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
        if (!currentPath || !profileRange) {
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
        goToProfile({ nurbs: currentPath.nurbs, p: next, view2d, showGrid, keepOffset: !autoRecenter });
    };

    const handleNext = () => {
        if (!currentPath || !profileRange) {
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
        goToProfile({ nurbs: currentPath.nurbs, p: next, view2d, showGrid, keepOffset: !autoRecenter });
    };

    const handleGoToStart = () => {
        if (!currentPath || !profileRange) {
            return;
        }

        const p = profileRange.min.toFixed(profileFractionDigits);

        dispatch(followPathActions.setProfile(p));
        goToProfile({ nurbs: currentPath.nurbs, p: Number(p), view2d, showGrid });
    };

    const handleProfileSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!currentPath) {
            return;
        }

        goToProfile({
            nurbs: currentPath.nurbs,
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

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.followPath}>
                    {!menuOpen && !minimized ? (
                        <>
                            {currentPath ? (
                                <Box display="flex" justifyContent="space-between">
                                    <Button
                                        onClick={() => {
                                            dispatch(followPathActions.setCurrentPath(undefined));
                                        }}
                                        color="grey"
                                    >
                                        <ArrowBack sx={{ mr: 1 }} />
                                        Back
                                    </Button>
                                    <FormControlLabel
                                        sx={{ ml: 3 }}
                                        control={
                                            <IosSwitch
                                                size="medium"
                                                color="primary"
                                                checked={view2d}
                                                onChange={handle2dChange}
                                            />
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
                            ) : null}
                        </>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    {status === Status.Loading ? <LinearProgress /> : null}
                    {!currentPath ? (
                        <List>
                            {landXmlPaths?.map((path) => (
                                <ListItemButton
                                    key={path.id}
                                    onClick={() => handlePathClick(path)}
                                    disableGutters
                                    color="primary"
                                    sx={{ px: 1, py: 0.5 }}
                                >
                                    <LinearScale sx={{ mr: 1 }} />
                                    {path.name}
                                </ListItemButton>
                            ))}
                        </List>
                    ) : (
                        <Box p={1} pt={2}>
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
                        </Box>
                    )}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.followPath.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.followPath.key}-widget-menu-fab`}
            />
        </>
    );
}

export function getNurbs({ scene, objectId }: { scene: Scene; objectId: number }): Promise<Nurbs> {
    const url = new URL((scene as any).assetUrl);
    url.pathname += `brep/${objectId}.json`;

    return fetch(url.toString())
        .then((r) => r.json())
        .then(
            (brep: Brep) =>
                ({
                    kind: "nurbs",
                    order: 0,
                    knots: [
                        ...brep.geometries[0].compoundCurve.map((cCurve) =>
                            brep.curves3D[brep.curveSegments[cCurve].curve3D].knots.slice(1)
                        ),
                    ].flat(),
                    controlPoints: [
                        ...brep.geometries[0].compoundCurve.map((cCurve) =>
                            brep.curves3D[brep.curveSegments[cCurve].curve3D].controlPoints.map((cp) => [
                                cp[0],
                                cp[2],
                                -cp[1],
                            ])
                        ),
                    ].flat(),
                } as Nurbs)
        );
}
