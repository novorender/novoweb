import { useEffect, useState } from "react";
import { MeasureError } from "@novorender/measure-api";
import { Box, Button, FormControlLabel, IconButton, Modal, Typography, useTheme } from "@mui/material";
import { ParentSizeModern } from "@visx/responsive";
import { Close, DeleteSweep, Timeline } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LinearProgress, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus, hasFinished } from "types/misc";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { Picker, renderActions, selectPicker } from "slices/renderSlice";

import { HeightProfileChart } from "./heightProfileChart";
import { heightProfileActions, selectHeightProfileMeasureEntity, selectSelectedPoint } from "./heightProfileSlice";

const maxObjects = 50;

// wait for measure api to allow cylinders etc as entity

export function HeightProfile() {
    const theme = useTheme();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.heightProfile.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.heightProfile.key;
    const {
        state: { measureScene },
    } = useExplorerGlobals(true);

    const selectingEntity = useAppSelector(selectPicker) === Picker.HeightProfileEntity;
    const selectedPoint = useAppSelector(selectSelectedPoint);
    const selectedEntity = useAppSelector(selectHeightProfileMeasureEntity);
    const highlighted = useHighlighted().idArr;
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatch = useAppDispatch();

    const [modalOpen, toggleModal] = useToggle();
    const [pts, setPts] = useState<AsyncState<[number, number][]>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.HeightProfileEntity));
            dispatch(heightProfileActions.selectPoint(undefined));
        };
    }, [dispatch]);

    useEffect(() => {
        if (selectingEntity) {
            fromSelectedEntity();
        } else {
            fromMultiSelect();
        }

        async function fromMultiSelect() {
            if (!highlighted.length) {
                setPts({ status: AsyncStatus.Initial });
                return;
            } else if (highlighted.length > maxObjects) {
                setPts({
                    status: AsyncStatus.Error,
                    msg: `Select fewer than ${maxObjects} objects to load height profile.`,
                });
                return;
            }

            setPts({ status: AsyncStatus.Loading });

            try {
                const profile = await measureScene.getProfileViewFromMultiSelect(highlighted);

                if (!profile) {
                    throw new Error("No profile");
                } else {
                    setPts({ status: AsyncStatus.Success, data: profile.profilePoints as [number, number][] });
                }
            } catch (e) {
                if (e instanceof MeasureError) {
                    setPts({
                        status: AsyncStatus.Error,
                        msg: `The selected ${
                            highlighted.length > 1 ? "objects are" : "object is"
                        } too complex. Use entity selection to pick the right entity.`,
                    });
                    return;
                }
                setPts({
                    status: AsyncStatus.Error,
                    msg: `No height profile available for the selected object${highlighted.length > 1 ? "s" : ""}.`,
                });
            }
        }

        async function fromSelectedEntity() {
            if (!selectedPoint) {
                setPts({ status: AsyncStatus.Initial });
                return;
            } else if (!hasFinished(selectedEntity)) {
                setPts({ status: AsyncStatus.Loading });
                return;
            } else if (
                selectedEntity.status === AsyncStatus.Error ||
                (selectedEntity.status === AsyncStatus.Success &&
                    (!selectedEntity.data || selectedEntity.data?.kind === "vertex"))
            ) {
                setPts({
                    status: AsyncStatus.Error,
                    msg: `No valid parametric entity found at selected point.`,
                });
                return;
            }

            setPts({ status: AsyncStatus.Loading });

            try {
                const profile = await measureScene.getProfileViewFromEntity(selectedEntity.data!);

                if (!profile) {
                    throw new Error("No profile");
                } else {
                    setPts({ status: AsyncStatus.Success, data: profile.profilePoints as [number, number][] });
                }
            } catch (e) {
                setPts({
                    status: AsyncStatus.Error,
                    msg: `No height profile available for the selected entity.`,
                });
            }
        }
    }, [highlighted, measureScene, selectingEntity, selectedEntity, selectedPoint]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={{ ...featuresConfig.heightProfile, name: "Height profile" as any }}>
                    {!menuOpen && !minimized ? (
                        <Box mx={-1} display="flex" justifyContent="space-between">
                            <Button
                                color="grey"
                                disabled={selectingEntity ? !selectedPoint : !highlighted.length}
                                onClick={() =>
                                    selectingEntity
                                        ? dispatch(heightProfileActions.selectPoint(undefined))
                                        : dispatchHighlighted(highlightActions.setIds([]))
                                }
                            >
                                <DeleteSweep sx={{ mr: 1 }} />
                                Clear
                            </Button>
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={selectingEntity}
                                        onChange={() => {
                                            if (selectingEntity) {
                                                dispatch(heightProfileActions.selectPoint(undefined));
                                            }
                                            dispatch(
                                                renderActions.setPicker(
                                                    selectingEntity ? Picker.Object : Picker.HeightProfileEntity
                                                )
                                            );
                                        }}
                                    />
                                }
                                label={<Box fontSize={14}>Entity</Box>}
                            />
                            <Button
                                disabled={Boolean(pts.status !== AsyncStatus.Success || !pts.data.length)}
                                color="grey"
                                onClick={toggleModal}
                            >
                                <Timeline sx={{ mr: 1 }} />
                                Show
                            </Button>
                        </Box>
                    ) : null}
                </WidgetHeader>
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
                    {pts.status === AsyncStatus.Error ? pts.msg : ""}
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
