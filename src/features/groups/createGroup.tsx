import { FormEventHandler, useState } from "react";
import { AddCircle } from "@mui/icons-material";
import { Box, Button } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { v4 as uuidv4 } from "uuid";

import { AdvancedSearchInputs } from "components";

import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";

import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { searchDeepByPatterns } from "utils/search";

enum Status {
    Initial,
    Searching,
}

export function CreateGroup({ onClose, id }: { onClose: () => void; id?: string }) {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { state: customGroups, dispatch: dispatchCustomGroup } = useCustomGroups();
    const groupToEdit = id ? customGroups.find((group) => group.id === id) : undefined;
    const highlighted = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const [inputs, setInputs] = useState<SearchPattern[]>(
        groupToEdit?.search ?? [{ property: "", value: "", exact: true }]
    );
    const [status, setStatus] = useMountedState(Status.Initial);
    const [ids, setIds] = useMountedState([] as ObjectId[]);
    const [savedInputs, setSavedInputs] = useState<SearchPattern[]>([]);

    const [abortController, abort] = useAbortController();

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        const abortSignal = abortController.current.signal;

        setIds([]);
        setSavedInputs(inputs);
        setStatus(Status.Searching);

        await searchDeepByPatterns({
            abortSignal,
            scene,
            searchPatterns: inputs,
            callback: (result) => {
                setIds((state) => state.concat(result));
                dispatchHighlighted(highlightActions.add(result));
            },
        }).catch(() => {});

        setStatus(Status.Initial);
    };

    const createGroup = () => {
        const name = savedInputs.map((input) => `${input.property?.split("/").pop()} ${input.value}`).join(" + ");
        const newGroup: CustomGroup = {
            id: uuidv4(),
            name,
            ids,
            selected: true,
            hidden: false,
            search: [...savedInputs],
            color: [...highlighted.color],
        };

        dispatchCustomGroup(customGroupsActions.add([newGroup]));
        dispatchHighlighted(highlightActions.remove(ids));
        onClose();
    };

    const updateGroup = () => {
        if (!groupToEdit) {
            return;
        }

        dispatchCustomGroup(customGroupsActions.update(groupToEdit.id, { search: [...savedInputs], ids }));
        dispatchHighlighted(highlightActions.remove(ids));
        onClose();
    };

    const disableSearch =
        status === Status.Searching || !inputs.filter((input) => input.property && input.value).length;

    return (
        <Box>
            <form onSubmit={handleSubmit}>
                <AdvancedSearchInputs inputs={inputs} setInputs={setInputs} />
                <Box my={1} display="flex">
                    <Button
                        color="grey"
                        sx={{ padding: 0, mr: 4 }}
                        onClick={() => setInputs((state) => state.concat([{ property: "", value: "", exact: true }]))}
                    >
                        <AddCircle sx={{ mr: 0.5 }} />
                        Add criteria
                    </Button>
                    <Button
                        color="grey"
                        sx={{ padding: 0 }}
                        onClick={groupToEdit ? updateGroup : createGroup}
                        disabled={!ids.length}
                    >
                        <AddCircle sx={{ mr: 0.5 }} />
                        {groupToEdit ? "Update" : "Create"} group {ids.length ? `(${ids.length})` : ""}
                    </Button>
                </Box>
                <Box display="flex" mb={1}>
                    {status === Status.Initial ? (
                        <Button
                            onClick={onClose}
                            color="grey"
                            type="button"
                            variant="outlined"
                            fullWidth
                            sx={{ marginRight: 1 }}
                        >
                            Close
                        </Button>
                    ) : (
                        <Button
                            onClick={() => {
                                abort();
                            }}
                            color="grey"
                            type="button"
                            variant="outlined"
                            fullWidth
                            sx={{ marginRight: 1 }}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" fullWidth disabled={disableSearch} color="primary" variant="contained">
                        Search
                    </Button>
                </Box>
            </form>
        </Box>
    );
}
