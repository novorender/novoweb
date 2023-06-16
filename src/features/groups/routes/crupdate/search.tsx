import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { useHistory, useRouteMatch } from "react-router-dom";
import { FormEventHandler, useState } from "react";
import { AddCircle, ArrowBack, ArrowForward } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";

import { AdvancedSearchInputs, Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAbortController } from "hooks/useAbortController";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { searchDeepByPatterns } from "utils/search";
import { uniqueArray } from "utils/misc";

export function Search({
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
    const match = useRouteMatch();
    const theme = useTheme();
    const history = useHistory();
    const dispatchHighlighted = useDispatchHighlighted();
    const {
        state: { scene_OLD: scene },
    } = useExplorerGlobals(true);

    const [searching, setSearching] = useState(false);
    const [inputs, setInputs] = useState<SearchPattern[]>(savedInputs);
    const [focusedInputIdx, setFocusedInputIdx] = useState<number>(-1);
    const focusedInput = inputs[focusedInputIdx];
    const [abortController, abort] = useAbortController();

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        const abortSignal = abortController.current.signal;

        setIds([]);
        dispatchHighlighted(highlightActions.setIds([]));
        setSavedInputs(inputs);
        setSearching(true);

        await searchDeepByPatterns({
            abortSignal,
            db: scene,
            searchPatterns: inputs,
            callback: (result) => {
                setIds((state) => state.concat(result));
                dispatchHighlighted(highlightActions.add(result));
            },
        }).catch(() => {});

        setIds((ids) => uniqueArray(ids));
        setSearching(false);
    };

    const disableNext = searching || !savedInputs.filter((input) => input.property && input.value).length;
    const disableSearch = searching || !inputs.filter((input) => input.property && input.value).length;

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
                        <Box display="flex" justifyContent="center" alignItems="center" fontSize={14}>
                            Objects: {ids.length}
                        </Box>
                        <Button
                            color="grey"
                            disabled={disableNext}
                            onClick={() => {
                                if (!disableNext) {
                                    history.push(match.url + "/step2");
                                }
                            }}
                        >
                            Next
                            <ArrowForward sx={{ ml: 0.5 }} />
                        </Button>
                    </Box>
                </>
            </Box>
            {searching ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} py={2} component="form" onSubmit={handleSubmit}>
                <AdvancedSearchInputs
                    inputs={inputs}
                    setInputs={setInputs}
                    setFocusedInputIdx={(input) => setFocusedInputIdx(input)}
                    maxHeight={"auto"}
                />
                <Box mt={1} mb={2} display="flex">
                    <Button
                        color="grey"
                        sx={{ padding: 0, mr: 3 }}
                        onClick={() => setInputs((state) => state.concat([{ property: "", value: "", exact: true }]))}
                    >
                        <AddCircle sx={{ mr: 0.5 }} />
                        AND
                    </Button>
                    <Button
                        color="grey"
                        sx={{ padding: 0, mr: 4 }}
                        disabled={
                            !focusedInput ||
                            (Array.isArray(focusedInput.value) ? !focusedInput.value.slice(-1)[0] : !focusedInput.value)
                        }
                        onClick={() =>
                            setInputs((inputs) =>
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
                </Box>
                <Box display="flex" mb={1}>
                    <Button
                        onClick={() => {
                            if (searching) {
                                abort();
                            } else {
                                history.goBack();
                            }
                        }}
                        color="grey"
                        type="button"
                        variant="outlined"
                        fullWidth
                        sx={{ marginRight: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" fullWidth disabled={disableSearch} color="primary" variant="contained">
                        Search
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
