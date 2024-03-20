import { css, styled, Theme } from "@mui/material";
import { MouseEvent, SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { renderActions, selectStamp, StampKind } from "features/render";
import { useRedirectWheelEvents } from "hooks/useRedirectWheelEvents";
import { msToMins } from "utils/time";

import { useDitioMachineMarkers } from "../hooks/useDitioMachineMarkers";

const markerStyles = ({
    theme,
    current,
    inactive,
    hovered,
    hasLoad,
}: {
    theme: Theme;
    current?: boolean;
    inactive?: boolean;
    hovered?: boolean;
    hasLoad?: boolean;
}) => css`
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
        stroke: ${current
            ? theme.palette.primary.main
            : hovered
            ? theme.palette.primary.light
            : inactive
            ? theme.palette.grey[300]
            : hasLoad
            ? theme.palette.primary.main
            : theme.palette.common.white};
        fill: ${current
            ? theme.palette.primary.main
            : hovered
            ? theme.palette.primary.light
            : inactive
            ? theme.palette.grey[300]
            : hasLoad
            ? theme.palette.primary.main
            : theme.palette.common.white};
    }

    circle {
        stroke: ${current
            ? theme.palette.common.white
            : hovered
            ? theme.palette.secondary.light
            : inactive
            ? theme.palette.grey[500]
            : theme.palette.secondary.dark};
        fill: ${current
            ? theme.palette.common.white
            : hovered
            ? theme.palette.secondary.light
            : inactive
            ? theme.palette.grey[500]
            : theme.palette.secondary.dark};
    }
`;

const LoaderMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <circle cx="12" cy="12" r="18" />
            <path d="M18.5 18.5C19.04 18.5 19.5 18.96 19.5 19.5S19.04 20.5 18.5 20.5H6.5C5.96 20.5 5.5 20.04 5.5 19.5S5.96 18.5 6.5 18.5H18.5M18.5 17H6.5C5.13 17 4 18.13 4 19.5S5.13 22 6.5 22H18.5C19.88 22 21 20.88 21 19.5S19.88 17 18.5 17M21 11H18V7H13L10 11V16H22L21 11M11.54 11L13.5 8.5H16V11H11.54M9.76 3.41L4.76 2L2 11.83C1.66 13.11 2.41 14.44 3.7 14.8L4.86 15.12L8.15 12.29L4.27 11.21L6.15 4.46L8.94 5.24C9.5 5.53 10.71 6.34 11.47 7.37L12.5 6H12.94C11.68 4.41 9.85 3.46 9.76 3.41Z" />
        </g>
    ),
    { shouldForwardProp: (prop) => !["current", "hovered", "inactive", "hasLoad"].includes(String(prop)) }
)<{ current?: boolean; hovered?: boolean; inactive?: boolean }>(markerStyles);

const DumperMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <circle cx="12" cy="12" r="18" />
            <path d="M20,8H19L17,8H15V14H2V17H3A3,3 0 0,0 6,20A3,3 0 0,0 9,17H15A3,3 0 0,0 18,20A3,3 0 0,0 21,17H23V12L20,8M6,18.5A1.5,1.5 0 0,1 4.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,17A1.5,1.5 0 0,1 6,18.5M18,18.5A1.5,1.5 0 0,1 16.5,17A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 19.5,17A1.5,1.5 0 0,1 18,18.5M17,12V9.5H19.5L21.46,12H17M18,7H14V13H3L1.57,8H1V6H13L14,5H18V7Z" />
        </g>
    ),
    { shouldForwardProp: (prop) => !["current", "hovered", "inactive", "hasLoad"].includes(String(prop)) }
)<{ current?: boolean; hovered?: boolean; inactive?: boolean; hasLoad?: boolean }>(markerStyles);

export function DitioMachineMarkers() {
    const stamp = useAppSelector(selectStamp);
    const dispatch = useAppDispatch();
    const machineMarkers = useDitioMachineMarkers();
    const onWheel = useRedirectWheelEvents();

    const now = Date.now();
    return (
        <>
            {machineMarkers.map((marker) => {
                const props = {
                    id: `ditioMachineMarker-${marker.id}`,
                    name: `ditioMachineMarker-${marker.id}`,
                    key: marker.id,
                    current: stamp?.kind === StampKind.DitioMachine && stamp.data.machine.id === marker.id,
                    inactive: msToMins(now - new Date(marker.lastSeen).getTime()) >= 15,
                    hasLoad: marker.kind === "dumper" && marker.dumperHasLoad,
                    height: "32px",
                    width: "32px",
                    onWheel,
                    onClick: (e: MouseEvent) => {
                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.DitioMachine,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: true,
                                data: { machine: marker },
                            })
                        );
                    },
                    onMouseEnter: (e: MouseEvent) => {
                        if (stamp?.pinned) {
                            return;
                        }

                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.DitioMachine,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: false,
                                data: { machine: marker },
                            })
                        );
                    },
                };

                return marker.kind === "dumper" ? <DumperMarker {...props} /> : <LoaderMarker {...props} />;
            })}
        </>
    );
}
