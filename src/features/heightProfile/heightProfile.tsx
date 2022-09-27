import { useEffect, useState } from "react";
import { MeasureError, Profile } from "@novorender/measure-api";
import {
    Box,
    Button,
    FormControlLabel,
    Grid,
    IconButton,
    InputLabel,
    List,
    ListItem,
    MenuItem,
    Modal,
    OutlinedInput,
    Select,
    Typography,
    useTheme,
} from "@mui/material";
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
import {
    heightProfileActions,
    selectCylindersProfilesFrom,
    selectHeightProfileMeasureEntity,
    selectSelectedPoint,
} from "./heightProfileSlice";

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
    const selectCylindersFrom = useAppSelector(selectCylindersProfilesFrom);
    const highlighted = useHighlighted().idArr;
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatch = useAppDispatch();

    const [modalOpen, toggleModal] = useToggle();
    const [profile, setProfile] = useState<AsyncState<Profile>>({ status: AsyncStatus.Initial });

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
                setProfile({ status: AsyncStatus.Initial });
                return;
            } else if (highlighted.length > maxObjects) {
                setProfile({
                    status: AsyncStatus.Error,
                    msg: `Select fewer than ${maxObjects} objects to load height profile.`,
                });
                return;
            }

            setProfile({ status: AsyncStatus.Loading });

            try {
                const profile = await measureScene.getProfileViewFromMultiSelect(highlighted, {
                    cylinderMeasure: selectCylindersFrom,
                });

                if (!profile) {
                    throw new Error("No profile");
                } else {
                    setProfile({ status: AsyncStatus.Success, data: profile });
                }
            } catch (e) {
                if (e instanceof MeasureError) {
                    setProfile({
                        status: AsyncStatus.Error,
                        msg: `The selected ${
                            highlighted.length > 1 ? "objects are" : "object is"
                        } too complex. Use entity selection to pick the right entity.`,
                    });
                    return;
                }
                setProfile({
                    status: AsyncStatus.Error,
                    msg: `No height profile available for the selected object${highlighted.length > 1 ? "s" : ""}.`,
                });
            }
        }

        async function fromSelectedEntity() {
            if (!selectedPoint) {
                setProfile({ status: AsyncStatus.Initial });
                return;
            } else if (!hasFinished(selectedEntity)) {
                setProfile({ status: AsyncStatus.Loading });
                return;
            } else if (
                selectedEntity.status === AsyncStatus.Error ||
                (selectedEntity.status === AsyncStatus.Success &&
                    (!selectedEntity.data || selectedEntity.data?.kind === "vertex"))
            ) {
                setProfile({
                    status: AsyncStatus.Error,
                    msg: `No valid parametric entity found at selected point.`,
                });
                return;
            }

            setProfile({ status: AsyncStatus.Loading });

            try {
                const profile = await measureScene.getProfileViewFromEntity(selectedEntity.data!, {
                    cylinderMeasure: selectCylindersFrom,
                });

                if (!profile) {
                    throw new Error("No profile");
                } else {
                    setProfile({ status: AsyncStatus.Success, data: profile });
                }
            } catch (e) {
                setProfile({
                    status: AsyncStatus.Error,
                    msg: `No height profile available for the selected entity.`,
                });
            }
        }
    }, [highlighted, measureScene, selectingEntity, selectedEntity, selectedPoint, selectCylindersFrom]);

    const cylinderOptions = [
        { val: "center", label: "Center" },
        { val: "top", label: "Outer top" },
        { val: "bottom", label: "Inner bottom" },
    ] as const;

    const canUseCylinderOptions = true;

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
                                disabled={Boolean(
                                    profile.status !== AsyncStatus.Success || !profile.data.profilePoints.length
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
                {profile.status === AsyncStatus.Success ? (
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
                                            pts={profile.data.profilePoints as [number, number][]}
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
                    {profile.status === AsyncStatus.Error ? profile.msg : ""}
                    {canUseCylinderOptions ? (
                        <Box px={2} flex="1 1 auto" overflow="hidden">
                            <InputLabel sx={{ color: "text.primary" }}>Cylinder profile from: </InputLabel>
                            <Select
                                fullWidth
                                name="pivot"
                                size="small"
                                value={selectCylindersFrom}
                                onChange={(e) => {
                                    dispatch(
                                        heightProfileActions.setCylindersProfilesFrom(
                                            e.target.value as "center" | "top" | "bottom"
                                        )
                                    );
                                }}
                                input={<OutlinedInput fullWidth />}
                            >
                                {cylinderOptions.map((opt) => (
                                    <MenuItem key={opt.val} value={opt.val}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </Box>
                    ) : null}
                    {profile.status === AsyncStatus.Success && profile.data.profilePoints.length ? (
                        <Box px={2} flex="1 1 auto" overflow="hidden">
                            <List dense>
                                <ListItem>
                                    <Grid container>
                                        <Grid item xs={4}>
                                            Start elevation
                                        </Grid>
                                        <Grid item xs={6}>
                                            {profile.data.startElevation.toFixed(3)} m
                                        </Grid>
                                    </Grid>
                                </ListItem>
                                <ListItem>
                                    <Grid container>
                                        <Grid item xs={4}>
                                            End elevation
                                        </Grid>
                                        <Grid item xs={6}>
                                            {profile.data.endElevation.toFixed(3)} m
                                        </Grid>
                                    </Grid>
                                </ListItem>
                                <ListItem>
                                    <Grid container>
                                        <Grid item xs={4}>
                                            Max elevation
                                        </Grid>
                                        <Grid item xs={6}>
                                            {profile.data.top.toFixed(3)} m
                                        </Grid>
                                    </Grid>
                                </ListItem>
                                <ListItem>
                                    <Grid container>
                                        <Grid item xs={4}>
                                            Min elevation
                                        </Grid>
                                        <Grid item xs={6}>
                                            {profile.data.bottom.toFixed(3)} m
                                        </Grid>
                                    </Grid>
                                </ListItem>
                            </List>
                        </Box>
                    ) : null}
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
