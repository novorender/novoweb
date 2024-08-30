import { ListItemIcon, ListItemText, MenuItem, MenuList } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render";

import { ActiveIcon } from "./activeIcon";

export function ClippingMenu({ onSelect }: { onSelect?: () => void }) {
    const activePicker = useAppSelector(selectPicker);
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const togglePicker = (picker: Picker) => {
        dispatch(renderActions.setPicker(picker === activePicker ? Picker.Object : picker));
        onSelect?.();
    };

    return (
        <MenuList>
            <MenuItem onClick={() => togglePicker(Picker.ClippingPlane)}>
                <ListItemIcon>
                    <ActiveIcon
                        Icon={featuresConfig.clippingPlanes.Icon}
                        active={activePicker === Picker.ClippingPlane}
                    />
                </ListItemIcon>
                <ListItemText>{t("clippingPlane")}</ListItemText>
            </MenuItem>
        </MenuList>
    );
}
