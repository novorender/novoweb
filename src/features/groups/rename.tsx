import { useState, FormEvent } from "react";
import { TextField } from "@mui/material";

import { Confirmation } from "components";

import { useAppDispatch, useAppSelector } from "app/store";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";

import { groupsActions, GroupsStatus, selectGroupsStatus } from "./groupsSlice";

export function Rename() {
    const status = useAppSelector(selectGroupsStatus);
    const dispatch = useAppDispatch();
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();
    const [name, setName] = useState(Array.isArray(status) ? status[1] : "");

    if (
        !Array.isArray(status) ||
        ![GroupsStatus.RenamingGroup, GroupsStatus.RenamingGroupCollection].includes(status[0])
    ) {
        return null;
    }

    const handleSave = (e: FormEvent) => {
        e.preventDefault();

        if (!name) {
            dispatch(groupsActions.setStatus(GroupsStatus.Initial));
            return;
        }

        if (status[0] === GroupsStatus.RenamingGroup) {
            dispatchCustomGroups(customGroupsActions.update(status[2], { name }));
        } else {
            dispatchCustomGroups(
                customGroupsActions.set(
                    customGroups.map((group) => (group.grouping === status[1] ? { ...group, grouping: name } : group))
                )
            );
        }

        dispatch(groupsActions.setStatus(GroupsStatus.Initial));
    };

    return (
        <Confirmation
            title="Rename group"
            confirmBtnText="Save"
            onCancel={() => dispatch(groupsActions.setStatus(GroupsStatus.Initial))}
            component="form"
            onSubmit={handleSave}
        >
            <TextField
                required
                fullWidth
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 3 }}
            />
        </Confirmation>
    );
}
