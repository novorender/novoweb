import { Check, FilterAlt } from "@mui/icons-material";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";

import { selectDisplaySettings } from "../selectors";
import { crossSectionActions } from "../slice";
import { ColoringType } from "../types";

export function DisplaySettingsMenu() {
    const { t } = useTranslation();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const displaySettings = useAppSelector(selectDisplaySettings);
    const dispatch = useAppDispatch();

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    return (
        <>
            <IconButton onClick={openMenu}>
                <FilterAlt />
            </IconButton>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
            >
                <MenuItem
                    onClick={() =>
                        dispatch(crossSectionActions.updateDisplaySettings({ showLabels: !displaySettings.showLabels }))
                    }
                >
                    {displaySettings.showLabels && (
                        <ListItemIcon>
                            <Check />
                        </ListItemIcon>
                    )}
                    <ListItemText inset={!displaySettings.showLabels}>{t("labels")}</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() =>
                        dispatch(
                            crossSectionActions.updateDisplaySettings({
                                coloringType:
                                    displaySettings.coloringType === ColoringType.UniquePerObject
                                        ? ColoringType.OutlinesColor
                                        : ColoringType.UniquePerObject,
                            }),
                        )
                    }
                >
                    {displaySettings.coloringType === ColoringType.UniquePerObject && (
                        <ListItemIcon>
                            <Check />
                        </ListItemIcon>
                    )}
                    <ListItemText inset={displaySettings.coloringType !== ColoringType.UniquePerObject}>
                        {t("colorPerObject")}
                    </ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
