import { css, styled } from "@mui/material";
import { SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { CameraType, renderActions, selectCameraType, selectStamp, StampKind } from "features/render/renderSlice";

import { useXsiteManageMachineMarkers } from "../hooks/useXsiteManageMachineMarkers";
import {
    LogPointTime,
    selectXsiteManageActiveLogPoints,
    selectXsiteManageCurrentMachine,
    selectXsiteManageHoveredMachine,
} from "../slice";

const MachineMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <circle cx="12" cy="12" r="18" />
            <path d="M9 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm13.1-8.16c.01-.11.02-.22.02-.34 0-.12-.01-.23-.03-.34l.74-.58c.07-.05.08-.15.04-.22l-.7-1.21c-.04-.08-.14-.1-.21-.08l-.86.35c-.18-.14-.38-.25-.59-.34l-.13-.93c-.02-.09-.09-.15-.18-.15h-1.4c-.09 0-.16.06-.17.15l-.13.93c-.21.09-.41.21-.59.34l-.87-.35c-.08-.03-.17 0-.21.08l-.7 1.21c-.04.08-.03.17.04.22l.74.58c-.02.11-.03.23-.03.34 0 .11.01.23.03.34l-.74.58c-.07.05-.08.15-.04.22l.7 1.21c.04.08.14.1.21.08l.87-.35c.18.14.38.25.59.34l.13.93c.01.09.08.15.17.15h1.4c.09 0 .16-.06.17-.15l.13-.93c.21-.09.41-.21.59-.34l.87.35c.08.03.17 0 .21-.08l.7-1.21c.04-.08.03-.17-.04-.22l-.73-.58zm-2.6.91c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm.42 3.93-.5-.87c-.03-.06-.1-.08-.15-.06l-.62.25c-.13-.1-.27-.18-.42-.24l-.09-.66c-.02-.06-.08-.1-.14-.1h-1c-.06 0-.11.04-.12.11l-.09.66c-.15.06-.29.15-.42.24l-.62-.25c-.06-.02-.12 0-.15.06l-.5.87c-.03.06-.02.12.03.16l.53.41c-.01.08-.02.16-.02.24 0 .08.01.17.02.24l-.53.41c-.05.04-.06.11-.03.16l.5.87c.03.06.1.08.15.06l.62-.25c.13.1.27.18.42.24l.09.66c.01.07.06.11.12.11h1c.06 0 .12-.04.12-.11l.09-.66c.15-.06.29-.15.42-.24l.62.25c.06.02.12 0 .15-.06l.5-.87c.03-.06.02-.12-.03-.16l-.52-.41c.01-.08.02-.16.02-.24 0-.08-.01-.17-.02-.24l.53-.41c.05-.04.06-.11.04-.17zm-2.42 1.65c-.46 0-.83-.38-.83-.83 0-.46.38-.83.83-.83s.83.38.83.83c0 .46-.37.83-.83.83zM4.74 9h8.53c.27 0 .49-.22.49-.49v-.02c0-.27-.22-.49-.49-.49H13c0-1.48-.81-2.75-2-3.45v.95c0 .28-.22.5-.5.5s-.5-.22-.5-.5V4.14C9.68 4.06 9.35 4 9 4s-.68.06-1 .14V5.5c0 .28-.22.5-.5.5S7 5.78 7 5.5v-.95C5.81 5.25 5 6.52 5 8h-.26c-.27 0-.49.22-.49.49v.03c0 .26.22.48.49.48zM9 13c1.86 0 3.41-1.28 3.86-3H5.14c.45 1.72 2 3 3.86 3z"></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)<{ active?: boolean; hovered?: boolean }>(
    ({ theme, active, hovered }) => css`
        cursor: pointer;
        pointer-events: bounding-box;
        filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));

        path {
            stroke: ${theme.palette.primary.main};
            fill: ${theme.palette.primary.main};
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
    `
);

export function MachineLocationMarkers() {
    const stamp = useAppSelector(selectStamp);
    const cameraType = useAppSelector(selectCameraType);
    const activeLogPoints = useAppSelector(selectXsiteManageActiveLogPoints);
    const currentMachine = useAppSelector(selectXsiteManageCurrentMachine);
    const hoveredMachine = useAppSelector(selectXsiteManageHoveredMachine);
    const locations = useXsiteManageMachineMarkers();
    const dispatch = useAppDispatch();

    if (cameraType !== CameraType.Orthographic) {
        return null;
    }

    return (
        <>
            {locations.map((location) => (
                <MachineMarker
                    id={`machineMarker-${location.machineId}`}
                    name={`machineMarker-${location.machineId}`}
                    key={location.machineId}
                    active={
                        (stamp?.kind === StampKind.MachineLocation &&
                            stamp.data.location.machineId === location.machineId) ||
                        (currentMachine === location.machineId && activeLogPoints !== LogPointTime.None)
                    }
                    hovered={hoveredMachine === location.machineId}
                    height="32px"
                    width="32px"
                    onClick={(e) => {
                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.MachineLocation,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: true,
                                data: { location },
                            })
                        );
                    }}
                    onMouseEnter={(e) => {
                        if (stamp?.pinned) {
                            return;
                        }

                        dispatch(
                            renderActions.setStamp({
                                kind: StampKind.MachineLocation,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                pinned: false,
                                data: { location },
                            })
                        );
                    }}
                    onMouseLeave={() => {
                        if (stamp?.pinned) {
                            return;
                        }

                        dispatch(renderActions.setStamp(null));
                    }}
                />
            ))}
        </>
    );
}
