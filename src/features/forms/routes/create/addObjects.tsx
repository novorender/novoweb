import { AddCircle, Close, SearchOutlined } from "@mui/icons-material";
import { Box, Button, FormControlLabel, IconButton, Snackbar, Typography } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { FormEventHandler, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { AdvancedSearchInputs, LinearProgress, ScrollBox, Switch, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { AsyncState, AsyncStatus } from "types/misc";
import { uniqueArray } from "utils/misc";
import { searchDeepByPatterns } from "utils/search";

const MAX_OBJECTS_COUNT = 5000;

export function AddObjects({
    onSave,
    objects,
}: {
    onSave: (objects: { searchPattern: string | SearchPattern[]; ids: ObjectId[] }) => void;
    objects?: { searchPattern: string | SearchPattern[]; ids: ObjectId[] };
}) {
    const { t } = useTranslation();
    const dispatchHighlighted = useDispatchHighlighted();
    const history = useHistory();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const [simpleInput, setSimpleInput] = useState(
        typeof objects?.searchPattern === "string" ? objects.searchPattern : "",
    );
    const [advanced, toggleAdvanced] = useToggle(objects?.searchPattern ? Array.isArray(objects.searchPattern) : true);

    const [advancedInputs, setAdvancedInputs] = useState(
        objects && Array.isArray(objects.searchPattern)
            ? objects.searchPattern
            : [{ property: "", value: "", exact: true }],
    );

    const [focusedInputIdx, setFocusedInputIdx] = useState<number>(-1);
    const focusedInput = advancedInputs[focusedInputIdx];

    const [ids, setIds] = useState(objects?.ids ?? []);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [{ status }, setStatus] = useState<AsyncState<null>>({
        status: AsyncStatus.Initial,
    });
    const [abortController, abort] = useAbortController();

    useEffect(() => {
        if (objects?.ids) {
            dispatchHighlighted(highlightActions.setIds(objects.ids));
            if (objects.ids.length > MAX_OBJECTS_COUNT) {
                setSnackbarOpen(true);
                setSnackbarMessage(t("searchIsOverLimit", { limit: MAX_OBJECTS_COUNT }));
            }
        }
    }, [dispatchHighlighted, objects?.ids, t]);

    const getSearchPattern = useCallback(() => {
        if (!advanced && simpleInput.length < 3) {
            return;
        }

        const searchPattern = advanced
            ? advancedInputs.filter(({ property, value }) => property || value)
            : [{ value: simpleInput }];

        if (searchPattern.length === 0) {
            return;
        }

        return [...searchPattern, { property: "GUID", exact: true }];
    }, [advanced, advancedInputs, simpleInput]);

    const handleSearch = useCallback(async () => {
        const abortSignal = abortController.current.signal;

        const searchPatterns = getSearchPattern();

        if (!searchPatterns) {
            return;
        }

        setIds([]);
        dispatchHighlighted(highlightActions.setIds([]));
        setStatus({ status: AsyncStatus.Loading });

        try {
            let idCount = 0;
            await searchDeepByPatterns({
                db,
                searchPatterns,
                abortSignal,
                callback: (ids) => {
                    setIds((state) => {
                        if (state.length + ids.length > MAX_OBJECTS_COUNT) {
                            setSnackbarOpen(true);
                            setSnackbarMessage(t("searchIsOverLimit", { limit: MAX_OBJECTS_COUNT }));
                            abort();
                            return state;
                        }

                        idCount = state.length + ids.length;
                        return state.concat(ids);
                    });
                    dispatchHighlighted(highlightActions.add(ids));
                },
            });

            if (!abortSignal.aborted && idCount === 0) {
                setSnackbarOpen(true);
                setSnackbarMessage(t("noObjectsFound"));
            }
        } catch {
            return setStatus({
                status: AsyncStatus.Error,
                msg: t("errorSearchingInDb"),
            });
        }

        setIds((ids) => uniqueArray(ids));
        setStatus({ status: AsyncStatus.Success, data: null });
    }, [abort, abortController, db, dispatchHighlighted, getSearchPattern, t]);

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

    const handleLimitSnackbarClose = () => {
        setSnackbarOpen(false);
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
                    {t("assignObjects")}
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
                                    {t("advanced")}
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
                                    <Box ml={0.5}>{t("and")}</Box>
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
                                                    : input,
                                            ),
                                        )
                                    }
                                >
                                    <AddCircle />
                                    <Box ml={0.5}>{t("or")}</Box>
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
                            <Box ml={0.5}>{t("search")}</Box>
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
                            {t("cancel")}
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            disabled={!ids.length || status !== AsyncStatus.Success || ids.length > MAX_OBJECTS_COUNT}
                            type="submit"
                        >
                            {t("assign", { length: ids.length })}
                        </Button>
                    </Box>
                </Box>
                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    sx={{
                        width: { xs: "auto", sm: 350 },
                        bottom: { xs: "auto", sm: 24 },
                        top: { xs: 24, sm: "auto" },
                    }}
                    autoHideDuration={10000}
                    open={snackbarOpen}
                    onClose={handleLimitSnackbarClose}
                    message={snackbarMessage}
                    action={
                        <IconButton size="small" aria-label="close" color="inherit" onClick={handleLimitSnackbarClose}>
                            <Close fontSize="small" />
                        </IconButton>
                    }
                />
            </ScrollBox>
        </>
    );
}
