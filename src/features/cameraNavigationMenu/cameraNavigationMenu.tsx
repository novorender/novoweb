import { useTheme, useMediaQuery, FabProps, SpeedDial, SpeedDialIcon, CloseReason, OpenReason } from "@mui/material";

import { CameraSpeed } from "features/cameraSpeed";
import { StepBack } from "features/stepBack";
import { StepForwards } from "features/stepForwards";
import { Home } from "features/home";
import { FlyToSelected } from "features/flyToSelected";

import { useToggle } from "hooks/useToggle";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export function CameraNavigationMenu() {
    const [open, toggle] = useToggle(true);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

    const handleToggle = (reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggle();
    };

    const pos = isSmall ? positions.small : positions.large;

    return (
        <SpeedDial
            open={open}
            onOpen={(_event, reason) => handleToggle(reason)}
            onClose={(_event, reason) => handleToggle(reason)}
            ariaLabel="canvas navigation"
            FabProps={
                {
                    color: "secondary",
                    size: isSmall ? "small" : "large",
                    "data-test": "canvas-navigation-menu-fab",
                } as Partial<FabProps<"button", { "data-test": string }>>
            }
            icon={<SpeedDialIcon open={false} icon={<AddIcon />} openIcon={<CloseIcon />} />}
            sx={{ position: "relative" }}
        >
            <Home position={pos[0]} />
            <CameraSpeed position={pos[1]} />
            <FlyToSelected position={pos[2]} />
            <StepBack position={pos[3]} />
            <StepForwards position={pos[4]} />
        </SpeedDial>
    );
}

const positions = {
    small: [
        {
            bottom: 0,
            left: -64,
        },
        {
            bottom: 42,
            left: -50,
        },
        {
            bottom: 56,
            left: -8,
        },
        {
            bottom: 42,
            right: -50,
        },
        {
            bottom: 0,
            right: -64,
        },
    ],
    large: [
        {
            bottom: 0,
            left: -75,
        },
        {
            bottom: 49,
            left: -52,
        },
        {
            bottom: 72,
            left: 0,
        },
        {
            bottom: 49,
            right: -52,
        },
        {
            bottom: 0,
            right: -75,
        },
    ],
};
