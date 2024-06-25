import { LoadingButton } from "@mui/lab";
import { Box, Button, FormControlLabel, Link, Modal, Typography, useTheme } from "@mui/material";
import { HierarcicalObjectReference, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useState } from "react";
import { useHistory, useRouteMatch } from "react-router-dom";

import { ScrollBox, Switch, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { uniqueArray } from "utils/misc";
import { searchByPatterns, searchDeepByPatterns } from "utils/search";

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
    includeDescendants,
    toggleIncludeDescendants,
}: {
    savedInputs: SearchPattern[];
    setSavedInputs: React.Dispatch<React.SetStateAction<SearchPattern[]>>;
    ids: number[];
    setIds: (arg: number[] | ((_ids: number[]) => number[])) => void;
    includeDescendants: boolean;
    toggleIncludeDescendants: () => void;
}) {
    const history = useHistory();
    const match = useRouteMatch();
    const theme = useTheme();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const dispatchHighlighted = useDispatchHighlighted();

    const [status, setStatus] = useState(Status.Initial);
    const [json, setJson] = useState(JSON.stringify({ searchPattern: savedInputs }, undefined, 2));

    const [abortController, abort] = useAbortController();

    const search = async () => {
        abort();
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
                db,
                searchPatterns,
                callback: (result: number[]) => {
                    setIds((state) => state.concat(result));
                    dispatchHighlighted(highlightActions.add(result));
                },
            }).catch(() => {});
        } else {
            await searchByPatterns({
                abortSignal,
                db,
                searchPatterns,
                callback: (result: HierarcicalObjectReference[]) => {
                    const idArr = result.map((res) => res.id);
                    setIds((state) => state.concat(idArr));
                    dispatchHighlighted(highlightActions.add(idArr));
                },
            }).catch(() => {});
        }

        if (abortSignal.aborted) {
            return;
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
        !savedInputs.filter((input) => input.property && (input.value || input.range)).length;

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
                                href={`https://docs.novorender.com/legacy/docs/webgl-api/interfaces/NovoRender.SearchPattern`}
                                target="_blank"
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
