import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render";

import { ActiveIcon } from "./activeIcon";

export function MeasureMenu({ onSelect }: { onSelect?: () => void }) {
    const activePicker = useAppSelector(selectPicker);
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const togglePicker = (picker: Picker) => {
        dispatch(renderActions.setPicker(picker === activePicker ? Picker.Object : picker));
        onSelect?.();
    };

    return (
        <>
            <MenuItem onClick={() => togglePicker(Picker.Measurement)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.measure.Icon} active={activePicker === Picker.Measurement} />
                </ListItemIcon>
                <ListItemText>{t("measure")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.Area)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.area.Icon} active={activePicker === Picker.Area} />
                </ListItemIcon>
                <ListItemText>{t("area")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.OutlineLaser)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.outlineLaser.Icon} active={activePicker === Picker.OutlineLaser} />
                </ListItemIcon>
                <ListItemText>{t("laser")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.Manhole)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.manhole.Icon} active={activePicker === Picker.Manhole} />
                </ListItemIcon>
                <ListItemText>{t("manhole")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.PointLine)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.pointLine.Icon} active={activePicker === Picker.PointLine} />
                </ListItemIcon>
                <ListItemText>{t("pointLine")}</ListItemText>
            </MenuItem>
        </>
    );
}
