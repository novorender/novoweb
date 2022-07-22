import { Box, Button, IconButton, Modal, Typography, useTheme } from "@mui/material";
import { ParentSizeModern } from "@visx/responsive";

import { useAppSelector } from "app/store";
import { LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { HeightProfileChart } from "./heightProfileChart";
import { Close } from "@mui/icons-material";

// const objs = [212, 214, 215, 216];
// const pts = [
//     [0, 6699991.175585205],
//     [0.010000000351072822, 6699991.167478834],
//     [0.010000000351072822, 6699991.175585205],
//     [82.8910527755095, 6699942.638810951],
//     [82.8910527755095, 6699991.175585205],
// ];

// ojbid 8146 nbf master
// const pts = [
//     [0, 6699768.836672768],
//     [7.287728417810739, 6699772.533776209],
//     [7.420584239630998, 6699768.755939105],
//     [7.553020332859261, 6699768.664039376],
//     [27.024467063449208, 6699768.562192192],
// ];

// const pts = [
//     [0, 6699924.0681547485],
//     [34.75313668682716, 6699946.608539481],
//     [42.543665296475915, 6699971.988605044],
//     [23.52986147069269, 6699985.671324779],
// ];

// const pts = [
//     [6699912.0681547485, 12],
//     [6699946.608539481, 24],
//     [6699971.988605044, 26.55291],
//     [6699985.671324779, 23.51233],
// ] as [number, number][];

const pts = [
    [0, 5],
    [11, 4.9],
    [24, 4],
    [68, 2.3],
    [83, 0],
    [100, 0.5],
] as [number, number][];

export function HeightProfile() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);
    const minimized = useAppSelector(selectMinimized) === featuresConfig.heightProfile.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.heightProfile.key;
    const [modalOpen, toggleModal] = useToggle();

    (window as any).measureScene = measureScene;

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={{ ...featuresConfig.heightProfile, name: "Height profile" as any }} />
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
                                    <HeightProfileChart pts={pts} height={parent.height} width={parent.width} />
                                )}
                            </ParentSizeModern>
                        </Box>
                    </ScrollBox>
                </Modal>
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    <Button onClick={toggleModal}>Show profile</Button>
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
