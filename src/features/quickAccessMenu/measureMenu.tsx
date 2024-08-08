import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render";

import { ActiveIcon } from "./activeIcon";

export function MeasureMenu({ onSelect }: { onSelect?: () => void }) {
    const activePicker = useAppSelector(selectPicker);
    const dispatch = useAppDispatch();

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
                <ListItemText>Measure</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.Area)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.area.Icon} active={activePicker === Picker.Area} />
                </ListItemIcon>
                <ListItemText>Area</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.OutlineLaser)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.outlineLaser.Icon} active={activePicker === Picker.OutlineLaser} />
                </ListItemIcon>
                <ListItemText>Laser</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.Manhole)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.manhole.Icon} active={activePicker === Picker.Manhole} />
                </ListItemIcon>
                <ListItemText>Manhole</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => togglePicker(Picker.PointLine)}>
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.pointLine.Icon} active={activePicker === Picker.PointLine} />
                </ListItemIcon>
                <ListItemText>Point line</ListItemText>
            </MenuItem>
        </>
    );
}
