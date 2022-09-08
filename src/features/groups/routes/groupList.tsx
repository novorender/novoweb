import { AddCircle, CheckCircle, Save } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, LinearProgress, ScrollBox } from "components";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { selectHasAdminCapabilities } from "slices/explorerSlice";
import { useAppSelector } from "app/store";
import { AsyncStatus } from "types/misc";

import { Collection } from "../collection";
import { Group } from "../group";
import { selectLoadingIds, selectSaveStatus } from "../groupsSlice";

export function GroupList() {
    const theme = useTheme();
    const history = useHistory();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const loadingIds = useAppSelector(selectLoadingIds);
    const saveStatus = useAppSelector(selectSaveStatus);
    const { state: groups, dispatch: dispatchCustomGroups } = useCustomGroups();

    const collections = Array.from(
        groups.reduce((set, grp) => {
            if (grp.grouping) {
                const collection = grp.grouping.split("/")[0];
                set.add(collection);
            }

            return set;
        }, new Set<string>())
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const singles = groups
        .filter((grp) => !grp.grouping)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));

    const isLoading = loadingIds || saveStatus === AsyncStatus.Loading;

    return (
        <>
            {isAdmin ? (
                <Box boxShadow={theme.customShadows.widgetHeader}>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent={"space-between"}>
                        <Button disabled={isLoading} color="grey" onClick={() => history.push("/create")}>
                            <AddCircle sx={{ mr: 1 }} />
                            Add group
                        </Button>
                        <Button
                            color="grey"
                            onClick={() => dispatchCustomGroups(customGroupsActions.groupSelected())}
                            disabled={isLoading || singles.filter((group) => group.selected).length < 2}
                        >
                            <CheckCircle sx={{ mr: 1 }} />
                            Group selected
                        </Button>
                        <Button disabled={isLoading} color="grey" onClick={() => history.push("/save")}>
                            <Save sx={{ mr: 1 }} />
                            Save
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Box
                    boxShadow={theme.customShadows.widgetHeader}
                    sx={{ height: 5, width: 1, mt: "-5px" }}
                    position="absolute"
                />
            )}

            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}

            <ScrollBox display="flex" flexDirection="column" height={1} pt={1} pb={2}>
                {singles.map((grp) => (
                    <Group disabled={isLoading} group={grp} key={grp.id} />
                ))}
                {collections.map((collection) => (
                    <Collection disabled={isLoading} key={collection} collection={collection} />
                ))}
            </ScrollBox>
        </>
    );
}
