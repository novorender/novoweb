import { Box, css, styled } from "@mui/material";
import { vec3 } from "gl-matrix";
import { forwardRef, SVGProps, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectStamp, StampKind } from "features/render";
import { useRedirectWheelEvents } from "hooks/useRedirectWheelEvents";

import { useXsiteManageLogPointMarkers } from "../hooks/useXsiteManageLogPointMarkers";

const LogPointMarker = styled(
    (props: SVGProps<SVGSVGElement>) => (
        <svg viewBox="0 0 24 24" {...props}>
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" strokeWidth="0.4"></path>
        </svg>
    ),
    { shouldForwardProp: (prop) => prop !== "active" }
)<{ active?: boolean }>(
    ({ theme, active }) => css`
        path {
            stroke: ${theme.palette.secondary.dark};
            fill: ${active ? theme.palette.primary.light : theme.palette.common.white};
        }

        :hover {
            path {
                fill: ${theme.palette.primary.light};
            }
        }
    `
);

export const LogPointMarkers = forwardRef<{ update: () => void }>(function LogPointMarkers(_, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const stamp = useAppSelector(selectStamp);
    const dispatch = useAppDispatch();

    const logPoints = useXsiteManageLogPointMarkers();
    const onWheel = useRedirectWheelEvents();
    const containerRef = useRef<(SVGGElement | null)[]>([]);

    const update = useCallback(() => {
        if (!view?.measure || !containerRef.current.length || !logPoints.length) {
            return;
        }

        view.measure.draw
            .toMarkerPoints(logPoints.map((lpt) => vec3.fromValues(lpt.x, lpt.y, lpt.z)))
            .forEach((pos, idx) => {
                containerRef.current[idx]?.setAttribute(
                    "transform",
                    pos ? `translate(${pos[0] - 25} ${pos[1] - 20})` : "translate(-100 -100)"
                );
            });
    }, [logPoints, view]);

    useImperativeHandle(ref, () => ({ update }), [update]);

    useEffect(() => {
        update();
    }, [update]);

    return (
        <>
            {logPoints.map((pt, idx) => (
                <Box
                    key={idx}
                    component="g"
                    sx={{ cursor: "pointer", pointerEvents: "bounding-box" }}
                    onClick={(e) => {
                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.LogPoint,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: true,
                                data: { logPoint: pt },
                            })
                        );
                    }}
                    onMouseEnter={(e) => {
                        if (stamp?.pinned) {
                            return;
                        }

                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.LogPoint,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: false,
                                data: { logPoint: pt },
                            })
                        );
                    }}
                    onMouseLeave={() => {
                        if (stamp?.pinned) {
                            return;
                        }

                        dispatch(renderActions.setStamp(null));
                    }}
                    onWheel={onWheel}
                    ref={(el) => (containerRef.current[idx] = el as SVGGElement | null)}
                >
                    <LogPointMarker
                        active={stamp?.kind === StampKind.LogPoint && stamp.data.logPoint.sequenceId === pt.sequenceId}
                        height="50px"
                        width="50px"
                    />
                </Box>
            ))}
        </>
    );
});
