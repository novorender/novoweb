import { AddCircle } from "@mui/icons-material";
import { Box, Button, FormControlLabel } from "@mui/material";
import { HierarcicalObjectReference, SearchPattern } from "@novorender/webgl-api";
import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ListOnScrollProps } from "react-window";

import { useAppSelector } from "app";
import {
    AdvancedSearchInputs,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    Switch,
    TextField,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { NodeList } from "features/nodeList/nodeList";
import WidgetList from "features/widgetList/widgetList";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized, selectUrlSearchQuery } from "slices/explorer";
import { iterateAsync } from "utils/search";

import { CustomParentNode } from "./customParentNode";

enum Status {
    Initial,
    Loading,
    Error,
}

export default function Search() {
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const minimized = useAppSelector(selectMinimized) === featuresConfig.search.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.search.key);
    const urlSearchQuery = useAppSelector(selectUrlSearchQuery);

    const [menuOpen, toggleMenu] = useToggle();
    const [advanced, toggleAdvanced] = useToggle(urlSearchQuery ? Array.isArray(urlSearchQuery) : false);
    const [simpleInput, setSimpleInput] = useState(typeof urlSearchQuery === "string" ? urlSearchQuery : "");
    const [advancedInputs, setAdvancedInputs] = useState(
        Array.isArray(urlSearchQuery) ? urlSearchQuery : [{ property: "", value: "", exact: true }]
    );

    const [allSelected, setAllSelected] = useState(false);
    const [allHidden, setAllHidden] = useState(false);
    const [status, setStatus] = useState(Status.Initial);
    const [searchResults, setSearchResults] = useState<
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
        if (urlSearchQuery) {
            search();
        }
    }, [urlSearchQuery, search]);

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
