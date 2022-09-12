import { FormEventHandler, useState } from "react";
import { Box, Typography, Button, Modal, useTheme, Link, FormControlLabel } from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { HierarcicalObjectReference, ObjectId, SearchPattern } from "@novorender/webgl-api";
import { useHistory, useRouteMatch } from "react-router-dom";

import { api } from "app";
import { ScrollBox, TextField, Switch } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
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

export function CreateJsonGroup({
    savedInputs,
    setSavedInputs,
    ids,
    setIds,
}: {
    savedInputs: SearchPattern[];
    setSavedInputs: React.Dispatch<React.SetStateAction<SearchPattern[]>>;
    ids: ObjectId[];
    setIds: (arg: number[] | ((_ids: ObjectId[]) => ObjectId[])) => void;
}) {
    const history = useHistory();
    const match = useRouteMatch();
    const theme = useTheme();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatchHighlighted = useDispatchHighlighted();

    const [status, setStatus] = useMountedState(Status.Initial);
    const [json, setJson] = useState(JSON.stringify({ searchPattern: savedInputs }, undefined, 2));
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

        setSavedInputs(searchPatterns);
        setIds((ids) => uniqueArray(ids));
        setStatus(Status.SearchSuccess);
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        history.push(match.url.replace("json", "step2"));
    };

    const disableNext =
        ![Status.Initial, Status.SearchSuccess].includes(status) ||
        !savedInputs.filter((input) => input.property && input.value).length;

    return (
        <Modal open={true} onClose={() => history.goBack()}>
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
                                onClick={() => history.goBack()}
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
                                <Button disabled={disableNext} size="large" variant="contained" type="submit">
                                    Next ({ids.length})
                                </Button>
                            </Box>
                        </Box>
                    </ScrollBox>
                </Box>
            </Box>
        </Modal>
    );
}