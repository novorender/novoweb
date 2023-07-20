import { ArrowBack } from "@mui/icons-material";
import { Box, Button, List, ListItemButton, useTheme } from "@mui/material";
import { format } from "date-fns";
import { Link, useHistory } from "react-router-dom";

import { useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";

import { useGetLogPointsQuery } from "../api";
import { selectXsiteManageSite } from "../slice";

export function LogPoints() {
    const theme = useTheme();
    const history = useHistory();

    const site = useAppSelector(selectXsiteManageSite);
    const {
        data: logPoints,
        isFetching: isFetchingLogPoints,
        isError: isLogPointError,
    } = useGetLogPointsQuery({ siteId: site?.siteId ?? "" }, { skip: !site });

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent={"space-between"}>
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    {/* <FormControlLabel
                        sx={{ ml: 3 }}
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                checked={showMarkers}
                                onChange={() => dispatch(xsiteManageActions.toggleShowMarkers())}
                            />
                        }
                        label={
                            <Box fontSize={14} sx={{ userSelect: "none" }}>
                                Show markers
                            </Box>
                        }
                    /> */}
                    {/* <Button
                        onClick={() => {
                            history.push("/filters");
                        }}
                        color="grey"
                    >
                        <FilterAlt sx={{ mr: 1 }} />
                        Filters
                    </Button> */}
                </Box>
            </Box>
            {isFetchingLogPoints && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pb={3}>
                {isLogPointError && "An error occurred while loading log points."}
                {logPoints?.items.length === 0 ? (
                    "No log points found."
                ) : (
                    <List disablePadding sx={{ mx: -1 }}>
                        {logPoints?.items.map((point) => (
                            <ListItemButton
                                sx={{ px: 1 }}
                                disableGutters
                                key={point.localId}
                                component={Link}
                                to={`/log-points/${point.localId}`}
                            >
                                {point.localId}. {point.code ?? point.type} -{" "}
                                {format(point.timestampMs, "EEE dd/MM/yyyy HH:MM:SS")}
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </ScrollBox>
        </>
    );
}
