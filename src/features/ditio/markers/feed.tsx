import { css, styled, Theme } from "@mui/material";
import { forwardRef, SVGProps, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useRedirectWheelEvents } from "hooks/useRedirectWheelEvents";

import { useDitioFeedMarkers } from "../hooks/useDitioFeedMarkers";
import { ditioActions, selectActiveImg, selectActivePost, selectHoveredEntity } from "../slice";

const markerStyles = ({ theme, active, hovered }: { theme: Theme; active?: boolean; hovered?: boolean }) => css`
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
    circle {
        transform: scale(${hovered ? 1.2 : 1});
        transition: scale 0.15 ease-in-out;
    }

    path,
    g circle {
        stroke: ${hovered ? theme.palette.primary.light : theme.palette.primary.main};
        fill: ${hovered ? theme.palette.primary.light : theme.palette.primary.main};
    }

    circle {
        stroke: ${active
            ? theme.palette.common.white
            : hovered
            ? theme.palette.secondary.light
            : theme.palette.secondary.dark};
        fill: ${active
            ? theme.palette.common.white
            : hovered
            ? theme.palette.secondary.light
            : theme.palette.secondary.dark};
    }
`;

const PostMarker = styled(
    forwardRef<SVGGElement, SVGProps<SVGGElement>>((props, ref) => (
        <g {...props} ref={ref}>
            <circle cx="12" cy="12" r="18" />
            <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4 2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" />
        </g>
    )),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)<{ active?: boolean; hovered?: boolean }>(markerStyles);

const ImgMarker = styled(
    forwardRef<SVGGElement, SVGProps<SVGGElement>>((props, ref) => (
        <g {...props} ref={ref}>
            <circle cx="12" cy="12" r="18" />
            <g>
                <circle cx="12" cy="12" r="3.2" />
                <path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
            </g>
        </g>
    )),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)<{ active?: boolean; hovered?: boolean }>(markerStyles);

export const DitioFeedMarkers = forwardRef<{ update: () => void }>(function DitioFeedMarkers(_, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const hoveredEntity = useAppSelector(selectHoveredEntity);
    const activePost = useAppSelector(selectActivePost);
    const activeImg = useAppSelector(selectActiveImg);

    const [postMarkers, imgMarkers] = useDitioFeedMarkers();
    const onWheel = useRedirectWheelEvents();

    const postMarkersRef = useRef<(SVGGElement | null)[]>([]);
    const imgMarkersRef = useRef<(SVGGElement | null)[]>([]);

    const updatePosts = useCallback(() => {
        if (!view?.measure || !postMarkersRef.current.length || !postMarkers.length) {
            return;
        }

        view.measure.draw.toMarkerPoints(postMarkers.map((marker) => marker.position)).forEach((pos, idx) => {
            postMarkersRef.current[idx]?.setAttribute(
                "transform",
                pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
            );
        });
    }, [postMarkers, view]);

    const updateImages = useCallback(() => {
        if (!view?.measure || !imgMarkersRef.current.length || !imgMarkers.length) {
            return;
        }

        view.measure.draw.toMarkerPoints(imgMarkers.map((marker) => marker.position)).forEach((pos, idx) => {
            imgMarkersRef.current[idx]?.setAttribute(
                "transform",
                pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)"
            );
        });
    }, [imgMarkers, view]);

    const update = useCallback(() => {
        updatePosts();
        updateImages();
    }, [updatePosts, updateImages]);

    useImperativeHandle(ref, () => ({ update }), [update]);

    useEffect(() => {
        update();
    }, [update]);

    return (
        <>
            {postMarkers.map((marker, i) => (
                <PostMarker
                    key={marker.id}
                    hovered={hoveredEntity?.id === marker.id}
                    active={activePost === marker.id}
                    onClick={() => {
                        dispatch(ditioActions.setClickedMarker(marker.id));
                        dispatch(ditioActions.setActivePost(marker.id));
                    }}
                    onWheel={onWheel}
                    ref={(el) => (postMarkersRef.current[i] = el)}
                />
            ))}

            {imgMarkers.map((marker, i) => (
                <ImgMarker
                    key={marker.id}
                    active={activeImg === marker.src}
                    hovered={hoveredEntity?.id === marker.id}
                    onClick={() => {
                        dispatch(ditioActions.setActiveImg(marker.src));
                    }}
                    onWheel={onWheel}
                    ref={(el) => (imgMarkersRef.current[i] = el)}
                />
            ))}
        </>
    );
});
