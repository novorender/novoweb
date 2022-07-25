import { useEffect, useState } from "react";
import { Box, Button, IconButton, Modal, Typography, useTheme } from "@mui/material";
import { ParentSizeModern } from "@visx/responsive";
import { Close } from "@mui/icons-material";

import { useAppSelector } from "app/store";
import { LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";
import { useHighlighted } from "contexts/highlighted";

import { HeightProfileChart } from "./heightProfileChart";

// const PTS = [
//     [0, 0],
//     [5, 0],
//     [9, 0.2],
//     [27, 5],
//     [39, 4.9],
// ] as [number, number][];

// const PTS = [
//     [0, 10],
//     [130, 10.3534],
//     [194, 10.2],
//     [321, 10.9],
//     [600, 11.1],
//     [680, 10.953],
//     [821, 10.3215],
//     [999, -10.121],
// ] as [number, number][];

// const PTS = [
//     [0, 0],
//     [130, 0.3534],
//     [194, 0.2],
//     [321, 0.9],
//     [600, 1.1],
//     [680, 0.953],
//     [821, 0.3215],
//     [999, -0.121],
// ] as [number, number][];

export function HeightProfile() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.heightProfile.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.heightProfile.key;
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);

    const highlighted = useHighlighted().idArr;
    const [modalOpen, toggleModal] = useToggle();
    const [pts, setPts] = useState<AsyncState<[number, number][]>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        setPts({ status: AsyncStatus.Initial });
    }, [highlighted]);

    const handleLoadPts = async () => {
        setPts({ status: AsyncStatus.Loading });

        try {
            const profile = await measureScene.getProfileViewFromMultiSelect(highlighted, "cylinders");
            console.log(highlighted, profile);

            // return setPts({ status: AsyncStatus.Success, data: PTS });

            if (!profile) {
                throw new Error("No profile");
            } else {
                setPts({ status: AsyncStatus.Success, data: profile.profilePoints as [number, number][] });
            }
        } catch {
            setPts({ status: AsyncStatus.Error, msg: "No height profile available for selected items" });
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={{ ...featuresConfig.heightProfile, name: "Height profile" as any }} />
                {pts.status === AsyncStatus.Loading ? (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                ) : null}
                {pts.status === AsyncStatus.Success ? (
                    <Modal open={modalOpen}>
                        <ScrollBox
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            width={1}
                            height={1}
                            p={{ xs: 2, sm: 4, md: 8 }}
                            position="relative"
                        >
                            <IconButton
                                aria-label="close"
                                onClick={toggleModal}
                                sx={{
                                    position: "absolute",
                                    top: { xs: theme.spacing(3), sm: theme.spacing(5), md: theme.spacing(9) },
                                    right: { xs: theme.spacing(4), sm: theme.spacing(6), md: theme.spacing(10) },
                                    color: theme.palette.secondary.main,
                                }}
                            >
                                <Close />
                            </IconButton>
                            <Box
                                maxWidth={1}
                                maxHeight={1}
                                width={1}
                                height={1}
                                borderRadius="4px"
                                bgcolor={theme.palette.common.white}
                                pb={8}
                                pt={{ xs: 2, md: 8 }}
                                px={{ xs: 2, sm: 8 }}
                            >
                                <Typography component="h1" variant="h5" textAlign="center" mb={2}>
                                    Height profile
                                </Typography>
                                <ParentSizeModern>
                                    {(parent) => (
                                        <HeightProfileChart
                                            pts={pts.data}
                                            height={parent.height}
                                            width={parent.width}
                                        />
                                    )}
                                </ParentSizeModern>
                            </Box>
                        </ScrollBox>
                    </Modal>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    <Button
                        disabled={!highlighted.length || highlighted.length > 20 || pts.status === AsyncStatus.Loading}
                        onClick={handleLoadPts}
                    >
                        Load profile
                    </Button>
                    <Button
                        disabled={Boolean(pts.status !== AsyncStatus.Success || !pts.data.length)}
                        onClick={toggleModal}
                    >
                        Show profile
                    </Button>
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.heightProfile.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.heightProfile.key}-widget-menu-fab`}
            />
        </>
    );
}
