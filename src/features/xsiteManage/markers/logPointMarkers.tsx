import { Box, css, styled } from "@mui/material";
import { SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
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

export function LogPointMarkers() {
    const stamp = useAppSelector(selectStamp);
    const logPoints = useXsiteManageLogPointMarkers();
    const dispatch = useAppDispatch();
    const onWheel = useRedirectWheelEvents();

    return (
        <>
            {logPoints.map((pt, idx) => (
                <Box
                    id={`logPoint-${idx}`}
                    name={`logPoint-${idx}`}
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
}
