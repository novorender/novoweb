import { Box, List, ListItemButton, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getAssetUrl } from "utils/misc";

import { useGetProfileListQuery } from "../clashApi";

export default function ProfileList() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const history = useHistory();

    const { data, isLoading } = useGetProfileListQuery({
        assetUrl: getAssetUrl(view, "clash/result.json").toString(),
    });

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} height={theme.spacing(1)} mt={-1}></Box>

            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : !data ? (
                <Box color="grey" m={4} textAlign="center">
                    No clash profiles
                </Box>
            ) : (
                <ScrollBox>
                    <List>
                        {data.clashes.map((profile, i) => (
                            <ListItemButton key={i} onClick={() => history.push(`/profiles/${profile.id}/clashes`)}>
                                {profile.name}
                            </ListItemButton>
                        ))}
                    </List>
                </ScrollBox>
            )}
        </>
    );
}
