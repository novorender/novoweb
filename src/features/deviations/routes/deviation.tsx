import {
    IconButton,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    SelectChangeEvent,
    Box,
    Button,
    Select,
    List,
    useTheme,
} from "@mui/material";
import { Add, ArrowBack, Delete, Edit, MoreVert, Palette, Save } from "@mui/icons-material";
import { MouseEvent, useState, ChangeEvent } from "react";
import { ColorResult } from "react-color";
import { SceneData } from "@novorender/data-js-api";
import { useHistory } from "react-router-dom";

import { dataApi } from "app";
import { ColorPicker } from "features/colorPicker";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";
import { Divider, LinearProgress, ScrollBox } from "components";

import {
    selectDeviations,
    deviationsActions,
    Deviation as DeviationType,
    DeviationMode,
    selectDeviationProfilesData,
} from "../deviationsSlice";

export function Deviation({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const deviations = useAppSelector(selectDeviations);
    const profiles = useAppSelector(selectDeviationProfilesData);
    const dispatch = useAppDispatch();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);

    const handleModeChange = (evt: SelectChangeEvent | ChangeEvent<HTMLInputElement>) =>
        dispatch(
            deviationsActions.setDeviations({
                ...deviations,
                mode: evt.target.value as DeviationMode,
            })
        );

    const handleSave = async () => {
        const id = sceneId;

        setSaveStatus(AsyncStatus.Loading);

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
                        variant="standard"
                        label="mode"
                        size="small"
                        value={deviations.mode}
                        sx={{ minWidth: 50, lineHeight: "normal" }}
                        inputProps={{ sx: { p: 0, fontSize: 14 } }}
                        onChange={handleModeChange}
                        disabled={loading}
                    >
                        <MenuItem value={DeviationMode.On}>On</MenuItem>
                        <MenuItem value={DeviationMode.Mix}>Mix</MenuItem>
                        <MenuItem value={DeviationMode.Off}>Off</MenuItem>
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
                    {deviations.colors.map((deviation) => (
                        <ColorStop key={deviation.deviation} deviation={deviation} disabled={loading} />
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

function ColorStop({ deviation, disabled }: { deviation: DeviationType; disabled?: boolean }) {
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
                    disabled={disabled}
                    onClick={(evt) => {
                        evt.stopPropagation();
                        history.push(`/config/edit/${deviations.colors.indexOf(deviation)}`);
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
