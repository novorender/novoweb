import { AddCircle, Visibility } from "@mui/icons-material";
import { Box, Button, Checkbox, FormControlLabel, ListItemButton, Typography } from "@mui/material";
import { HierarcicalObjectReference, ObjectId, SearchPattern } from "@novorender/webgl-api";
import { ChangeEvent, CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ListOnScrollProps } from "react-window";

import { useAppDispatch, useAppSelector } from "app/store";
import {
    AdvancedSearchInputs,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    Switch,
    TextField,
    Tooltip,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted, useLazyHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { NodeList } from "features/nodeList/nodeList";
import { CameraType, ObjectVisibility, renderActions } from "features/render/renderSlice";
import WidgetList from "features/widgetList/widgetList";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { explorerActions, selectMaximized, selectMinimized, selectUrlSearchQuery } from "slices/explorerSlice";
import { getTotalBoundingSphere } from "utils/objectData";
import { batchedPropertySearch, iterateAsync, searchDeepByPatterns } from "utils/search";

enum Status {
    Initial,
    Loading,
    Error,
}

export default function Search() {
    const dispatch = useAppDispatch();
    const highlighted = useLazyHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const urlSearchQuery = useAppSelector(selectUrlSearchQuery);

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.search.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.search.key);
    const [advanced, toggleAdvanced] = useToggle(urlSearchQuery ? Array.isArray(urlSearchQuery) : false);
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
    const [focusedInputIdx, setFocusedInputIdx] = useState<number>(-1);
    const focusedInput = advancedInputs[focusedInputIdx];
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
            const iterator = db.search({ searchPattern }, abortSignal);

            const [nodes, done] = await iterateAsync({ iterator, abortSignal, count: 50 });

            setSearchResults({ nodes, iterator: !done ? iterator : undefined });
            return nodes;
        } catch (e) {
            if (!abortSignal.aborted) {
                throw e;
            }
        }
    }, [abortController, setSearchResults, db, getSearchPattern]);

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
                    db,
                    searchPatterns,
                    abortSignal,
                    callback: (ids) => {
                        foundIds = foundIds.concat(ids);
                        dispatchHighlighted(highlightActions.add(ids));
                    },
                });

                if (foundIds.length) {
                    foundRefs = await batchedPropertySearch({
                        property: "id",
                        value: foundIds.map((id) => String(id)),
                        db,
                        abortSignal,
                    });
                }
            } catch (e) {
                dispatch(explorerActions.setUrlSearchQuery(undefined));
                if (abortSignal.aborted) {
                    return setStatus(Status.Initial);
                } else {
                    return setStatus(Status.Error);
                }
            }

            dispatch(explorerActions.setUrlSearchQuery(undefined));

            if (foundRefs.length) {
                const boundingSphere = getTotalBoundingSphere(foundRefs);
                if (boundingSphere) {
                    dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: boundingSphere }));
                }
            }

            const selectionOnly = new URLSearchParams(window.location.search).get("selectionOnly");

            if (selectionOnly === "1") {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
            } else if (selectionOnly === "2") {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            } else if (selectionOnly === "3") {
                dispatchSelectionBasket(selectionBasketActions.add(highlighted.current.idArr));
                dispatchHighlighted(highlightActions.setIds([]));
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            } else {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            }

            setStatus(Status.Initial);
            setAllSelected(selectionOnly !== "3");
            dispatch(renderActions.setMainObject(foundIds[0]));
        }
    }, [
        urlSearchQuery,
        status,
        highlighted,
        search,
        dispatch,
        dispatchSelectionBasket,
        abortController,
        dispatchHighlighted,
        db,
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
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.search} disableShadow={menuOpen}>
                    {!menuOpen && !minimized ? (
                        <Box component="form" sx={{ mt: 1 }} onSubmit={handleSubmit}>
                            {advanced ? (
                                <AdvancedSearchInputs
                                    inputs={advancedInputs}
                                    setInputs={setAdvancedInputs}
                                    setFocusedInputIdx={(input) => setFocusedInputIdx(input)}
                                />
                            ) : (
                                <TextField
                                    autoComplete="novorender-simple-search"
                                    autoFocus
                                    id="simple-search-field"
                                    label={"Search"}
                                    fullWidth
                                    value={simpleInput}
                                    onChange={(e) => setSimpleInput(e.target.value)}
                                    sx={{ mb: 2, pt: 1 }}
                                />
                            )}

                            <Box mb={2}>
                                <FormControlLabel
                                    sx={{ ml: 0, mr: 3, minHeight: 24 }}
                                    control={
                                        <Switch name="advanced" checked={advanced} onChange={() => toggleAdvanced()} />
                                    }
                                    label={
                                        <Box ml={0.5} fontSize={14}>
                                            Advanced
                                        </Box>
                                    }
                                />
                                {advanced ? (
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
                                ) : null}
                            </Box>
                            <Box display="flex" mb={1}>
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
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" height={1}>
                    {status === Status.Loading ? (
                        <Box position="relative">
                            <LinearProgress />
                        </Box>
                    ) : null}
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
                                    setLoading={(loading: boolean) =>
                                        setStatus(loading ? Status.Loading : Status.Initial)
                                    }
                                    abortController={abortController}
                                />
                            </>
                        ) : null}
                    </ScrollBox>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.search.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

export function CustomParentNode({
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
        state: { db },
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
                db,
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
        await search((ids) => dispatchHidden(hiddenActions.add(ids)));
        setAllHidden(true);
    };

    const show = async () => {
        await search((ids) => dispatchHidden(hiddenActions.remove(ids)));
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
        <ListItemButton disableGutters style={{ ...style }} sx={{ paddingLeft: 1, paddingRight: 1 }}>
            <Box display="flex" width={1} alignItems="center">
                <Box display="flex" alignItems="center" width={0} flex={"1 1 100%"}>
                    <Tooltip title={"All results"}>
                        <Typography color={"textSecondary"} noWrap={true}>
                            All results
                        </Typography>
                    </Tooltip>
                </Box>
                <Checkbox
                    name="Toggle highlight of all results"
                    aria-label="Toggle highlight of all results"
                    size="small"
                    onChange={handleChange("select")}
                    checked={allSelected}
                    onClick={(e) => e.stopPropagation()}
                />
                <Checkbox
                    name="Toggle visibility of all results"
                    aria-label="Toggle visibility of all results"
                    size="small"
                    icon={<Visibility />}
                    checkedIcon={<Visibility color="disabled" />}
                    onChange={handleChange("hide")}
                    checked={allHidden}
                    onClick={(e) => e.stopPropagation()}
                />
            </Box>
        </ListItemButton>
    );
}
