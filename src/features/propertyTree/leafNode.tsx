import { MoreVert, Palette, Visibility, VisibilityOff } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    IconButton,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
} from "@mui/material";
import { FocusEvent, MouseEvent, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { GroupStatus } from "contexts/objectGroups";
import { ColorPicker } from "features/colorPicker";
import { rgbToVec, VecRGBA, vecToHex } from "utils/color";

import { propertyTreeActions, PropertyTreeGroup, selectGroup, selectIsPropertyTreeLoading } from "./slice";

export function LeafNode({
    property,
    value,
    search,
    ...props
}: {
    property: string;
    value: string;
    color?: VecRGBA;
    search: (
        value: string,
        color?: VecRGBA
    ) => Promise<(Omit<PropertyTreeGroup, "color"> & { color?: VecRGBA }) | undefined>;
}) {
    const dispatch = useAppDispatch();
    const group = useAppSelector((state) => selectGroup(state, property, value));
    const isLoading = useAppSelector(selectIsPropertyTreeLoading);

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const [colorPickerAnchor, setColorPickerAnchor] = useState<HTMLElement | null>(null);

    const color = group?.color ?? props.color ?? [1, 0, 0, 1];

    const toggleColorPicker = async (event?: MouseEvent<HTMLElement>) => {
        if (colorPickerAnchor || !event?.currentTarget) {
            setColorPickerAnchor(null);
            return;
        }

        const anchor = event.currentTarget;

        if (!group) {
            const group = await search(value);

            if (!group) {
                return;
            }

            group.status = GroupStatus.None;
            group.color = color;
            dispatch(propertyTreeActions.upsertGroup({ group: group as PropertyTreeGroup, property, value }));
        }

        setColorPickerAnchor(anchor);
    };

    const stopPropagation = (evt: MouseEvent | FocusEvent) => {
        evt.stopPropagation();
    };

    const openMenu = (evt: MouseEvent<HTMLButtonElement>) => {
        stopPropagation(evt);
        setMenuAnchor(evt.currentTarget.parentElement);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleHighlightChange = async (checked: boolean) => {
        const group = await search(value);

        if (!group) {
            return;
        }

        group.status = checked ? GroupStatus.Selected : GroupStatus.None;
        group.color = color;
        dispatch(propertyTreeActions.upsertGroup({ group: group as PropertyTreeGroup, property, value }));
    };

    const handleVisibilityChange = async (checked: boolean) => {
        const group = await search(value);

        if (!group) {
            return;
        }

        group.status = checked ? GroupStatus.Hidden : GroupStatus.None;
        dispatch(propertyTreeActions.upsertGroup({ group: group as PropertyTreeGroup, property, value }));
    };

    return (
        <>
            <ListItemButton
                dense
                disableGutters
                sx={{ ml: 3, pl: 2 }}
                onClick={() => handleHighlightChange(group?.status !== GroupStatus.Selected)}
                disabled={isLoading}
            >
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        width: 0,
                        flex: "1 1 100%",
                        overflow: "hidden",
                    }}
                >
                    <Typography noWrap={true} fontSize={14} flex="1 1 auto">
                        {value}
                    </Typography>
                </Box>
                <Checkbox
                    name="toggle node highlight"
                    aria-label="toggle node highlight"
                    size="small"
                    sx={{ py: 0 }}
                    edge="end"
                    checked={group?.status === GroupStatus.Selected}
                    onChange={(_evt, checked) => handleHighlightChange(checked)}
                    onClick={stopPropagation}
                />
                <Checkbox
                    name="toggle node highlight"
                    aria-label="toggle node highlight"
                    size="small"
                    sx={{ py: 0 }}
                    edge="end"
                    icon={<Visibility htmlColor={color ? vecToHex(color) : "initial"} />}
                    checkedIcon={<VisibilityOff color="disabled" />}
                    checked={group?.status === GroupStatus.Hidden}
                    onChange={(_evt, checked) => handleVisibilityChange(checked)}
                    onClick={stopPropagation}
                />
                <Box flex="0 0 auto">
                    <IconButton sx={{ py: 0 }} aria-haspopup="true" onClick={openMenu} onFocus={stopPropagation}>
                        <MoreVert />
                    </IconButton>
                </Box>
            </ListItemButton>
            <Menu
                onClick={stopPropagation}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${property}-${value}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%" } }}
            >
                <MenuItem onClick={toggleColorPicker}>
                    <ListItemIcon>
                        <Palette fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Color</ListItemText>
                </MenuItem>
            </Menu>
            <ColorPicker
                open={Boolean(colorPickerAnchor)}
                anchorEl={colorPickerAnchor}
                onClose={() => {
                    setColorPickerAnchor(null);
                    closeMenu();
                }}
                color={color}
                onChangeComplete={({ rgb }) => {
                    if (!group) {
                        return;
                    }

                    dispatch(
                        propertyTreeActions.upsertGroup({ group: { ...group, color: rgbToVec(rgb) }, property, value })
                    );
                }}
            />
        </>
    );
}
