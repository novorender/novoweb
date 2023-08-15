import { css, styled, Theme } from "@mui/material";
import { SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { jiraActions, selectJiraActiveIssue, selectJiraHoveredEntity } from "./jiraSlice";
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

    path {
        stroke-width: 0;
    }
`;

// '@mui/icons-material/Announcement';
const IssueMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <circle cx="12" cy="12" r="18" />
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)<{ active?: boolean; hovered?: boolean }>(markerStyles);

export function JiraMarkers() {
    const dispatch = useAppDispatch();
    const hoveredEntity = useAppSelector(selectJiraHoveredEntity);
    const activeIssue = useAppSelector(selectJiraActiveIssue);
    const markers = useJiraMarkers();

    return (
        <>
            {markers.map((marker) => (
                <IssueMarker
                    id={`jiraIssueMarker-${marker.key}`}
                    name={`jiraIssueMarker-${marker.key}`}
                    key={marker.key}
                    hovered={hoveredEntity === marker.key}
                    active={activeIssue === marker.key}
                    onClick={() => {
                        dispatch(jiraActions.setClickedMarker(marker.key));
                        dispatch(jiraActions.setActiveIssue(marker.key));
                    }}
                />
            ))}
        </>
    );
}
