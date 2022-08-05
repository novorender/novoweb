import { FormEventHandler, useState } from "react";
import { AddCircle, SearchOutlined } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import { useHistory } from "react-router-dom";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";

import { AdvancedInput, LinearProgress, ScrollBox } from "components";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncState, AsyncStatus } from "types/misc";
import { useAbortController } from "hooks/useAbortController";
import { searchDeepByPatterns } from "utils/search";
import { uniqueArray } from "utils/misc";

// TODO(OLA): copy group or input new

export function AddObjects({
    onSave,
}: {
    onSave: (objects: { searchPattern: SearchPattern[]; ids: ObjectId[] }) => void;
}) {
    const dispatchHighlighted = useDispatchHighlighted();
    const history = useHistory();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [inputs, setInputs] = useState([{ property: "", value: "", exact: true }] as SearchPattern[]);
    const [savedInputs, setSavedInputs] = useState<SearchPattern[]>([]);
    const [focusedInputIdx, setFocusedInputIdx] = useState<number>(-1);

    const [ids, setIds] = useState([] as ObjectId[]);
    const [{ status }, setStatus] = useState<AsyncState<null>>({ status: AsyncStatus.Initial });
    const [abortController, abort] = useAbortController();

    const focusedInput = inputs[focusedInputIdx];
    const validPatterns = inputs.filter(({ property, value }) => property || value);

    const handleSearch = async () => {
        if (!validPatterns) {
            return;
        }

        const abortSignal = abortController.current.signal;

        setIds([]);
        dispatchHighlighted(highlightActions.setIds([]));
        setSavedInputs(inputs);
        setStatus({ status: AsyncStatus.Loading });

        await searchDeepByPatterns({
            abortSignal,
            scene,
            searchPatterns: inputs,
            callback: (result) => {
                setIds((state) => state.concat(result));
                dispatchHighlighted(highlightActions.add(result));
            },
        }).catch(() => {});

        setIds((ids) => uniqueArray(ids));
        setStatus({ status: AsyncStatus.Success });
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!savedInputs.length) {
            return;
        }

        onSave({ ids, searchPattern: savedInputs });
        history.goBack();
    };

    return (
        <>
            {status === AsyncStatus.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} pt={2} pb={3}>
                <Typography fontWeight={600} mb={1}>
                    Assign objects
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                    {inputs.map((input, idx, array) => (
                        <AdvancedInput
                            key={idx}
                            input={input}
                            setInputs={setInputs}
                            index={idx}
                            isLast={idx === array.length - 1}
                            setFocusedInputIdx={setFocusedInputIdx}
                        />
                    ))}
                    <Box my={2}>
                        <Button
                            color="grey"
                            sx={{ padding: 0, mr: 3 }}
                            onClick={() => setInputs((state) => [...state, { property: "", value: "", exact: true }])}
                        >
                            <AddCircle />
                            <Box ml={0.5}>AND</Box>
                        </Button>
                        <Button
                            color="grey"
                            sx={{ padding: 0, mr: 3 }}
                            disabled={
                                !focusedInput ||
                                (Array.isArray(focusedInput.value)
                                    ? !focusedInput.value.slice(-1)[0]
                                    : !focusedInput.value)
                            }
                            onClick={() =>
                                setInputs((state) =>
                                    state.map((input) =>
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
                        <Button
                            color="grey"
                            sx={{ padding: 0 }}
                            disabled={!validPatterns.length}
                            onClick={handleSearch}
                        >
                            <SearchOutlined />
                            <Box ml={0.5}>Search</Box>
                        </Button>
                        <Box display="flex" justifyContent="space-between" mt={2}>
                            <Button
                                variant="outlined"
                                color="grey"
                                sx={{ mr: 2 }}
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
                                disabled={!savedInputs.length || status === AsyncStatus.Loading}
                                type="submit"
                            >
                                Assign ({ids.length})
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </ScrollBox>
        </>
    );
}
