import { Box, Button, List, ListItemButton, Typography, useTheme } from "@mui/material";
import { Redirect, useHistory } from "react-router-dom";
import { Settings } from "@mui/icons-material";
import { useEffect } from "react";

import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { AsyncStatus, hasFinished } from "types/misc";
import { getAssetUrl } from "utils/misc";

import { deviationsActions, selectDeviationProfiles, selectDeviations } from "../deviationsSlice";

type DeviationConfig = {
    pointToTriangle: {
        groups: {
            name: string;
            groupIds: string[];
        }[];
    };
    pointToPoint: {
        groups: {
            name: "Point to point";
            from: {
                groupIds: string[];
            };
            to: {
                groupIds: string[];
            };
        }[];
    };
};

export function Root() {
    const history = useHistory();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const deviations = useAppSelector(selectDeviations);
    const profiles = useAppSelector(selectDeviationProfiles);
    const dispatch = useAppDispatch();

    useEffect(() => {
        initDeviationProfiles();

        async function initDeviationProfiles() {
            if (profiles.status !== AsyncStatus.Initial) {
                return;
            }

            const url = getAssetUrl(scene, "deviations.json").toString();

            dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Loading }));

            try {
                const res = (await fetch(url).then((res) => res.json())) as DeviationConfig;
                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Success,
                        data: [
                            ...res.pointToTriangle.groups.map((grp) => grp.name),
                            ...res.pointToPoint.groups.map((grp) => grp.name),
                        ],
                    })
                );
            } catch (e) {
                console.warn(e);
                dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Success, data: [] }));
            }
        }
    }, [scene, dispatch, profiles]);

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
                                        onClick={() => dispatch(deviationsActions.setDeviations({ index: idx }))}
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
