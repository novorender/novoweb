import { LinearScale } from "@mui/icons-material";
import { Box, FormControlLabel, List, ListItemButton } from "@mui/material";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { Picker, renderActions, selectPicker } from "features/render/renderSlice";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import { assetActions } from "./assetSlice";
import { useFetchAssetList } from "./useFetchAssetList";

export default function AssetPlacer() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.assetPlacer.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.assetPlacer.key);

    const selecting = useAppSelector(selectPicker) === Picker.Asset;
    const dispatch = useAppDispatch();
    const assetList = useFetchAssetList();

    useEffect(() => {
        return () => {
            dispatch(renderActions.stopPicker(Picker.Asset));
        };
    }, [dispatch]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.assetPlacer} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        name="toggle select points"
                                        size="medium"
                                        color="primary"
                                        checked={selecting}
                                        onChange={() =>
                                            dispatch(renderActions.setPicker(selecting ? Picker.Object : Picker.Asset))
                                        }
                                    />
                                }
                                label={<Box fontSize={14}>Select</Box>}
                            />
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox flexDirection="column" display={menuOpen || minimized ? "none" : "flex"}>
                    {assetList.status == AsyncStatus.Success ? (
                        <List disablePadding>
                            {assetList.data.map((asset) => (
                                <ListItemButton
                                    key={asset}
                                    onClick={async () => {
                                        dispatch(assetActions.setAsset(asset));
                                    }}
                                    disableGutters
                                    color="primary"
                                    sx={{ px: 1, py: 0.5 }}
                                >
                                    <LinearScale sx={{ mr: 1 }} />
                                    {asset}
                                </ListItemButton>
                            ))}
                        </List>
                    ) : null}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.assetPlacer.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
