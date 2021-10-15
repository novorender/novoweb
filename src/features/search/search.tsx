import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ListOnScrollProps } from "react-window";
import { makeStyles, createStyles, Box, Button, FormControlLabel } from "@material-ui/core";
import { HierarcicalObjectReference, Scene, View } from "@novorender/webgl-api";

import { TextField, Switch, LinearProgress, ScrollBox } from "components";
import { NodeList } from "features/nodeList";
import { NodeType } from "features/modelTree/modelTree";
import { useToggle } from "hooks/useToggle";
import { useMountedState } from "hooks/useMountedState";
import { useAbortController } from "hooks/useAbortController";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { ObjectVisibility, renderActions } from "slices/renderSlice";
import { explorerActions, selectUrlSearchQuery } from "slices/explorerSlice";
import { iterateAsync, searchByPatterns } from "utils/search";
import { extractObjectIds, getTotalBoundingSphere } from "utils/objectData";

import AddCircleIcon from "@material-ui/icons/AddCircle";
import DragHandleIcon from "@material-ui/icons/DragHandle";
import CancelIcon from "@material-ui/icons/Cancel";

enum Status {
    Initial,
    Loading,
    Error,
}

const useSearchStyles = makeStyles((theme) =>
    createStyles({
        form: {
            margin: `${theme.spacing(1)}px 0`,
            boxShadow: theme.customShadows.widgetHeader,
            paddingBottom: theme.spacing(1),
        },
        switchFormControl: {
            marginLeft: 0,
            marginRight: theme.spacing(4),
        },
        advancedSearchModifier: {
            width: 24,
            height: 24,
            minWidth: 0,
            flex: "0 0 auto",
            padding: theme.spacing(1),
            color: theme.palette.common.white,
            background: theme.palette.secondary.light,
            "&:hover": {
                background: theme.palette.secondary.main,

                "&.active": {
                    background: theme.palette.primary.dark,
                },
            },

            "&.active": {
                background: theme.palette.primary.main,
            },
        },
        searchButton: {
            textTransform: "none",
        },
        cancelButton: {
            marginRight: theme.spacing(1),
            textTransform: "none",
            border: `1px solid ${theme.palette.grey[300]}`,

            "&:not(:disabled)": {
                border: `1px solid ${theme.palette.grey[600]}`,
            },

            "&:hover": {
                background: theme.palette.grey[600],
                color: theme.palette.common.white,
            },
        },
        addCriteria: {
            padding: 0,
        },
    })
);

type Props = {
    scene: Scene;
    view: View;
};

export function Search({ scene, view }: Props) {
    const classes = useSearchStyles();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    const urlSearchQuery = useAppSelector(selectUrlSearchQuery);

    const [advanced, toggleAdvanced] = useToggle(Array.isArray(urlSearchQuery));
    const [simpleInput, setSimpleInput] = useState(typeof urlSearchQuery === "string" ? urlSearchQuery : "");
    const [advancedInputs, setAdvancedInputs] = useState(
        Array.isArray(urlSearchQuery) ? urlSearchQuery : [{ property: "", value: "", exact: true }]
    );

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

        try {
            const iterator = scene.search({ searchPattern }, abortSignal);
            const [nodes, done] = await iterateAsync({ iterator, abortSignal, count: 25 });

            setSearchResults({ nodes, iterator: !done ? iterator : undefined });
            return nodes;
        } catch (e) {
            if (!abortSignal.aborted) {
                throw e;
            }
        }
    }, [abortController, setSearchResults, scene, getSearchPattern]);

    const handleNodeClick = useCallback(
        async (node: HierarcicalObjectReference) => {
            dispatch(renderActions.setMainObject(node.id));

            if (node.type === NodeType.Leaf) {
                dispatchHighlighted(highlightActions.setIds([node.id]));
            } else {
                dispatchHighlighted(highlightActions.setIds([]));
            }
        },
        [dispatch, dispatchHighlighted]
    );

    useEffect(() => {
        if (urlSearchQuery && status === Status.Initial) {
            handleUrlSearch();
        }

        async function handleUrlSearch() {
            dispatch(explorerActions.setUrlSearchQuery(undefined));

            const abortSignal = abortController.current.signal;
            const searchPatterns = getSearchPattern();

            if (!searchPatterns) {
                return;
            }

            let result = [] as HierarcicalObjectReference[];

            setStatus(Status.Loading);

            try {
                // Shallow, limited search to display results in widget
                search();

                // Deep search to highlight and fly to
                await searchByPatterns({
                    scene,
                    searchPatterns,
                    abortSignal,
                    callbackInterval: 1000,
                    deep: true,
                    callback: (refs) => {
                        result = result.concat(refs);
                        dispatchHighlighted(highlightActions.add(extractObjectIds(refs)));
                    },
                });
            } catch (e) {
                if (abortSignal.aborted) {
                    return setStatus(Status.Initial);
                } else {
                    return setStatus(Status.Error);
                }
            }

            const boundingSphere = getTotalBoundingSphere(result);
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
            dispatch(renderActions.setMainObject(result[0].id));
        }
    }, [
        urlSearchQuery,
        status,
        search,
        dispatch,
        view,
        handleNodeClick,
        abortController,
        dispatchHighlighted,
        scene,
        getSearchPattern,
        setStatus,
    ]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setStatus(Status.Loading);

        try {
            await search();
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
            <form className={classes.form} onSubmit={handleSubmit}>
                <ScrollBox maxHeight={92} mb={2} pt={1} px={1}>
                    {advanced ? (
                        advancedInputs.map(({ property, value, exact }, index, array) => (
                            <Box key={index} display="flex" alignItems="center" mb={index === array.length - 1 ? 0 : 1}>
                                <TextField
                                    autoComplete="novorender-property-name"
                                    autoFocus={index === array.length - 1}
                                    id={`advanced-search-property-${index}`}
                                    label={"Name"}
                                    variant="outlined"
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
                                    variant="outlined"
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
                                    <Button
                                        title="Exact"
                                        onClick={() =>
                                            setAdvancedInputs((inputs) =>
                                                inputs.map((input, idx) =>
                                                    idx === index ? { ...input, exact: !input.exact } : input
                                                )
                                            )
                                        }
                                        className={`${classes.advancedSearchModifier} ${exact ? "active" : ""}`}
                                        size="small"
                                    >
                                        <DragHandleIcon fontSize="small" />
                                    </Button>
                                </Box>
                                <Button
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
                                    className={`${classes.advancedSearchModifier}`}
                                    size="small"
                                >
                                    <CancelIcon fontSize="small" />
                                </Button>
                            </Box>
                        ))
                    ) : (
                        <TextField
                            autoComplete="novorender-simple-search"
                            autoFocus
                            id="simple-search-field"
                            label={"Search"}
                            variant="outlined"
                            fullWidth
                            value={simpleInput}
                            onChange={(e) => setSimpleInput(e.target.value)}
                        />
                    )}
                </ScrollBox>
                <Box px={1} mb={2}>
                    <FormControlLabel
                        className={classes.switchFormControl}
                        control={<Switch checked={advanced} onChange={toggleAdvanced} />}
                        label={
                            <Box ml={0.5} fontSize={14}>
                                Advanced
                            </Box>
                        }
                    />
                    {advanced ? (
                        <Button
                            className={classes.addCriteria}
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
                        type="button"
                        onClick={handleCancel}
                        disabled={status !== Status.Loading}
                        fullWidth
                        className={classes.cancelButton}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        fullWidth
                        disabled={status === Status.Loading}
                        className={classes.searchButton}
                        color="primary"
                        variant="contained"
                    >
                        Search
                    </Button>
                </Box>
            </form>
            <ScrollBox flex={"1 1 100%"}>
                {status === Status.Error ? (
                    <Box px={1} pt={1}>
                        Something went wrong with the search.
                    </Box>
                ) : searchResults ? (
                    <NodeList
                        nodes={searchResults.nodes}
                        onScroll={handleScroll}
                        outerRef={listElRef}
                        loading={status === Status.Loading}
                        setLoading={(loading: boolean) => setStatus(loading ? Status.Loading : Status.Initial)}
                        abortController={abortController}
                        scene={scene}
                    />
                ) : null}
            </ScrollBox>
        </Box>
    );
}
