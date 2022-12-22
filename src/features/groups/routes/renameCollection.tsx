import { FormEventHandler, useState } from "react";
import { Autocomplete, Box, useTheme } from "@mui/material";
import { useHistory, useLocation } from "react-router-dom";

import { Confirmation, TextField } from "components";
import { objectGroupsActions, useObjectGroups, useDispatchObjectGroups } from "contexts/objectGroups";
import { useAppDispatch } from "app/store";

import { groupsActions } from "../groupsSlice";

export function RenameCollection() {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const { collection: originalCollection } = useLocation<{ collection?: string }>().state;
    const groups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const [collection, setCollection] = useState(originalCollection ?? "");
    const collections = Array.from(
        groups.reduce((set, grp) => {
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

    if (!originalCollection) {
        history.goBack();
        return <></>;
    }

    const handleSave: FormEventHandler = (e) => {
        e.preventDefault();

        if (!collection) {
            return;
        }

        groups
            .filter((group) => group.grouping?.startsWith(originalCollection))
            .forEach((group) =>
                dispatchObjectGroups(
                    objectGroupsActions.update(group.id, {
                        grouping: group.grouping?.replace(originalCollection, collection),
                    })
                )
            );

        dispatch(groupsActions.renameExpandedCollection({ from: originalCollection, to: collection }));
        history.goBack();
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <Confirmation
                title="Rename collection"
                confirmBtnText="Save"
                onCancel={() => {
                    history.goBack();
                }}
                component="form"
                onSubmit={handleSave}
            >
                <Autocomplete
                    sx={{ mb: 3 }}
                    id="group-collection"
                    fullWidth
                    options={collections}
                    value={collection}
                    inputValue={collection}
                    onChange={(_e, value) => {
                        setCollection(value ?? "");
                    }}
                    freeSolo
                    size="small"
                    includeInputInList
                    renderInput={(params) => (
                        <TextField
                            required
                            {...params}
                            onChange={(e) => {
                                setCollection(e.target.value);
                            }}
                            label="Collection"
                        />
                    )}
                />
            </Confirmation>
        </>
    );
}
