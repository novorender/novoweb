import { AddCircle, SearchOutlined } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Typography } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";

import { AdvancedSearchInputs, LinearProgress, ScrollBox, Switch, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { AsyncState, AsyncStatus } from "types/misc";
import { uniqueArray } from "utils/misc";
import { searchDeepByPatterns } from "utils/search";

export function AddObjects({
    onSave,
    objects,
}: {
    onSave: (objects: { searchPattern: string | SearchPattern[]; ids: ObjectId[] }) => void;
    objects?: { searchPattern: string | SearchPattern[]; ids: ObjectId[] };
}) {
    const dispatchHighlighted = useDispatchHighlighted();
    const history = useHistory();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const [simpleInput, setSimpleInput] = useState(
        typeof objects?.searchPattern === "string" ? objects.searchPattern : ""
    );
    const [advanced, toggleAdvanced] = useToggle(objects?.searchPattern ? Array.isArray(objects.searchPattern) : true);

    const [advancedInputs, setAdvancedInputs] = useState(
        objects && Array.isArray(objects.searchPattern)
            ? objects.searchPattern
            : [{ property: "", value: "", exact: true }]
    );

    const [focusedInputIdx, setFocusedInputIdx] = useState<number>(-1);
    const focusedInput = advancedInputs[focusedInputIdx];

    const [ids, setIds] = useState(objects?.ids ?? []);
    const [{ status }, setStatus] = useState<AsyncState<null>>({
        status: AsyncStatus.Initial,
    });
    const [abortController, abort] = useAbortController();

    useEffect(() => {
        if (objects?.ids) {
            dispatchHighlighted(highlightActions.setIds(objects.ids));
        }
    }, [dispatchHighlighted, objects?.ids]);

    const getSearchPattern = useCallback(() => {
        const searchPattern = advanced
            ? advancedInputs.filter(({ property, value }) => property || value)
            : simpleInput;

        if (
            (Array.isArray(searchPattern) && !searchPattern.length) ||
            (typeof searchPattern === "string" && searchPattern.length < 3)
        ) {
            return;
        }

        return searchPattern;
    }, [advanced, advancedInputs, simpleInput]);

    const handleSearch = async () => {
        const abortSignal = abortController.current.signal;

        const searchPatterns = getSearchPattern();

        if (!searchPatterns) {
            return;
        }

        setIds([]);
        dispatchHighlighted(highlightActions.setIds([]));
        setStatus({ status: AsyncStatus.Loading });

        try {
            await searchDeepByPatterns({
                db,
                searchPatterns,
                abortSignal,
                callback: (ids) => {
                    setIds((state) => state.concat(ids));
                    dispatchHighlighted(highlightActions.add(ids));
                },
            });
        } catch {
            return setStatus({
                status: AsyncStatus.Error,
                msg: "An error occurred while searching in the DB.",
            });
        }

        setIds((ids) => uniqueArray(ids));
        setStatus({ status: AsyncStatus.Success, data: null });
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        const searchPattern = getSearchPattern();

        if (!searchPattern) {
            return;
        }

        dispatchHighlighted(highlightActions.setIds([]));

        onSave({ ids, searchPattern });
        history.goBack();
    };

    const handleAdvancedToggled = () => {
        setIds([]);
        dispatchHighlighted(highlightActions.setIds([]));
        toggleAdvanced();
    };

    return (
        <>
            {status === AsyncStatus.Loading && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox p={1} pt={2} pb={3}>
                <Typography fontWeight={600} mb={1}>
                    Assign objects
                </Typography>
                <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit}>
                    {advanced ? (
                        <AdvancedSearchInputs
                            inputs={advancedInputs}
                            setInputs={setAdvancedInputs}
                            setFocusedInputIdx={setFocusedInputIdx}
                        />
                    ) : (
                        <TextField
                            autoComplete="novorender-simple-search"
                            autoFocus
                            id="simple-search-field"
                            label="Search"
                            fullWidth
                            value={simpleInput}
                            onChange={(e) => setSimpleInput(e.target.value)}
                            sx={{ mb: 2, pt: 1 }}
                        />
                    )}

                    <Box mb={2}>
                        <FormControlLabel
                            sx={{ ml: 0, mr: 3, minHeight: 24 }}
                            control={<Switch name="advanced" checked={advanced} onChange={handleAdvancedToggled} />}
                            label={
                                <Box ml={0.5} fontSize={14}>
                                    Advanced
                                </Box>
                            }
                        />
                        {advanced && (
                            <>
                                <Button
                                    color="grey"
                                    sx={{ padding: 0, mr: 3 }}
                                    onClick={() =>
                                        setAdvancedInputs((inputs) => [
                                            ...inputs,
                                            { property: "", value: "", exact: true },
                                        ])
                                    }
                                >
                                    <AddCircle />
                                    <Box ml={0.5}>AND</Box>
                                </Button>
                                <Button
                                    color="grey"
                                    sx={{ padding: 0 }}
                                    disabled={
                                        !focusedInput ||
                                        (Array.isArray(focusedInput.value)
                                            ? !focusedInput.value.slice(-1)[0]
                                            : !focusedInput.value)
                                    }
                                    onClick={() =>
                                        setAdvancedInputs((inputs) =>
                                            inputs.map((input) =>
                                                input === focusedInput
                                                    ? {
                                                          ...input,
                                                          value: Array.isArray(input.value)
                                                              ? input.value.concat("")
                                                              : [input.value ?? "", ""],
                                                      }
                                                    : input
                                            )
                                        )
                                    }
                                >
                                    <AddCircle />
                                    <Box ml={0.5}>OR</Box>
                                </Button>
                            </>
                        )}
                        <Button
                            color="grey"
                            sx={{ padding: 0 }}
                            disabled={
                                status === AsyncStatus.Loading || advanced
                                    ? !advancedInputs.length
                                    : !simpleInput.length
                            }
                            onClick={handleSearch}
                        >
                            <SearchOutlined />
                            <Box ml={0.5}>Search</Box>
                        </Button>
                    </Box>
                    <Box display="flex" mb={1}>
                        <Button
                            variant="outlined"
                            color="grey"
                            type="button"
                            sx={{ mr: 1 }}
                            fullWidth
                            disabled={status !== AsyncStatus.Loading}
                            onClick={() => {
                                abort();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={!ids.length || status !== AsyncStatus.Success}
                            type="submit"
                        >
                            Assign ({ids.length})
                        </Button>
                    </Box>
                </Box>
            </ScrollBox>
        </>
    );
}