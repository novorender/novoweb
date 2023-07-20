import {
    useTheme,
    useMediaQuery,
    FabProps,
    SpeedDial,
    SpeedDialIcon,
    CloseReason,
    OpenReason,
    SpeedDialActionProps,
    Box,
} from "@mui/material";
import { Add, Close } from "@mui/icons-material";

import { CameraSpeed } from "features/cameraSpeed";
import { StepBack } from "features/stepBack";
import { StepForwards } from "features/stepForwards";
import { Home } from "features/home";
import { FlyToSelected } from "features/flyToSelected";
import { OrthoShortcut } from "features/orthoShortcut";
import { useToggle } from "hooks/useToggle";
import { ButtonKey, featuresConfig } from "config/features";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectPrimaryMenu } from "slices/explorerSlice";
import { renderActions } from "features/render";

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

export function PrimaryMenu() {
    const [open, toggle] = useToggle(true);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const primaryMenu = useAppSelector(selectPrimaryMenu);
    const dispatch = useAppDispatch();

    const handleToggle = (reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggle();
    };

    const pos = isSmall ? positions.small : positions.large;

    return (
        <Box
            sx={{ px: { xs: 12, xl: 0 }, mr: { xs: 0, xl: -3.5 }, gridColumn: "2 / 3", gridRow: "2 / 2" }}
            justifySelf={{ xs: "center", xl: "end" }}
            display="flex"
            alignItems={"flex-end"}
        >
            <SpeedDial
                open={open}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                ariaLabel="Primary menu"
                FabProps={
                    {
                        color: "secondary",
                        size: isSmall ? "small" : "large",
                        "data-test": "canvas-navigation-menu-fab",
                    } as Partial<FabProps<"button", { "data-test": string }>>
                }
                icon={<SpeedDialIcon open={false} icon={<Add />} openIcon={<Close />} />}
                sx={{ position: "relative", gridColumn: "2 / 3", gridRow: "2 / 2" }}
                onClick={() => dispatch(renderActions.setStamp(null))}
            >
                <FeatureButton featureKey={primaryMenu.button1} position={pos[0]} />
                <FeatureButton featureKey={primaryMenu.button2} position={pos[1]} />
                <FeatureButton featureKey={primaryMenu.button3} position={pos[2]} />
                <FeatureButton featureKey={primaryMenu.button4} position={pos[3]} />
                <FeatureButton featureKey={primaryMenu.button5} position={pos[4]} />
            </SpeedDial>
        </Box>
    );
}

type Props = SpeedDialActionProps & {
    position: { top?: number; right?: number; bottom?: number; left?: number };
    featureKey: ButtonKey;
};

function FeatureButton({ featureKey, ...props }: Props) {
    switch (featureKey) {
        case featuresConfig.home.key:
            return <Home {...props} />;
        case featuresConfig.cameraSpeed.key:
            return <CameraSpeed {...props} />;
        case featuresConfig.flyToSelected.key:
            return <FlyToSelected {...props} />;
        case featuresConfig.stepForwards.key:
            return <StepForwards {...props} />;
        case featuresConfig.stepBack.key:
            return <StepBack {...props} />;
        case featuresConfig.orthoShortcut.key:
            return <OrthoShortcut {...props} />;
        default:
            throw new Error(`${featureKey} is not a primary menu item.`);
    }
}
