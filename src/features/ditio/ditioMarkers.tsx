import { SVGProps } from "react";
import { CameraAlt } from "@mui/icons-material";
import { css, styled } from "@mui/material";

import { useAppDispatch } from "app/store";

import { ditioActions } from "./slice";
import { useDitioMarkers } from "./useDitioMarkers";

const Marker = styled((props: SVGProps<SVGGElement>) => (
    <g {...props}>
        <CameraAlt color="primary" height="32px" width="32px" />
    </g>
))(
    () => css`
        cursor: pointer;
        pointer-events: bounding-box;

        svg {
            filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
        }
    `
);

export function DitioMarkers() {
    const dispatch = useAppDispatch();
    const markers = useDitioMarkers();

    return (
        <>
            {markers.map((marker, idx) => (
                <Marker
                    id={`ditioMarker-${idx}`}
                    name={`ditioMarker-${idx}`}
                    key={marker.id}
                    onClick={() => dispatch(ditioActions.setClickedMarker(marker.id))}
                    height="32px"
                    width="32px"
                />
            ))}
        </>
    );
}
