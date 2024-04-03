import { css, styled, Theme } from "@mui/material";
import { forwardRef, MouseEvent, SVGProps, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions, selectStamp, StampKind } from "features/render";
import { useRedirectWheelEvents } from "hooks/useRedirectWheelEvents";

import { useDitioChecklistMarkers } from "../hooks/useDitioChecklistMarkers";

const markerStyles = ({ theme, active }: { theme: Theme; active?: boolean }) => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));

    :hover {
        path,
        g circle {
            stroke: ${theme.palette.primary.light};
            fill: ${theme.palette.primary.light};
        }

        circle {
            stroke: ${theme.palette.secondary.light};
            fill: ${theme.palette.secondary.light};
        }
    }

    path,
    g circle {
        stroke: ${theme.palette.primary.main};
        fill: ${theme.palette.primary.main};
    }

    circle {
        stroke: ${active ? theme.palette.common.white : theme.palette.secondary.dark};
        fill: ${active ? theme.palette.common.white : theme.palette.secondary.dark};
    }
`;

const ChecklistMarker = styled(
    forwardRef<SVGGElement, SVGProps<SVGGElement>>((props, ref) => (
        <g {...props} ref={ref}>
            <circle cx="12" cy="12" r="18" />
            <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1m-2 14-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z" />
        </g>
    )),
    { shouldForwardProp: (prop) => prop !== "active" }
)<{ active?: boolean }>(markerStyles);

export const DitioChecklistMarkers = forwardRef<{ update: () => void }>(function DitioChecklistMarkers(_, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const stamp = useAppSelector(selectStamp);
    const dispatch = useAppDispatch();

    const markers = useDitioChecklistMarkers();
    const onWheel = useRedirectWheelEvents();

    const containerRef = useRef<(SVGGElement | null)[]>([]);

    const update = useCallback(() => {
        if (!view?.measure || !containerRef.current.length || !markers.length) {
            return;
        }

        view.measure.draw.toMarkerPoints(markers.map((marker) => marker.position)).forEach((pos, idx) => {
            containerRef.current[idx]?.setAttribute(
                "transform",
                pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
            );
        });
    }, [markers, view]);

    useImperativeHandle(ref, () => ({ update }), [update]);

    useEffect(() => {
        update();
    }, [update]);

    return (
        <>
            {markers.map((marker, i) => (
                <ChecklistMarker
                    key={marker.id}
                    active={stamp?.kind === StampKind.DitioChecklist && stamp.data.checklist.id === marker.id}
                    height={32}
                    width={32}
                    onClick={(e: MouseEvent) => {
                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.DitioChecklist,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: true,
                                data: { checklist: marker },
                            })
                        );
                    }}
                    onMouseEnter={(e: MouseEvent) => {
                        if (stamp?.pinned) {
                            return;
                        }

                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.DitioChecklist,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: false,
                                data: { checklist: marker },
                            })
                        );
                    }}
                    onWheel={onWheel}
                    ref={(el) => (containerRef.current[i] = el)}
                />
            ))}
        </>
    );
});
