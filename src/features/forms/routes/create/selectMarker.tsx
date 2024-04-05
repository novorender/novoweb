import { List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { useHistory } from "react-router-dom";

import { ScrollBox } from "components";
import { useFetchAssetList } from "features/forms/hooks/useFetchAssetList";
import { AsyncStatus } from "types/misc";

import { AssetIcon } from "./assetIcon";

export function SelectMarker({ marker, onChange }: { marker: string | undefined; onChange: (marker: string) => void }) {
    const history = useHistory();
    const assetList = useFetchAssetList();

    const handleChange = (asset: string) => {
        onChange(asset);
        history.goBack();
    };

    if (assetList.status !== AsyncStatus.Success) {
        return;
    }

    return (
        <ScrollBox p={1} pt={2} pb={3}>
            <Typography fontWeight={600} mb={1}>
                Select marker
            </Typography>
            <List disablePadding>
                {assetList.data.map((asset) => (
                    <ListItemButton
                        key={asset.name}
                        onClick={() => handleChange(asset.name)}
                        data-asset={asset}
                        disableGutters
                        color="primary"
                        sx={{ px: 1, py: 0.5 }}
                        selected={asset.name === marker}
                    >
                        <ListItemIcon>
                            <AssetIcon icon={asset.icon} />
                        </ListItemIcon>
                        <ListItemText>{asset.label}</ListItemText>
                    </ListItemButton>
                ))}
            </List>
        </ScrollBox>
    );
}
