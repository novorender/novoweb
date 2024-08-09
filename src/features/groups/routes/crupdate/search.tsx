import { AddCircle, ArrowBack, ArrowForward } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";

import { AdvancedSearchInputs, Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { uniqueArray } from "utils/misc";
import { searchByPatterns, searchDeepByPatterns } from "utils/search";

export function Search({
    savedInputs,
    setSavedInputs,
    ids,
    setIds,
    toggleIncludeDescendants,
}: {
    savedInputs: SearchPattern[];
    setSavedInputs: React.Dispatch<React.SetStateAction<SearchPattern[]>>;
    ids: ObjectId[];
    setIds: (arg: number[] | ((_ids: ObjectId[]) => ObjectId[])) => void;
    toggleIncludeDescendants: (val?: boolean) => void;
}) {
    const match = useRouteMatch();
    const theme = useTheme();
    const history = useHistory();
    const dispatchHighlighted = useDispatchHighlighted();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

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

        const deep = inputs.every((input) => !input.exclude);
        if (deep) {
            await searchDeepByPatterns({
                abortSignal,
                db,
                searchPatterns: inputs,
                callback: (result) => {
                    setIds((state) => state.concat(result));
                    dispatchHighlighted(highlightActions.add(result));
                },
            }).catch(() => {});
        } else {
            await searchByPatterns({
                abortSignal,
                db,
                searchPatterns: inputs,
                callback: (result) => {
                    setIds((state) => state.concat(result.map((res) => res.id)));
                    dispatchHighlighted(highlightActions.add(result.map((res) => res.id)));
                },
            }).catch(() => {});
        }

        setIds((ids) => uniqueArray(ids));
        toggleIncludeDescendants(deep);
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
                            {t("back")}
                        </Button>
                        <Box display="flex" justifyContent="center" alignItems="center" fontSize={14}>
                            {t("objects:")}
                            {ids.length}
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
                            {t("next")}
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
                        {t("aND")}
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
                                        : input,
                                ),
                            )
                        }
                    >
                        <AddCircle />
                        <Box ml={0.5}>{t("oR")}</Box>
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
                        {t("cancel")}
                    </Button>
                    <Button type="submit" fullWidth disabled={disableSearch} color="primary" variant="contained">
                        {t("search")}
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
