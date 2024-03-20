import { Settings } from "@mui/icons-material";
import { Box, Button, List, ListItemButton, Typography, useTheme } from "@mui/material";
import { Redirect, useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app";
import { Divider, LinearProgress, ScrollBox } from "components";
import { renderActions, selectDeviations } from "features/render";
import { AsyncStatus, hasFinished } from "types/misc";

import { selectDeviationProfiles } from "../deviationsSlice";

export function Root() {
    const history = useHistory();
    const theme = useTheme();
    const deviations = useAppSelector(selectDeviations);
    const profiles = useAppSelector(selectDeviationProfiles);
    const dispatch = useAppDispatch();

    if (profiles.status === AsyncStatus.Success && profiles.data.length <= 1) {
        return <Redirect to="/deviation" />;
    }

    return (
        <>
            {!hasFinished(profiles) ? (
                <>
                    <Box
                        boxShadow={theme.customShadows.widgetHeader}
                        sx={{ height: 5, width: 1, mt: "-5px" }}
                        position="absolute"
                    />
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                </>
            ) : (
                <>
                    <Box boxShadow={theme.customShadows.widgetHeader}>
                        <Box px={1}>
                            <Divider />
                        </Box>
                        <Box display={"flex"} justifyContent={"flex-end"}>
                            <Button color="grey" onClick={() => history.push("/deviation")}>
                                <Settings fontSize="small" sx={{ mr: 1 }} />
                                Settings
                            </Button>
                        </Box>
                    </Box>
                    <ScrollBox>
                        {profiles.status === AsyncStatus.Error ? (
                            <Typography>{profiles.msg}</Typography>
                        ) : (
                            <List disablePadding>
                                {profiles.data.map((deviation, idx) => (
                                    <ListItemButton
                                        disableGutters
                                        onClick={() => dispatch(renderActions.setPoints({ deviation: { index: idx } }))}
                                        key={idx}
                                        selected={idx === deviations.index}
                                        sx={{ px: 1 }}
                                    >
                                        <Box display="flex" width={1} alignItems="center">
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    width: 0,
                                                    flex: "1 1 100%",
                                                }}
                                            >
                                                <Typography noWrap={true}>
                                                    {deviation ?? `Deviation ${idx + 1}`}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </ListItemButton>
                                ))}
                            </List>
                        )}
                    </ScrollBox>
                </>
            )}
        </>
    );
}
