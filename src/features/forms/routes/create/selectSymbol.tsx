import { List, ListItemButton, ListItemText, Typography } from "@mui/material";
import { useHistory } from "react-router-dom";

import { ScrollBox } from "components";
import { useFetchAssetList } from "features/forms/hooks/useFetchAssetList";
import { AsyncStatus } from "types/misc";

export function SelectSymbol({ symbol, onChange }: { symbol: string | undefined; onChange: (symbol: string) => void }) {
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
                Select symbol
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
                        selected={asset.name === symbol}
                    >
                        <ListItemText>{asset.title}</ListItemText>
                    </ListItemButton>
                ))}
            </List>
        </ScrollBox>
    );
}
