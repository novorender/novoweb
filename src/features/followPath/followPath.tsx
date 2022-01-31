import { FormEvent, useEffect } from "react";
import { Box, Button, FormControlLabel, List, ListItemButton, Typography } from "@mui/material";
import { ArrowBack, ArrowForward, LinearScale } from "@mui/icons-material";
import { Scene } from "@novorender/webgl-api";
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
    TextField,
} from "components";

import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { searchByPatterns } from "utils/search";
import { getObjectNameFromPath } from "utils/objectData";

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
} from "./followPathSlice";

enum Status {
    Initial,
    Loading,
}

export function FollowPath() {
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);

    const landXmlPaths = useAppSelector(selectLandXmlPaths);
    const currentPath = useAppSelector(selectCurrentPath);
    const view2d = useAppSelector(selectView2d);
    const profile = useAppSelector(selectProfile);
    const step = useAppSelector(selectStep);
    const ptHeight = useAppSelector(selectPtHeight);
    const profileRange = useAppSelector(selectProfileRange);

    const [menuOpen, toggleMenu] = useToggle();
    const [status, setStatus] = useMountedState(Status.Initial);

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
                    (paths = paths.concat(refs.map(({ path, id }) => ({ id, name: getObjectNameFromPath(path) })))),
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

        // TODO(OLA)
        // if (currentPath?.id === path.id) {
        //     const start = currentPath.nurbs.knots[0];
        //     dispatch(followPathActions.setProfile(start.toFixed(3)));
        //     goToProfile(currentPath.nurbs, start, view2d);
        //     return;
        // }

        setStatus(Status.Loading);
        const nurbs = await getNurbs({ scene, objectId: path.id });
        setStatus(Status.Initial);

        const start = nurbs.knots[0];

        dispatch(followPathActions.setProfile(start.toFixed(3)));
        dispatch(followPathActions.setProfileRange({ min: nurbs.knots[0], max: nurbs.knots.slice(-1)[0] }));
        goToProfile(nurbs, start, view2d);
        dispatch(
            followPathActions.setCurrentPath({
                ...path,
                nurbs,
            })
        );
    };

    const goToProfile = (nurbs: Nurbs, p: number, view2d: boolean = false): void => {
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
        const dir = vec3.sub(vec3.create(), cp2, cp1);
        vec3.normalize(dir, dir);

        const l = knot2 - knot1;
        const t = (p - knot1) / l;

        const pt = vec3.lerp(vec3.create(), cp1, cp2, t);

        // TODO(OLA)
        // console.log({ brep: nurbs, p, knot1Idx, knot2Idx, cp1, cp2, knot1, knot2, l, t, pt });

        const up = vec3.fromValues(0, 1, 0);
        vec3.transformQuat(up, up, view.camera.rotation);

        const right = vec3.cross(vec3.create(), up, dir);

        vec3.cross(up, dir, right);
        vec3.normalize(up, up);

        vec3.cross(right, up, dir);
        vec3.normalize(right, right);

        if (view2d) {
            const mat = mat4.fromRotationTranslation(
                mat4.create(),
                quat.fromMat3(
                    quat.create(),
                    mat3.fromValues(right[0], right[1], right[2], up[0], up[1], up[2], dir[0], dir[1], dir[2])
                ),
                pt
            );

            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    params: { kind: "ortho", referenceCoordSys: mat, fieldOfView: view.camera.fieldOfView },
                })
            );
        } else {
            const rotation = quat.setAxes(quat.create(), dir, up, right);
            dispatch(renderActions.setCamera({ type: CameraType.Flight, goTo: { position: pt, rotation } }));
        }

        dispatch(followPathActions.setPtHeight(pt[1]));
    };

    const handle2dChange = () => {
        if (!currentPath) {
            return;
        }

        const newState = !view2d;

        dispatch(followPathActions.setView2d(newState));
        goToProfile(currentPath.nurbs, Number(profile), newState);
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

        dispatch(followPathActions.setProfile(next.toFixed(3)));
        goToProfile(currentPath.nurbs, next, view2d);
    };

    const handleNext = () => {
        if (!currentPath || !profileRange) {
            return;
        }

        if (!step) {
            dispatch(followPathActions.setStep("1"));
        }

        let next = Number(profile) + Number(step || "1");

        if (next > profileRange.max) {
            next = profileRange.max;
        } else if (next < profileRange.min) {
            next = profileRange.min;
        }

        dispatch(followPathActions.setProfile(next.toFixed(3)));
        goToProfile(currentPath.nurbs, next, view2d);
    };

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.followPath}>
                    {!menuOpen ? (
                        <>
                            {currentPath ? (
                                <>
                                    <FormControlLabel
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
                                    <Box my={2} display="flex" alignItems="center">
                                        <Button
                                            disabled={profileRange?.min.toFixed(3) === profile}
                                            color="grey"
                                            onClick={handlePrev}
                                        >
                                            <ArrowBack />
                                        </Button>
                                        <TextField
                                            id="follow-path-distance"
                                            sx={{ mb: 2, pt: 1, width: 100 }}
                                            label="Meters"
                                            value={step}
                                            InputProps={{ size: "small" }}
                                            onChange={(e) => dispatch(followPathActions.setStep(e.target.value))}
                                        />
                                        <Button
                                            disabled={profileRange?.max.toFixed(3) === profile}
                                            color="grey"
                                            onClick={handleNext}
                                        >
                                            <ArrowForward />
                                        </Button>
                                    </Box>

                                    {profileRange ? (
                                        <Box my={2}>
                                            <Typography sx={{ mr: 2 }}>Start: {profileRange.min.toFixed(3)}</Typography>
                                            <Typography sx={{ mr: 2 }}>End: {profileRange.max.toFixed(3)}</Typography>
                                        </Box>
                                    ) : null}
                                    <Box
                                        component={"form"}
                                        onSubmit={(e: FormEvent) => {
                                            e.preventDefault();

                                            if (!currentPath) {
                                                return;
                                            }

                                            goToProfile(currentPath.nurbs, Number(profile), view2d);
                                        }}
                                    >
                                        <TextField
                                            id="follow-path-distance"
                                            label={"Profile"}
                                            sx={{ mb: 2, pt: 1 }}
                                            value={profile}
                                            onChange={(e) => dispatch(followPathActions.setProfile(e.target.value))}
                                        />
                                    </Box>

                                    {ptHeight ? <Typography>H = {ptHeight.toFixed(3)}</Typography> : null}
                                </>
                            ) : null}
                        </>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen ? "none" : "block"}>
                    {status === Status.Loading ? <LinearProgress /> : null}
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

function getNurbs({ scene, objectId }: { scene: Scene; objectId: number }): Promise<Nurbs> {
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
                        ...brep.geometries[0].compoundCurve.map((cCurve, idx) =>
                            brep.curves3D[brep.curveSegments[cCurve].curve3D].controlPoints
                                .slice(idx === 0 ? 1 : 0) // TODO(OLA): Fjern slice når siggen har fiksa
                                .map((cp) => [cp[0], cp[2], -cp[1]])
                        ),
                    ].flat(),
                } as Nurbs)
        );
}
