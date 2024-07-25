import { ArrowBack } from "@mui/icons-material";
import { Autocomplete, Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useState } from "react";
import { useHistory } from "react-router-dom";

import { usePutObjectGroupMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import {
    GroupStatus,
    ObjectGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useObjectGroups,
} from "contexts/objectGroups";
import { groupsActions, selectSaveStatus } from "features/groups";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

export function Details({
    savedInputs,
    groupToEdit,
    ids,
    includeDescendants,
}: {
    savedInputs: SearchPattern[];
    groupToEdit?: ObjectGroup;
    ids: ObjectId[];
    includeDescendants: boolean;
}) {
    const theme = useTheme();
    const history = useHistory();
    const projectId = useSceneId();
    const dispatchHighlighted = useDispatchHighlighted();
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const saveStatus = useAppSelector(selectSaveStatus);
    const [name, setName] = useState(
        groupToEdit
            ? groupToEdit.name
            : savedInputs
                  .map(
                      (input) =>
                          `${input.property?.split("/").pop()} ${
                              input.value ? input.value : input.range ? `${input.range.min}-${input.range.max}` : ""
                          }`
                  )
                  .join(" + ")
    );
    const [collection, setCollection] = useState(groupToEdit?.grouping ?? "");
    const [putGroup] = usePutObjectGroupMutation();
    const dispatch = useAppDispatch();
    const collections = Array.from(
        objectGroups.reduce((set, grp) => {
            if (grp.grouping) {
                grp.grouping.split("/").forEach((_collection, idx, arr) => {
                    set.add(arr.slice(0, -idx).join("/"));
                });

                set.add(grp.grouping);
            }

            return set;
        }, new Set<string>())
    )
        .filter((collection) => collection !== "")
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" }));

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        if (groupToEdit) {
            await updateGroup();
        } else {
            await createGroup();
        }

        history.push("/");
    };

    const saveGroup = (group: ObjectGroup) =>
        putGroup({
            projectId,
            group: {
                ...group,
                selected: group.status === GroupStatus.Selected,
                hidden: group.status === GroupStatus.Hidden,
                frozen: group.status === GroupStatus.Frozen,
                ids: group.ids ? Array.from(group.ids) : undefined,
            },
        }).unwrap();

    const createGroup = async () => {
        const newGroup: ObjectGroup = {
            name,
            includeDescendants,
            ids: new Set(ids),
            grouping: collection,
            id: window.crypto.randomUUID(),
            status: GroupStatus.Selected,
            search: [...savedInputs],
            color: [1, 0, 0, 1],
            opacity: 0,
            canManage: true,
        };

        dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Loading }));
        try {
            await saveGroup(newGroup);
            dispatchObjectGroups(objectGroupsActions.add([newGroup]));
            dispatchHighlighted(highlightActions.remove(ids));
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Success, data: "Group created successfully" }));
        } catch (error) {
            console.error(error);
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Error, msg: "Error creating group" }));
        }
    };

    const updateGroup = async () => {
        if (!groupToEdit) {
            return;
        }

        try {
            const group = {
                ...groupToEdit,
                name,
                includeDescendants,
                ids: new Set(ids),
                grouping: collection,
                search: [...savedInputs],
            };

            await saveGroup(group);
            dispatchObjectGroups(objectGroupsActions.update(groupToEdit.id, group));
            dispatchHighlighted(highlightActions.remove(ids));
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Success, data: "Group updated successfully" }));
        } catch (error) {
            console.error(error);
            dispatch(groupsActions.setSaveStatus({ status: AsyncStatus.Error, msg: "Error updating group" }));
        }
    };

    const isSaving = saveStatus.status === AsyncStatus.Loading;

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent={"space-between"}>
                        <Button color="grey" onClick={() => history.goBack()} disabled={isSaving}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            {isSaving && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} py={2} component="form" onSubmit={handleSubmit}>
                <TextField
                    label="Group name"
                    sx={{ mb: 2 }}
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <Autocomplete
                    sx={{ mb: 2 }}
                    id="group-collection"
                    options={collections}
                    value={collection}
                    onChange={(_e, value) => setCollection(value ?? "")}
                    freeSolo
                    size="small"
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            onChange={(e) => {
                                setCollection(e.target.value);
                            }}
                            label="Collection"
                        />
                    )}
                />

                <Box display="flex" mb={1}>
                    <Button
                        onClick={() => {
                            history.push("/");
                        }}
                        color="grey"
                        type="button"
                        variant="outlined"
                        fullWidth
                        sx={{ marginRight: 1 }}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={!name || isSaving} color="primary" variant="contained">
                        {groupToEdit ? "Save" : "Add"} group
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
