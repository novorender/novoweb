import { ListItemIcon, ListItemText, MenuItem, MenuList, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render";

export function ClippingMenu({ onSelect }: { onSelect?: () => void }) {
    const activePicker = useAppSelector(selectPicker);
    // const cameraType = useAppSelector(selectCameraType);
    // const selectingOrthoPoint = activePicker === Picker.OrthoPlane;
    const dispatch = useAppDispatch();

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
                <ListItemText>Clipping plane</ListItemText>
            </MenuItem>
            {/* <MenuItem
                onClick={() => {
                    if (cameraType === CameraType.Orthographic || selectingOrthoPoint) {
                        dispatch(renderActions.setPicker(Picker.Object));
                        dispatch(renderActions.setCamera({ type: CameraType.Pinhole }));
                    } else {
                        dispatch(renderActions.setPicker(Picker.OrthoPlane));
                    }
                    onSelect?.();
                }}
            >
                <ListItemIcon>
                    <ActiveIcon Icon={featuresConfig.orthoCam.Icon} active={activePicker === Picker.OrthoPlane} />
                </ListItemIcon>
                <ListItemText>2D mode</ListItemText>
            </MenuItem> */}
            {/* <MenuItem
                onClick={(e) => {
                    if (activePicker !== Picker.CrossSection) {
                        dispatch(renderActions.setPicker(Picker.CrossSection));
                    } else {
                        dispatch(renderActions.setPicker(Picker.Object));
                        dispatch(orthoCamActions.setCrossSectionPoint(undefined));
                        dispatch(orthoCamActions.setCrossSectionHover(undefined));
                    }
                    onSelect?.();
                }}
            >
                <ListItemIcon>
                    <ActiveIcon
                        Icon={featuresConfig.clippingPlanes.Icon}
                        active={activePicker === Picker.CrossSection}
                    />
                </ListItemIcon>
                <ListItemText>Cross section</ListItemText>
            </MenuItem> */}
        </MenuList>
    );
}

function ActiveIcon({ Icon, active }: { Icon: typeof featuresConfig.area.Icon; active: boolean }) {
    const theme = useTheme();

    return <Icon fontSize="small" sx={{ color: active ? theme.palette.primary.main : undefined }} />;
}
