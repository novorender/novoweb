import { useState, FormEventHandler } from "react";
import { Box, Typography, Button, Modal, useTheme, Link, FormControlLabel } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { HierarcicalObjectReference, SearchPattern } from "@novorender/webgl-api";
import { v4 as uuidv4 } from "uuid";

import { api } from "app";
import { ScrollBox, TextField, Switch } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";

import { useToggle } from "hooks/useToggle";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { searchByPatterns, searchDeepByPatterns } from "utils/search";
import { uniqueArray } from "utils/misc";

enum Status {
    Initial,
    InputChanged,
    Searching,
    SearchError,
    SearchSuccess,
}

// @prettier-ignore
const initialSearchPattern = `{
    "searchPattern": [
        {
            "property": "",
            "value": "",
            "exact": true
        }
    ]
}`;

export function CreateJsonGroup({
    open,
    id,
    onClose,
}: {
    open: boolean;
    id?: string;
    onClose: (canceled?: boolean) => void;
}) {
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const highlighted = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const { state: customGroups, dispatch: dispatchCustomGroup } = useCustomGroups();
    const groupToEdit = id ? customGroups.find((group) => group.id === id) : undefined;

    const [status, setStatus] = useMountedState(Status.Initial);
    const [json, setJson] = useState(
        groupToEdit ? JSON.stringify({ searchPattern: groupToEdit.search }, undefined, 2) : initialSearchPattern
    );
    const [ids, setIds] = useState([] as number[]);
    const [includeDescendants, toggleIncludeDescendants] = useToggle(true);

    const [abortController] = useAbortController();

    const search = async () => {
        const abortSignal = abortController.current.signal;

        setIds([]);
        dispatchHighlighted(highlightActions.setIds([]));
        setStatus(Status.Searching);

        let searchPatterns: SearchPattern[];
        try {
            searchPatterns = JSON.parse(json).searchPattern;

            if (!searchByPatterns || !Array.isArray(searchPatterns)) {
                throw new Error("Invalid search pattern");
            }
        } catch {
            return setStatus(Status.SearchError);
        }

        if (includeDescendants) {
            await searchDeepByPatterns({
                abortSignal,
                scene,
                searchPatterns,
                callback: (result: number[]) => {
                    setIds((state) => state.concat(result));
                    dispatchHighlighted(highlightActions.add(result));
                },
            }).catch(() => {});
        } else {
            await searchByPatterns({
                abortSignal,
                scene,
                searchPatterns,
                callback: (result: HierarcicalObjectReference[]) => {
                    const idArr = result.map((res) => res.id);
                    setIds((state) => state.concat(idArr));
                    dispatchHighlighted(highlightActions.add(idArr));
                },
            }).catch(() => {});
        }

        setIds((ids) => uniqueArray(ids));
        setStatus(Status.SearchSuccess);
    };

    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();

        let searchPatterns: SearchPattern[];
        try {
            searchPatterns = JSON.parse(json).searchPattern;

            if (!searchByPatterns || !Array.isArray(searchPatterns)) {
                throw new Error("Invalid search pattern");
            }
        } catch {
            return setStatus(Status.SearchError);
        }

        if (!groupToEdit) {
            const name = "New group (from JSON)";
            const newGroup: CustomGroup = {
                id: uuidv4(),
                name,
                ids,
                includeDescendants,
                selected: true,
                hidden: false,
                search: searchPatterns,
                color: highlighted.color,
            };

            dispatchCustomGroup(customGroupsActions.add([newGroup]));
        } else {
            dispatchCustomGroup(
                customGroupsActions.update(groupToEdit.id, { search: searchPatterns, ids, includeDescendants })
            );
        }

        dispatchHighlighted(highlightActions.remove(ids));
        onClose();
    };

    return (
        <Modal open={open}>
            <Box display="flex" justifyContent="center" alignItems="center" width={1} height={1}>
                <Box
                    width={`min(100%, 900px)`}
                    height={`min(100%, 500px)`}
                    borderRadius="4px"
                    bgcolor={theme.palette.common.white}
                    mx="auto"
                    display={"flex"}
                >
                    <ScrollBox width={1} px={{ xs: 2, sm: 8 }} py={8} component="form" onSubmit={handleSubmit}>
                        <Typography mb={1} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                            Input JSON
                        </Typography>

                        <Box mb={3} component="pre" textAlign="center">
                            {"{ "}
                            "searchPattern":{" "}
                            <Link
                                href={`https://api.novorender.com/docs/v${api.version}/interfaces/SearchPattern.html`}
                            >
                                SearchPattern
                            </Link>
                            []
                            {" }"}
                        </Box>
                        <TextField
                            sx={{ mb: 3 }}
                            multiline
                            fullWidth
                            minRows={5}
                            maxRows={20}
                            value={json}
                            onChange={(e) => {
                                setJson(e.target.value);
                                setStatus(Status.InputChanged);
                            }}
                            error={status === Status.SearchError}
                            helperText={status === Status.SearchError ? "Invalid search pattern" : ""}
                        />
                        <FormControlLabel
                            sx={{ ml: 0, mb: 3 }}
                            control={
                                <Switch
                                    name={"includeDescendants"}
                                    checked={includeDescendants}
                                    onChange={() => {
                                        toggleIncludeDescendants();
                                        setStatus(Status.InputChanged);
                                    }}
                                />
                            }
                            label={
                                <Box ml={1} fontSize={16}>
                                    Include child objects of search result
                                </Box>
                            }
                        />

                        <Box display="flex" justifyContent="space-between">
                            <Button
                                size="large"
                                color="grey"
                                variant="contained"
                                type="button"
                                sx={{ mr: 3 }}
                                onClick={() => onClose(true)}
                            >
                                Cancel
                            </Button>
                            <Box display="flex">
                                <LoadingButton
                                    sx={{ mr: 3 }}
                                    size="large"
                                    variant="contained"
                                    type="button"
                                    onClick={search}
                                    loading={status === Status.Searching}
                                    loadingIndicator="Searching..."
                                >
                                    Search
                                </LoadingButton>
                                <Button
                                    disabled={status !== Status.SearchSuccess}
                                    size="large"
                                    variant="contained"
                                    type="submit"
                                >
                                    {groupToEdit ? "Update" : "Create"} group ({ids.length})
                                </Button>
                            </Box>
                        </Box>
                    </ScrollBox>
                </Box>
            </Box>
        </Modal>
    );
}
