import { ChangeEvent, CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ListOnScrollProps } from "react-window";
import { Box, Button, ButtonProps, Checkbox, FormControlLabel, ListItem, styled, Typography } from "@mui/material";
import { css } from "@mui/styled-engine";
import { HierarcicalObjectReference, ObjectId, SearchPattern } from "@novorender/webgl-api";

import { useAppDispatch, useAppSelector } from "app/store";
import { TextField, Switch, LinearProgress, ScrollBox, Tooltip } from "components";
import { NodeList } from "features/nodeList";

import { useToggle } from "hooks/useToggle";
import { useMountedState } from "hooks/useMountedState";
import { useAbortController } from "hooks/useAbortController";

import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { ObjectVisibility, renderActions } from "slices/renderSlice";
import { explorerActions, selectUrlSearchQuery } from "slices/explorerSlice";

import { iterateAsync, searchByPatterns, searchDeepByPatterns } from "utils/search";
import { getTotalBoundingSphere } from "utils/objectData";

import AddCircleIcon from "@mui/icons-material/AddCircle";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useExplorerGlobals } from "contexts/explorerGlobals";

const StyledForm = styled("form")(
    ({ theme }) => css`
        margin: ${theme.spacing(1)} 0;
        box-shadow: ${theme.customShadows.widgetHeader};
        padding-bottom: ${theme.spacing(1)};
    `
);

const AdvancedSearchModifier = styled(Button, {
    shouldForwardProp: (prop) => prop !== "active",
})<ButtonProps & { active?: boolean }>(
    ({ theme, active }) => css`
        width: 24px;
        height: 24px;
        min-width: 0;
        flex: 0 0 auto;
        padding: ${theme.spacing(1)};
        color: ${theme.palette.common.white};
        background: ${active ? theme.palette.primary.main : theme.palette.secondary.light};

        &:hover {
            background: ${active ? theme.palette.primary.dark : theme.palette.secondary.main};
        }
    `
);

enum Status {
    Initial,
    Loading,
    Error,
}

export function Search() {
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const {
        state: { view, scene },
    } = useExplorerGlobals(true);

    const urlSearchQuery = useAppSelector(selectUrlSearchQuery);

    const [advanced, toggleAdvanced] = useToggle(urlSearchQuery ? Array.isArray(urlSearchQuery) : true);
    const [simpleInput, setSimpleInput] = useState(typeof urlSearchQuery === "string" ? urlSearchQuery : "");
    const [advancedInputs, setAdvancedInputs] = useState(
        Array.isArray(urlSearchQuery) ? urlSearchQuery : [{ property: "", value: "", exact: true }]
    );

    const [allSelected, setAllSelected] = useMountedState(false);
    const [allHidden, setAllHidden] = useMountedState(false);
    const [status, setStatus] = useMountedState(Status.Initial);
    const [searchResults, setSearchResults] = useMountedState<
        | {
              iterator: AsyncIterableIterator<HierarcicalObjectReference> | undefined;
              nodes: HierarcicalObjectReference[];
          }
        | undefined
    >(undefined);

    const [abortController, abort] = useAbortController();
    const listElRef = useRef<HTMLElement | null>(null);
    const previousSearchPattern = useRef<SearchPattern[] | string>();

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

    const search = useCallback(async (): Promise<HierarcicalObjectReference[] | undefined> => {
        const abortSignal = abortController.current.signal;
        const searchPattern = getSearchPattern();

        if (!searchPattern) {
            return;
        }

        previousSearchPattern.current = searchPattern;

        try {
            const iterator = scene.search({ searchPattern }, abortSignal);

            const [nodes, done] = await iterateAsync({ iterator, abortSignal, count: 50 });

            setSearchResults({ nodes, iterator: !done ? iterator : undefined });
            return nodes;
        } catch (e) {
            if (!abortSignal.aborted) {
                throw e;
            }
        }
    }, [abortController, setSearchResults, scene, getSearchPattern]);

    useEffect(() => {
        if (urlSearchQuery && status === Status.Initial) {
            handleUrlSearch();
        }

        async function handleUrlSearch() {
            const abortSignal = abortController.current.signal;
            const searchPatterns = getSearchPattern();

            if (!searchPatterns) {
                return;
            }

            let foundIds = [] as ObjectId[];
            let foundRefs = [] as HierarcicalObjectReference[];

            setStatus(Status.Loading);

            try {
                // Shallow, limited search to display results in widget
                search();

                // Deep search to highlight and fly to
                await searchDeepByPatterns({
                    scene,
                    searchPatterns,
                    abortSignal,
                    callback: (ids) => {
                        foundIds = foundIds.concat(ids);
                        dispatchHighlighted(highlightActions.add(ids));
                    },
                });

                await searchByPatterns({
                    scene,
                    abortSignal,
                    searchPatterns: [{ property: "id", value: foundIds as unknown as string[], exact: true }],
                    callback: (refs) => {
                        foundRefs = foundRefs.concat(refs);
                    },
                });
            } catch (e) {
                dispatch(explorerActions.setUrlSearchQuery(undefined));
                if (abortSignal.aborted) {
                    return setStatus(Status.Initial);
                } else {
                    return setStatus(Status.Error);
                }
            }

            dispatch(explorerActions.setUrlSearchQuery(undefined));

            const boundingSphere = getTotalBoundingSphere(foundRefs);
            if (boundingSphere) {
                view.camera.controller.zoomTo(boundingSphere);
            }

            const selectionOnly = new URLSearchParams(window.location.search).get("selectionOnly");
            if (selectionOnly === "1") {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
            } else if (selectionOnly === "2") {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            } else {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            }

            setStatus(Status.Initial);
            setAllSelected(true);
            dispatch(renderActions.setMainObject(foundIds[0]));
        }
    }, [
        urlSearchQuery,
        status,
        search,
        dispatch,
        view,
        abortController,
        dispatchHighlighted,
        scene,
        getSearchPattern,
        setStatus,
        setAllSelected,
    ]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setStatus(Status.Loading);

        try {
            await search();
            setAllHidden(false);
            setAllSelected(false);
            setStatus(Status.Initial);
        } catch {
            setStatus(Status.Error);
        }
    };

    const handleCancel = () => {
        abort();
        setStatus(Status.Initial);
    };

    const loadMore = async () => {
        if (!searchResults?.iterator || status === Status.Loading) {
            return;
        }

        try {
            setStatus(Status.Loading);
            const [nodesToAdd, done] = await iterateAsync({ iterator: searchResults.iterator, count: 25 });

            setSearchResults((state) => (state ? { ...state, nodes: [...state.nodes, ...nodesToAdd] } : undefined));

            if (done) {
                setSearchResults((state) => (state ? { ...state, iterator: undefined } : undefined));
            }
        } catch {
            // nada
        } finally {
            setStatus(Status.Initial);
        }
    };

    const handleScroll = (event: ListOnScrollProps) => {
        const list = listElRef.current;

        if (!list || event.scrollDirection !== "forward") {
            return;
        }

        const isCloseToBottom = list.scrollHeight - event.scrollOffset - list.clientHeight < list.clientHeight / 5;
        if (isCloseToBottom) {
            loadMore();
        }
    };

    return (
        <Box display="flex" flexDirection="column" height={1}>
            {status === Status.Loading ? <LinearProgress /> : null}
            <StyledForm onSubmit={handleSubmit}>
                <ScrollBox maxHeight={92} mb={2} pt={1} px={1}>
                    {advanced ? (
                        advancedInputs.map(({ property, value, exact }, index, array) => (
                            <Box key={index} display="flex" alignItems="center" mb={index === array.length - 1 ? 0 : 1}>
                                <TextField
                                    autoComplete="novorender-property-name"
                                    autoFocus={index === array.length - 1}
                                    id={`advanced-search-property-${index}`}
                                    label={"Name"}
                                    fullWidth
                                    value={property}
                                    onChange={(e) =>
                                        setAdvancedInputs((inputs) =>
                                            inputs.map((input, idx) =>
                                                idx === index ? { ...input, property: e.target.value } : input
                                            )
                                        )
                                    }
                                />
                                <TextField
                                    autoComplete="novorender-property-value"
                                    id={`advanced-search-value-${index}`}
                                    label={"Value"}
                                    fullWidth
                                    value={value}
                                    onChange={(e) =>
                                        setAdvancedInputs((inputs) =>
                                            inputs.map((input, idx) =>
                                                idx === index ? { ...input, value: e.target.value } : input
                                            )
                                        )
                                    }
                                />
                                <Box mx={1}>
                                    <AdvancedSearchModifier
                                        title="Exact"
                                        onClick={() =>
                                            setAdvancedInputs((inputs) =>
                                                inputs.map((input, idx) =>
                                                    idx === index ? { ...input, exact: !input.exact } : input
                                                )
                                            )
                                        }
                                        active={exact}
                                        size="small"
                                    >
                                        <DragHandleIcon fontSize="small" />
                                    </AdvancedSearchModifier>
                                </Box>
                                <AdvancedSearchModifier
                                    title="Remove"
                                    onClick={() => {
                                        if (advancedInputs.length > 1) {
                                            setAdvancedInputs((inputs) =>
                                                inputs.filter((_input, idx) => idx !== index)
                                            );
                                        } else {
                                            setAdvancedInputs([{ property: "", value: "", exact: true }]);
                                            toggleAdvanced();
                                        }
                                    }}
                                    size="small"
                                >
                                    <CancelIcon fontSize="small" />
                                </AdvancedSearchModifier>
                            </Box>
                        ))
                    ) : (
                        <TextField
                            autoComplete="novorender-simple-search"
                            autoFocus
                            id="simple-search-field"
                            label={"Search"}
                            fullWidth
                            value={simpleInput}
                            onChange={(e) => setSimpleInput(e.target.value)}
                        />
                    )}
                </ScrollBox>
                <Box px={1} mb={2}>
                    <FormControlLabel
                        sx={{ marginLeft: 0, marginRight: 4, minHeight: 24 }}
                        control={<Switch checked={advanced} onChange={toggleAdvanced} />}
                        label={
                            <Box ml={0.5} fontSize={14}>
                                Advanced
                            </Box>
                        }
                    />
                    {advanced ? (
                        <Button
                            color="grey"
                            sx={{ padding: 0 }}
                            onClick={() =>
                                setAdvancedInputs((inputs) => [...inputs, { property: "", value: "", exact: true }])
                            }
                        >
                            <AddCircleIcon />
                            <Box ml={0.5}>Add criteria</Box>
                        </Button>
                    ) : null}
                </Box>
                <Box px={1} display="flex">
                    <Button
                        color="grey"
                        type="button"
                        variant="outlined"
                        onClick={handleCancel}
                        disabled={status !== Status.Loading}
                        fullWidth
                        sx={{ marginRight: 1 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        fullWidth
                        disabled={status === Status.Loading}
                        color="primary"
                        variant="contained"
                    >
                        Search
                    </Button>
                </Box>
            </StyledForm>
            <ScrollBox flex={"1 1 100%"}>
                {status === Status.Error ? (
                    <Box px={1} pt={1}>
                        Something went wrong with the search.
                    </Box>
                ) : searchResults ? (
                    <>
                        <NodeList
                            CustomParent={({ style }: { style: CSSProperties }) => (
                                <CustomParentNode
                                    style={style}
                                    abortController={abortController}
                                    searchPatterns={previousSearchPattern.current}
                                    loading={status === Status.Loading}
                                    setLoading={(loading: boolean) =>
                                        setStatus(loading ? Status.Loading : Status.Initial)
                                    }
                                    allSelected={allSelected}
                                    setAllSelected={setAllSelected}
                                    allHidden={allHidden}
                                    setAllHidden={setAllHidden}
                                />
                            )}
                            nodes={searchResults.nodes}
                            onScroll={handleScroll}
                            outerRef={listElRef}
                            loading={status === Status.Loading}
                            setLoading={(loading: boolean) => setStatus(loading ? Status.Loading : Status.Initial)}
                            abortController={abortController}
                        />
                    </>
                ) : null}
            </ScrollBox>
        </Box>
    );
}

// checked minstekrav? sjekk results.length <= highlighted/hidden.length

function CustomParentNode({
    style,
    abortController,
    searchPatterns,
    loading,
    setLoading,
    allSelected,
    setAllSelected,
    allHidden,
    setAllHidden,
}: {
    style: CSSProperties;
    abortController: React.MutableRefObject<AbortController>;
    searchPatterns: string | SearchPattern[] | undefined;
    loading: boolean;
    setLoading: (loading: boolean) => void;
    allSelected: boolean;
    setAllSelected: (state: boolean) => void;
    allHidden: boolean;
    setAllHidden: (state: boolean) => void;
}) {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();

    const search = async (callback: (result: ObjectId[]) => void) => {
        if (!searchPatterns) {
            return;
        }

        const abortSignal = abortController.current.signal;

        setLoading(true);

        try {
            await searchDeepByPatterns({
                scene,
                searchPatterns,
                abortSignal,
                callback,
            });
        } catch {}

        setLoading(false);
    };

    const select = async () => {
        await search((ids) => dispatchHighlighted(highlightActions.add(ids)));
        setAllSelected(true);
    };

    const unSelect = async () => {
        await search((ids) => dispatchHighlighted(highlightActions.remove(ids)));
        setAllSelected(false);
    };

    const hide = async () => {
        await search((ids) => dispatchHidden(hiddenGroupActions.add(ids)));
        setAllHidden(true);
    };

    const show = async () => {
        await search((ids) => dispatchHidden(hiddenGroupActions.remove(ids)));
        setAllHidden(false);
    };

    const handleChange = (type: "select" | "hide") => (e: ChangeEvent<HTMLInputElement>) => {
        if (loading) {
            return;
        }

        if (type === "select") {
            return e.target.checked ? select() : unSelect();
        }

        return e.target.checked ? hide() : show();
    };

    return (
        <ListItem disableGutters button style={{ ...style }} sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <Box display="flex" width={1} alignItems="center">
                <Box display="flex" alignItems="center" width={0} flex={"1 1 100%"}>
                    <Tooltip title={"All results"}>
                        <Typography color={"textSecondary"} noWrap={true}>
                            All results
                        </Typography>
                    </Tooltip>
                </Box>
                <Checkbox
                    aria-label="Highlight all results"
                    size="small"
                    onChange={handleChange("select")}
                    checked={allSelected}
                    onClick={(e) => e.stopPropagation()}
                />
                <Checkbox
                    aria-label="Toggle visibility of all results"
                    size="small"
                    icon={<VisibilityIcon />}
                    checkedIcon={<VisibilityIcon color="disabled" />}
                    onChange={handleChange("hide")}
                    checked={allHidden}
                    onClick={(e) => e.stopPropagation()}
                />
            </Box>
        </ListItem>
    );
}
