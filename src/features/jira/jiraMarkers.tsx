import { css, styled, Theme } from "@mui/material";
import { SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useJiraMarkers } from "./useJiraMarkers";

// TODO(OLA): Share marker styles
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

const IssueMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <circle cx="12" cy="12" r="18" />
            <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4 2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z" />
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)<{ active?: boolean; hovered?: boolean }>(markerStyles);

export function JiraMarkers() {
    const dispatch = useAppDispatch();
    // const [postMarkers, imgMarkers] = useDitioMarkers();
    // const hoveredEntity = useAppSelector(selectHoveredEntity);
    // const activePost = useAppSelector(selectActivePost);
    // const activeImg = useAppSelector(selectActiveImg);
    const markers = useJiraMarkers();

    return (
        <>
            {markers.map((marker) => (
                <IssueMarker
                    id={`jiraIssueMarker-${marker.key}`}
                    name={`jiraIssueMarker-${marker.key}`}
                    key={marker.key}
                    // hovered={hoveredEntity?.id === marker.id}
                    // active={activePost === marker.id}
                    // onClick={() => {
                    //     dispatch(ditioActions.setClickedMarker(marker.id));
                    //     dispatch(ditioActions.setActivePost(marker.id));
                    // }}
                />
            ))}
        </>
    );
}
