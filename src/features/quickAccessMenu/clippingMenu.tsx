import { ListItemIcon, ListItemText, MenuItem, MenuList } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render";

import { ActiveIcon } from "./activeIcon";

export function ClippingMenu({ onSelect }: { onSelect?: () => void }) {
    const activePicker = useAppSelector(selectPicker);
    // const cameraType = useAppSelector(selectCameraType);
    // const selectingOrthoPoint = activePicker === Picker.OrthoPlane;
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
