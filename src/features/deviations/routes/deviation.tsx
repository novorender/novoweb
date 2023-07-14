import { Add, ArrowBack, Delete, Edit, MoreVert, Palette, Save } from "@mui/icons-material";
import {
    Box,
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
    useTheme,
} from "@mui/material";
import { ChangeEvent, MouseEvent, useState } from "react";
import { ColorResult } from "react-color";
import { useHistory } from "react-router-dom";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ColorPicker } from "features/colorPicker";
import { renderActions, selectDeviations } from "features/render";
import { loadScene } from "features/render/hooks/useHandleInit";
import { selectHasAdminCapabilities, selectIsAdminScene } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { VecRGBA, rgbToVec, vecToRgb } from "utils/color";
import { mergeRecursive } from "utils/misc";

import { selectDeviationProfilesData } from "../deviationsSlice";

export function Deviation({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const deviations = useAppSelector(selectDeviations);
    const profiles = useAppSelector(selectDeviationProfilesData);
    const dispatch = useAppDispatch();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);

    const handleModeChange = (evt: SelectChangeEvent | ChangeEvent<HTMLInputElement>) => {
        const mixFactor = evt.target.value === "on" ? 1 : evt.target.value === "mix" ? 0.5 : 0;

        dispatch(
            renderActions.setPoints({
                deviation: {
                    mixFactor,
                },
            })
        );
    };

    const handleSave = async () => {
        const id = sceneId;

        setSaveStatus(AsyncStatus.Loading);

        try {
            const [originalScene] = await loadScene(id);

            if (originalScene.customProperties.explorerProjectState) {
                const updated = mergeRecursive(originalScene, {
                    url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                    customProperties: {
                        explorerProjectState: { renderSettings: { points: { deviation: deviations } } },
                    },
                });

                dataApi.putScene(updated);
            } else {
                const settings = originalScene.settings;
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
                                    mode:
                                        deviations.mixFactor === 0 ? "off" : deviations.mixFactor === 1 ? "on" : "mix",
                                    colors: deviations.colorGradient.knots
                                        .map((deviation) => ({ deviation: deviation.position, color: deviation.color }))
                                        .sort((a, b) => a.deviation - b.deviation),
                                },
                            },
                        },
                    });
                }
            }

            setSaveStatus(AsyncStatus.Initial);
        } catch {
            setSaveStatus(AsyncStatus.Error);
        }
    };

    const loading = saveStatus === AsyncStatus.Loading;
    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button disabled={profiles.length < 2} color="grey" onClick={() => history.goBack()}>
                        <ArrowBack sx={{ mr: 1 }} /> Back
                    </Button>
                    <Select
                        name="deviations mode"
                        variant="standard"
                        label="mode"
                        size="small"
                        value={deviations.mixFactor === 1 ? "on" : deviations.mixFactor === 0 ? "off" : "mix"}
                        sx={{ minWidth: 50, lineHeight: "normal" }}
                        inputProps={{ sx: { p: 0, fontSize: 14 } }}
                        onChange={handleModeChange}
                        disabled={loading}
                    >
                        <MenuItem value={"on"}>On</MenuItem>
                        <MenuItem value={"mix"}>Mix</MenuItem>
                        <MenuItem value={"off"}>Off</MenuItem>
                    </Select>
                    {isAdmin ? (
                        <Button disabled={loading} color="grey" onClick={handleSave}>
                            <Save sx={{ mr: 1 }} /> Save
                        </Button>
                    ) : (
                        <Box width={70} />
                    )}
                </Box>
            </Box>
            {loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} pb={3}>
                <List>
                    {deviations.colorGradient.knots.map((deviation) => (
                        <ColorStop key={deviation.position} deviation={deviation} disabled={loading} />
                    ))}
                </List>
                <Box display="flex" justifyContent="flex-end" pr={2}>
                    <Button size="small" onClick={() => history.push("/deviation/add")}>
                        <Add sx={{ mr: 1 }} /> Add color stop
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}

function ColorStop({ deviation, disabled }: { deviation: { position: number; color: VecRGBA }; disabled?: boolean }) {
    const history = useHistory();

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
            renderActions.setPoints({
                deviation: {
                    colorGradient: {
                        knots: deviations.colorGradient.knots.map((devi) =>
                            devi === deviation ? { ...deviation, color: rgbToVec(rgb) as VecRGBA } : devi
                        ),
                    },
                },
            })
        );
    };

    const handleDelete = () => {
        dispatch(
            renderActions.setPoints({
                deviation: {
                    colorGradient: {
                        knots: deviations.colorGradient.knots.filter((devi) => devi !== deviation),
                    },
                },
            })
        );
    };

    const color = vecToRgb(deviation.color);
    return (
        <>
            <ListItemButton
                disableGutters
                dense
                key={deviation.position}
                sx={{ px: 1, display: "flex" }}
                onClick={(evt) => {
                    evt.stopPropagation();
                    toggleColorPicker();
                }}
            >
                <Typography flex="1 1 auto">
                    {Math.sign(deviation.position) === 1 ? `+${deviation.position}` : deviation.position}
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
                    disabled={disabled}
                    onClick={(evt) => {
                        evt.stopPropagation();
                        history.push(`/deviation/edit/${deviations.colorGradient.knots.indexOf(deviation)}`);
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
                id={`${deviation.position}-menu`}
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
