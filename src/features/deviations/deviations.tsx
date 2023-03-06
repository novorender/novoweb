import {
    Button,
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
} from "@mui/material";
import { Box } from "@mui/system";
import { AddCircle, Delete, Edit, MoreVert, Palette, RestartAlt, Save } from "@mui/icons-material";
import { ChangeEvent, MouseEvent, useEffect, useState } from "react";
import { ColorResult } from "react-color";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { ColorPicker } from "features/colorPicker";
import { LinearProgress, LogoSpeedDial, ScrollBox, Tooltip, WidgetContainer, WidgetHeader } from "components";

import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectHasAdminCapabilities, selectIsAdminScene, selectMaximized, selectMinimized } from "slices/explorerSlice";

import {
    selectDeviations,
    selectDeviationsStatus,
    deviationsActions,
    Deviation as DeviationType,
    DeviationMode,
    DeviationsStatus,
    selectDeviationCalculationStatus,
    DeviationCalculationStatus,
} from "./deviationsSlice";
import { CreateDeviation } from "./createDeviation";
import { SceneData } from "@novorender/data-js-api";

export default function Deviations() {
    const status = useAppSelector(selectDeviationsStatus);
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);
    const deviations = useAppSelector(selectDeviations);
    const dispatch = useAppDispatch();

    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const sceneId = useSceneId();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const isAdminScene = useAppSelector(selectIsAdminScene);

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.deviations.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.deviations.key);

    useEffect(() => {
        if (isAdminScene && calculationStatus.status === DeviationCalculationStatus.Initial) {
            getProcesses();
        }

        async function getProcesses() {
            dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Loading }));

            const processes = await dataApi.getProcesses();
            const activeProcess = processes.filter((p) => p.id === scene.id)[0];

            if (!activeProcess) {
                dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Inactive }));
                return;
            }

            if (activeProcess.state.toLowerCase() === "active" || activeProcess.state.toLowerCase() === "running") {
                dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
            } else {
                dispatch(
                    deviationsActions.setCalculationStatus({
                        status: DeviationCalculationStatus.Error,
                        error: activeProcess.state,
                    })
                );
            }
        }
    }, [dispatch, scene, calculationStatus, isAdminScene]);

    const handleCalculateDeviations = async () => {
        dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
        const res = await dataApi.fetch(`deviations/${scene.id}`).then((r) => r.json());

        if (res.success) {
            dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
        } else {
            dispatch(
                deviationsActions.setCalculationStatus({
                    status: DeviationCalculationStatus.Error,
                    error: res.error ?? "Unknown error calculating deviations",
                })
            );
        }
    };

    const handleModeChange = (evt: SelectChangeEvent | ChangeEvent<HTMLInputElement>) =>
        dispatch(
            deviationsActions.setDeviations({
                ...deviations,
                mode: evt.target.value as DeviationMode,
            })
        );

    const handleSave = async () => {
        const id = sceneId;

        dispatch(deviationsActions.setStatus({ status: DeviationsStatus.Saving }));

        try {
            const { url: _url, settings, ...originalScene } = (await dataApi.loadScene(id)) as SceneData;

            if (settings) {
                await dataApi.putScene({
                    ...originalScene,
                    url: `${id}:${scene.id}`,
                    settings: {
                        ...settings,
                        points: {
                            ...settings.points,
                            deviation: {
                                ...deviations,
                                colors: [...deviations.colors].sort((a, b) => a.deviation - b.deviation),
                            },
                        },
                    },
                });
            }

            dispatch(deviationsActions.setStatus({ status: DeviationsStatus.Initial }));
        } catch {
            dispatch(deviationsActions.setStatus({ status: DeviationsStatus.Error }));
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    widget={featuresConfig.deviations}
                    WidgetMenu={
                        isAdminScene
                            ? (props) => (
                                  <Menu {...props}>
                                      <Tooltip
                                          title={
                                              calculationStatus.status === DeviationCalculationStatus.Error ? (
                                                  <Typography>{calculationStatus.error} </Typography>
                                              ) : calculationStatus.status === DeviationCalculationStatus.Running ? (
                                                  "Running..."
                                              ) : (
                                                  ""
                                              )
                                          }
                                      >
                                          <div>
                                              <MenuItem
                                                  onClick={handleCalculateDeviations}
                                                  disabled={
                                                      calculationStatus.status === DeviationCalculationStatus.Running ||
                                                      calculationStatus.status === DeviationCalculationStatus.Loading
                                                  }
                                              >
                                                  <>
                                                      <ListItemIcon>
                                                          <RestartAlt fontSize="small" />
                                                      </ListItemIcon>
                                                      <ListItemText>Calculate deviations</ListItemText>
                                                  </>
                                              </MenuItem>
                                          </div>
                                      </Tooltip>
                                  </Menu>
                              )
                            : undefined
                    }
                >
                    {!menuOpen &&
                    !minimized &&
                    ![DeviationsStatus.Creating, DeviationsStatus.Editing].includes(status.status) ? (
                        <Box mx={-1} display="flex" justifyContent="space-between">
                            <Button
                                disabled={status.status === DeviationsStatus.Saving}
                                color="grey"
                                onClick={() =>
                                    dispatch(deviationsActions.setStatus({ status: DeviationsStatus.Creating }))
                                }
                            >
                                <AddCircle sx={{ mr: 1 }} /> Add
                            </Button>
                            <Select
                                variant="standard"
                                label="mode"
                                size="small"
                                value={deviations.mode}
                                sx={{ minWidth: 50, lineHeight: "normal" }}
                                inputProps={{ sx: { p: 0, fontSize: 14 } }}
                                onChange={handleModeChange}
                                disabled={status.status === DeviationsStatus.Saving}
                            >
                                <MenuItem value={DeviationMode.On}>On</MenuItem>
                                <MenuItem value={DeviationMode.Mix}>Mix</MenuItem>
                                <MenuItem value={DeviationMode.Off}>Off</MenuItem>
                            </Select>
                            {isAdmin ? (
                                <Button
                                    disabled={status.status === DeviationsStatus.Saving}
                                    color="grey"
                                    onClick={handleSave}
                                >
                                    <Save sx={{ mr: 1 }} /> Save
                                </Button>
                            ) : (
                                <Box width={70} />
                            )}
                        </Box>
                    ) : null}
                </WidgetHeader>
                {status.status === DeviationsStatus.Saving ? (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                ) : null}
                <ScrollBox display={menuOpen || minimized ? "none" : "block"} height={1}>
                    {[DeviationsStatus.Creating, DeviationsStatus.Editing].includes(status.status) ? (
                        <CreateDeviation />
                    ) : (
                        <>
                            <List>
                                {deviations.colors.map((deviation) => {
                                    return <Deviation key={deviation.deviation} deviation={deviation} />;
                                })}
                            </List>
                        </>
                    )}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.deviations.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
        </>
    );
}

function Deviation({ deviation }: { deviation: DeviationType }) {
    const status = useAppSelector(selectDeviationsStatus);
    const deviations = useAppSelector(selectDeviations);
    const dispatch = useAppDispatch();
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const toggleColorPicker = (event?: MouseEvent<HTMLElement>) => {
        setColorPickerAnchor(!colorPickerAnchor && event?.currentTarget ? event.currentTarget : null);
    };

    const handleColorChange = ({ rgb }: ColorResult) => {
        dispatch(
            deviationsActions.setDeviations({
                ...deviations,
                colors: deviations.colors.map((devi) =>
                    devi === deviation ? { ...deviation, color: rgbToVec(rgb) as VecRGBA } : devi
                ),
            })
        );
    };

    const handleDelete = () => {
        dispatch(
            deviationsActions.setDeviations({
                ...deviations,
                colors: deviations.colors.filter((devi) => devi !== deviation),
            })
        );
    };

    const color = vecToRgb(deviation.color);
    return (
        <>
            <ListItemButton
                disableGutters
                dense
                key={deviation.deviation}
                sx={{ px: 1, display: "flex" }}
                onClick={(evt) => {
                    evt.stopPropagation();
                    toggleColorPicker();
                }}
            >
                <Typography flex="1 1 auto">
                    {Math.sign(deviation.deviation) === 1 ? `+${deviation.deviation}` : deviation.deviation}
                </Typography>
                <IconButton
                    size="small"
                    onClick={(evt) => {
                        evt.stopPropagation();
                        toggleColorPicker(evt);
                    }}
                >
                    <Palette
                        fontSize="small"
                        sx={{
                            color: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`,
                        }}
                    />
                </IconButton>
                <IconButton
                    size="small"
                    disabled={status.status === DeviationsStatus.Saving}
                    onClick={(evt) => {
                        evt.stopPropagation();

                        dispatch(
                            deviationsActions.setStatus({
                                status: DeviationsStatus.Editing,
                                idx: deviations.colors.indexOf(deviation),
                            })
                        );
                    }}
                >
                    <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color={Boolean(menuAnchor) ? "primary" : "default"} onClick={openMenu}>
                    <MoreVert fontSize="small" />
                </IconButton>
            </ListItemButton>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => toggleColorPicker()}
                color={deviation.color}
                onChangeComplete={handleColorChange}
            />
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${deviation.deviation}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%" } }}
            >
                <MenuItem key="delete" onClick={handleDelete}>
                    <ListItemIcon>
                        <Delete fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
