import { ArrowBack } from "@mui/icons-material";
import { Autocomplete, Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useState } from "react";
import { useHistory } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { Divider, ScrollBox, TextField } from "components";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import {
    GroupStatus,
    ObjectGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useObjectGroups,
} from "contexts/objectGroups";

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
    const dispatchHighlighted = useDispatchHighlighted();
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
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

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (groupToEdit) {
            updateGroup();
        } else {
            createGroup();
        }

        history.push("/");
    };

    const createGroup = () => {
        const newGroup: ObjectGroup = {
            name,
            includeDescendants,
            ids: new Set(ids),
            grouping: collection,
            id: uuidv4(),
            status: GroupStatus.Selected,
            search: [...savedInputs],
            color: [1, 0, 0, 1],
            opacity: 0,
        };

        dispatchObjectGroups(objectGroupsActions.add([newGroup]));
        dispatchHighlighted(highlightActions.remove(ids));
    };

    const updateGroup = () => {
        if (!groupToEdit) {
            return;
        }

        dispatchObjectGroups(
            objectGroupsActions.update(groupToEdit.id, {
                name,
                includeDescendants,
                ids: new Set(ids),
                grouping: collection,
                search: [...savedInputs],
            })
        );
        dispatchHighlighted(highlightActions.remove(ids));
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent={"space-between"}>
                        <Button color="grey" onClick={() => history.goBack()}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
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
                    >
                        Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={!name} color="primary" variant="contained">
                        {groupToEdit ? "Save" : "Add"} group
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
