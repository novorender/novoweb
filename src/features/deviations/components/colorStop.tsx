import { Add, Delete, Edit, MoreVert, Palette } from "@mui/icons-material";
import {
    Box,
    Button,
    FormHelperText,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    useTheme,
} from "@mui/material";
import { MouseEvent, useMemo, useState } from "react";
import { ColorResult } from "react-color";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { ColorPicker } from "features/colorPicker";
import { rgbToVec, VecRGBA, vecToRgb } from "utils/color";

import { ColorStopGroup } from "../deviationTypes";
import { formatColorStopPos, sortColorStopsForUi } from "../utils";
import { DeviationFormErrors } from "../validation";

export function ColorStopList({
    colorStops: colorStopsUnsorted,
    onChange,
    errors,
    disabled,
    absoluteValues,
}: {
    colorStops: ColorStopGroup[];
    onChange: (value: ColorStopGroup[]) => void;
    absoluteValues: boolean;
    errors?: DeviationFormErrors;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const colorStops = useMemo(
        () => sortColorStopsForUi(colorStopsUnsorted.slice(), absoluteValues),
        [colorStopsUnsorted, absoluteValues],
    );

    return (
        <>
            <List>
                {colorStops.map((_, index) => (
                    <ColorStop
                        key={index}
                        colorStops={colorStops}
                        index={index}
                        onChange={(value) => {
                            onChange(colorStops.map((cs, i) => (i === index ? value : cs)));
                        }}
                        onDelete={() => {
                            onChange(colorStops.filter((_, i) => i !== index));
                        }}
                        disabled={disabled}
                        absoluteValues={absoluteValues}
                        hasErrors={
                            absoluteValues &&
                            colorStops.some(
                                (cs, i) =>
                                    i !== index &&
                                    Math.abs(Math.abs(cs.position) - Math.abs(colorStops[index].position)) < 0.01,
                            )
                        }
                    />
                ))}
            </List>

            {errors?.colorStops.active && (
                <Box color={theme.palette.error.main} mx={2}>
                    <FormHelperText error>{errors.colorStops.error}</FormHelperText>
                </Box>
            )}

            {!disabled && (
                <Box display="flex" justifyContent="flex-end" pr={2}>
                    <Button size="small" onClick={() => history.push("/deviation/addColorStop")}>
                        <Add sx={{ mr: 1 }} /> {t("addColorStop")}
                    </Button>
                </Box>
            )}
        </>
    );
}

export function ColorStop({
    colorStops,
    index,
    disabled,
    onChange,
    onDelete,
    absoluteValues,
    hasErrors,
}: {
    colorStops: ColorStopGroup[];
    index: number;
    disabled?: boolean;
    onChange: (value: ColorStopGroup) => void;
    onDelete: () => void;
    absoluteValues: boolean;
    hasErrors: boolean;
}) {
    const { t } = useTranslation();
    const colorStop = colorStops[index];
    const history = useHistory();

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
        onChange({ ...colorStop, color: rgbToVec(rgb) as VecRGBA });
    };

    const color = vecToRgb(colorStop.color);

    const text = formatColorStopPos(colorStop.position, absoluteValues);

    const content = (
        <>
            <Typography flex="1 1 auto" color={hasErrors ? "error" : undefined}>
                {text}
            </Typography>
            <IconButton
                size="small"
                onClick={(evt) => {
                    evt.stopPropagation();
                    toggleColorPicker(evt);
                }}
                disabled={disabled}
            >
                <Palette
                    fontSize="small"
                    sx={{
                        color: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`,
                    }}
                />
            </IconButton>
        </>
    );

    return (
        <>
            {disabled ? (
                <ListItem disableGutters dense key={colorStop.position} sx={{ px: 1, display: "flex" }}>
                    {content}
                </ListItem>
            ) : (
                <>
                    <ListItemButton
                        disableGutters
                        dense
                        key={colorStop.position}
                        sx={{ px: 1, display: "flex" }}
                        onClick={(evt) => {
                            evt.stopPropagation();
                            toggleColorPicker();
                        }}
                    >
                        {content}
                        <IconButton
                            size="small"
                            disabled={disabled}
                            onClick={(evt) => {
                                evt.stopPropagation();
                                history.push(`/deviation/editColorStop/${index}`);
                            }}
                        >
                            <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color={menuAnchor ? "primary" : "default"} onClick={openMenu}>
                            <MoreVert fontSize="small" />
                        </IconButton>
                    </ListItemButton>
                    <ColorPicker
                        open={Boolean(colorPickerAnchor)}
                        anchorEl={colorPickerAnchor}
                        onClose={() => toggleColorPicker()}
                        color={colorStop.color}
                        onChangeComplete={handleColorChange}
                    />
                    <Menu
                        onClick={(e) => e.stopPropagation()}
                        anchorEl={menuAnchor}
                        open={Boolean(menuAnchor)}
                        onClose={closeMenu}
                        id={`${colorStop.position}-menu`}
                        MenuListProps={{ sx: { maxWidth: "100%" } }}
                    >
                        <MenuItem
                            key="delete"
                            onClick={() => {
                                closeMenu();
                                onDelete();
                            }}
                            disabled={disabled}
                        >
                            <ListItemIcon>
                                <Delete fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>{t("delete")}</ListItemText>
                        </MenuItem>
                    </Menu>
                </>
            )}
        </>
    );
}
