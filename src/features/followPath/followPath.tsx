import { Box, Button, FormControlLabel } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { WidgetList } from "features/widgetList";
import { vec3, quat } from "gl-matrix";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { useCallback, useEffect } from "react";
import { selectMainObject } from "slices/renderSlice";
import FirstPageIcon from "@mui/icons-material/FirstPage";
import LastPageIcon from "@mui/icons-material/LastPage";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DoubleChevronLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import DoubleChevronRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";

export function FollowPath() {
    const [menuOpen, toggleMenu] = useToggle();

    const {
        state: { view, scene, canvas },
    } = useExplorerGlobals(true);

    const mainObject = useAppSelector(selectMainObject);
    const [currentObject, setCurrentObject] = useMountedState<number>(-1);
    const [selecting, setSelecting] = useMountedState<boolean>(false);
    const [abortController, abort] = useAbortController();
    const [controlPoints, setControlPoints] = useMountedState<vec3[]>([]);
    const [activePoint, setActivePoint] = useMountedState<number>(0);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (selecting && mainObject && mainObject !== currentObject) {
            abort();
            const url = new URL((scene as any).assetUrl);
            url.pathname += `brep/${mainObject}.json`;
            const load = async () => {
                try {
                    const resp = await fetch(url.toString());
                    const points = (await resp.json()).curves3D
                        ?.filter((c: any) => c.kind === "nurbs")
                        .map((_: any) => _.controlPoints as vec3[])
                        .flat()
                        .map((p: vec3) => vec3.fromValues(p[0], p[2], -p[1]))
                        .filter((v: vec3, i: number, arr: vec3[]) => i < 1 || vec3.dist(v, arr[i - 1]) > 1);
                    if (points) {
                        setControlPoints(points);
                        setActivePoint(0);
                        setSelecting(false);
                        setCurrentObject(mainObject!);
                    }
                } catch {}
            };
            load();
        }
    }, [
        scene,
        mainObject,
        currentObject,
        setCurrentObject,
        selecting,
        setSelecting,
        setControlPoints,
        setActivePoint,
        abort,
        abortController,
    ]);

    useEffect(() => {
        if (controlPoints.length < 2 || !canvas) {
            return;
        }
        const dir = vec3.sub(
            vec3.create(),
            controlPoints[Math.min(controlPoints.length - 1, activePoint + 1)],
            controlPoints[Math.max(0, activePoint - 1)]
        );
        vec3.normalize(dir, dir);
        if (view.camera.controller.params.kind === "ortho") {
            (view.camera.controller as any).init(controlPoints[activePoint], dir, view.camera);
        } else {
            const up = vec3.fromValues(0, 1, 0);
            const right = vec3.cross(vec3.create(), up, dir);
            vec3.normalize(right, right);
            vec3.cross(up, dir, right);
            vec3.normalize(up, up);
            const rot = quat.setAxes(quat.create(), dir, up, right);
            view.camera.controller.moveTo(controlPoints[activePoint], rot);
        }
    }, [activePoint, controlPoints, view, canvas, dispatch]);

    const select = useCallback(() => {
        setSelecting(!selecting);
    }, [selecting, setSelecting]);

    const toFirst = useCallback(() => {
        setActivePoint(0);
    }, [setActivePoint]);

    const toPrev = useCallback(() => {
        setActivePoint(activePoint - 1);
    }, [setActivePoint, activePoint]);

    const toNext = useCallback(() => {
        setActivePoint(activePoint + 1);
    }, [setActivePoint, activePoint]);

    const to10Prev = useCallback(() => {
        setActivePoint(Math.max(0, activePoint - 10));
    }, [setActivePoint, activePoint]);

    const to10Next = useCallback(() => {
        setActivePoint(Math.min(controlPoints.length - 1, activePoint + 10));
    }, [setActivePoint, activePoint, controlPoints]);

    const toLast = useCallback(() => {
        setActivePoint(controlPoints.length - 1);
    }, [setActivePoint, controlPoints]);

    return (
        <>
            <WidgetContainer>
                <WidgetHeader widget={featuresConfig.followPath}>
                    {!menuOpen ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                sx={{ marginLeft: 0 }}
                                control={<IosSwitch checked={selecting} color="primary" onChange={select} />}
                                labelPlacement="start"
                                label={<div>Select path</div>}
                            />
                            <Button
                                onClick={toFirst}
                                color="grey"
                                disabled={controlPoints.length < 1 || activePoint < 1}
                            >
                                <FirstPageIcon sx={{ mr: 1 }} />
                            </Button>
                            <Button
                                onClick={to10Prev}
                                color="grey"
                                disabled={controlPoints.length < 1 || activePoint < 1}
                            >
                                <DoubleChevronLeftIcon sx={{ mr: 1 }} />
                            </Button>
                            <Button
                                onClick={toPrev}
                                color="grey"
                                disabled={controlPoints.length < 1 || activePoint < 1}
                            >
                                <ChevronLeftIcon sx={{ mr: 1 }} />
                            </Button>
                            <Button disabled={true} sx={{ fontWeight: "bold" }}>
                                {controlPoints.length > 0 ? `${activePoint + 1}/${controlPoints.length}` : "0"}
                            </Button>
                            <Button onClick={toNext} color="grey" disabled={activePoint > controlPoints.length - 2}>
                                <ChevronRightIcon sx={{ mr: 1 }} />
                            </Button>
                            <Button onClick={to10Next} color="grey" disabled={activePoint > controlPoints.length - 2}>
                                <DoubleChevronRightIcon sx={{ mr: 1 }} />
                            </Button>
                            <Button onClick={toLast} color="grey" disabled={activePoint > controlPoints.length - 2}>
                                <LastPageIcon sx={{ mr: 1 }} />
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
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
