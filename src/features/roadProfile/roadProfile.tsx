import { useEffect, useState } from "react";
import { RoadProfiles } from "@novorender/measure-api";
import { Box, Button, IconButton, List, ListItemButton, Modal, Typography, useTheme } from "@mui/material";
import { ParentSizeModern } from "@visx/responsive";
import { Close, Timeline, EditRoad } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus, hasFinished } from "types/misc";
import { Picker, renderActions } from "slices/renderSlice";

import { RoadProfileChart } from "./roadProfileChart";
import { Road, roadProfileActions, selectAvailableRoads, selectRoadId } from "./roadProfileSlice";
import { searchByPatterns } from "utils/search";
import { HierarcicalObjectReference } from "@novorender/webgl-api";

export default function HeightProfile() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.heightProfile.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.heightProfile.key;
    const {
        state: { measureScene, scene },
    } = useExplorerGlobals(true);

    const dispatch = useAppDispatch();

    const [modalOpen, toggleModal] = useToggle();
    const [profile, setProfile] = useState<AsyncState<RoadProfiles | undefined>>({ status: AsyncStatus.Initial });
    const roadId = useAppSelector(selectRoadId);

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.HeightProfileEntity));
        };
    }, [dispatch]);

    useEffect(() => {
        getRoadProfiles();

        async function getRoadProfiles() {
            if (!roadId) {
                setProfile({ status: AsyncStatus.Success, data: undefined });
                return;
            }
            setProfile({ status: AsyncStatus.Loading });
            const profile = await measureScene.getRoadProfile(roadId);
            setProfile({ status: AsyncStatus.Success, data: profile });
        }
    }, [roadId, measureScene]);

    const roads = useAppSelector(selectAvailableRoads);

    useEffect(() => {
        if (roads.status === AsyncStatus.Initial) {
            getLandXmlRoads();
        }

        async function getLandXmlRoads() {
            dispatch(roadProfileActions.setRoads({ status: AsyncStatus.Loading }));

            try {
                const paths = [] as Road[];
                let references = [] as HierarcicalObjectReference[];

                await searchByPatterns({
                    full: true,
                    scene,
                    searchPatterns: [{ property: "Novorender/road", exact: true }],
                    callback: (refs) => (references = references.concat(refs)),
                });
                for (const ref of references) {
                    const data = await ref.loadMetaData();
                    let roadId = "";
                    for (const p of data.properties) {
                        if (p[0] === "Novorender/road") {
                            roadId = p[1];
                            break;
                        }
                    }
                    paths.push({ id: ref.id, name: roadId });
                }
                dispatch(roadProfileActions.setRoads({ status: AsyncStatus.Success, data: paths }));
            } catch (e) {
                console.warn(e);
                dispatch(
                    roadProfileActions.setRoads({
                        status: AsyncStatus.Error,
                        msg: "Failed to load list of roads.",
                    })
                );
            }
        }
    }, [scene, roads, dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={{ ...featuresConfig.roadProfile, name: "Road profile" as any }}>
                    {!menuOpen && !minimized ? (
                        <Box mx={-1} display="flex" justifyContent="space-between">
                            <Button
                                disabled={Boolean(
                                    profile.status !== AsyncStatus.Success || profile.data?.profiles.length === 0
                                )}
                                color="grey"
                                onClick={toggleModal}
                            >
                                <Timeline sx={{ mr: 1 }} />
                                Show
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
                {profile.status === AsyncStatus.Loading ? (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                ) : null}
                {profile.status === AsyncStatus.Success && profile.data ? (
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
                                    {profile.data.name}
                                </Typography>
                                <ParentSizeModern>
                                    {(parent) => (
                                        <RoadProfileChart
                                            profile={profile.data as RoadProfiles}
                                            height={parent.height}
                                            width={parent.width}
                                        />
                                    )}
                                </ParentSizeModern>
                            </Box>
                        </ScrollBox>
                    </Modal>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1} pt={2}>
                    {hasFinished(roads) ? (
                        roads.status === AsyncStatus.Error ? (
                            roads.msg
                        ) : !roads.data.length ? (
                            ""
                        ) : (
                            <List disablePadding>
                                {roads.data.map((road) => (
                                    <ListItemButton
                                        key={road.id}
                                        onClick={() => {
                                            dispatch(roadProfileActions.setRoadId(road.name));
                                        }}
                                        disableGutters
                                        color="primary"
                                        sx={{ px: 1, py: 0.5 }}
                                    >
                                        <EditRoad sx={{ mr: 1 }} />
                                        {road.name}
                                    </ListItemButton>
                                ))}
                            </List>
                        )
                    ) : null}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.roadProfile.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.roadProfile.key}-widget-menu-fab`}
            />
        </>
    );
}
