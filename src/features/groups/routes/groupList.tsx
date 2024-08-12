import { AcUnit, AddCircle, CheckCircle, MoreVert, Save, Visibility } from "@mui/icons-material";
import { Box, Button, IconButton, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import {
    GroupStatus,
    isInternalGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useObjectGroups,
} from "contexts/objectGroups";
import { selectHasAdminCapabilities } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { Collection } from "../collection";
import { Group, StyledCheckbox, StyledListItemButton } from "../group";
import { selectLoadingIds, selectSaveStatus } from "../groupsSlice";

export function GroupList() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const loadingIds = useAppSelector(selectLoadingIds);
    const saveStatus = useAppSelector(selectSaveStatus);
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));
    const dispatchObjectGroups = useDispatchObjectGroups();

    const collections = Array.from(
        objectGroups.reduce((set, grp) => {
            if (grp.grouping) {
                const collection = grp.grouping.split("/")[0];
                set.add(collection);
            }

            return set;
        }, new Set<string>()),
    ).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const singles = objectGroups
        .filter((grp) => !grp.grouping)
        .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "accent" }));

    const isLoading = loadingIds || saveStatus === AsyncStatus.Loading;
    const allSelectedOrFrozen = objectGroups.every(
        (group) => group.status === GroupStatus.Selected || group.status === GroupStatus.Frozen,
    );
    const allHiddenOrFrozen = objectGroups.every(
        (group) => group.status === GroupStatus.Hidden || group.status === GroupStatus.Frozen,
    );
    const allFrozen = objectGroups.every((group) => group.status === GroupStatus.Frozen);

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
                            {t("addGroup")}
                        </Button>
                        <Button
                            color="grey"
                            onClick={() => dispatchObjectGroups(objectGroupsActions.groupSelected())}
                            disabled={
                                isLoading || singles.filter((group) => group.status === GroupStatus.Selected).length < 2
                            }
                        >
                            <CheckCircle sx={{ mr: 1 }} />
                            {t("groupSelected")}
                        </Button>
                        <Button disabled={isLoading} color="grey" onClick={() => history.push("/save")}>
                            <Save sx={{ mr: 1 }} />
                            {t("save")}
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
                <StyledListItemButton
                    disableRipple
                    disabled={isLoading}
                    onClick={() =>
                        objectGroups
                            .filter((g) => g.status !== GroupStatus.Frozen)
                            .forEach((group) =>
                                dispatchObjectGroups(
                                    objectGroupsActions.update(group.id, {
                                        status: allSelectedOrFrozen ? GroupStatus.None : GroupStatus.Selected,
                                    }),
                                ),
                            )
                    }
                >
                    <Box display="flex" width={1} alignItems="center">
                        <Box flex={"1 1 100%"}>
                            <Typography color="textSecondary" noWrap={true}>
                                {t("groupsName")}
                                {objectGroups.length}
                            </Typography>
                        </Box>
                        {objectGroups.length ? (
                            <>
                                {allFrozen ? undefined : (
                                    <StyledCheckbox
                                        name="toggle all groups highlighting"
                                        aria-label="toggle all groups highlighting"
                                        size="small"
                                        checked={allSelectedOrFrozen}
                                        disabled={isLoading}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={() =>
                                            objectGroups
                                                .filter((g) => g.status !== GroupStatus.Frozen)
                                                .forEach((group) =>
                                                    dispatchObjectGroups(
                                                        objectGroupsActions.update(group.id, {
                                                            status: allSelectedOrFrozen
                                                                ? GroupStatus.None
                                                                : GroupStatus.Selected,
                                                        }),
                                                    ),
                                                )
                                        }
                                    />
                                )}
                                <StyledCheckbox
                                    name="toggle all groups visibility"
                                    aria-label="toggle all groups visibility"
                                    size="small"
                                    icon={allFrozen ? <AcUnit /> : <Visibility />}
                                    checkedIcon={<Visibility color="disabled" />}
                                    checked={allFrozen ? false : allHiddenOrFrozen}
                                    disabled={isLoading || allFrozen}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={() =>
                                        objectGroups
                                            .filter((g) => g.status !== GroupStatus.Frozen)
                                            .forEach((group) =>
                                                dispatchObjectGroups(
                                                    objectGroupsActions.update(group.id, {
                                                        status: allHiddenOrFrozen
                                                            ? GroupStatus.None
                                                            : GroupStatus.Hidden,
                                                    }),
                                                ),
                                            )
                                    }
                                />
                                <Box flex="0 0 auto" visibility={"hidden"}>
                                    <IconButton size="small" sx={{ py: 0 }}>
                                        <MoreVert />
                                    </IconButton>
                                </Box>
                            </>
                        ) : null}
                    </Box>
                </StyledListItemButton>
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
