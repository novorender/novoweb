import {
    useTheme,
    Box,
    ListItemProps,
    ListItem,
    Typography,
    Checkbox,
    createStyles,
    makeStyles,
} from "@material-ui/core";
import { useRef, useEffect, ChangeEvent, ChangeEventHandler, MouseEventHandler } from "react";
import { useDispatch } from "react-redux";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList, ListOnScrollProps } from "react-window";
import {
    HierarcicalObjectReference,
    Scene,
    HierarcicalObjectReference as HierarchicalObjectReference,
} from "@novorender/webgl-api";

import { Divider, LinearProgress, Tooltip, useScrollBoxStyles } from "components";
import { Breadcrumbs } from "features/breadcrumbs";
import { useAppSelector } from "app/store";
import { renderActions, selectHiddenObjects, selectMainObject, selectDefaultHighlighted } from "slices/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { getObjectData, iterateAsync, searchByParentPath, searchFirstObjectAtPath } from "utils/search";

import FolderIcon from "@material-ui/icons/Folder";
import EcoIcon from "@material-ui/icons/Eco";
import VisibilityIcon from "@material-ui/icons/Visibility";
import { extractObjectIds, getObjectNameFromPath, getParentPath } from "utils/objectData";

enum Status {
    Initial,
    Ready,
    Loading,
}

// the NodeType in api does not work with --isolatedModules
export const NodeType = {
    Internal: 0 as any,
    Leaf: 1 as any,
};

type Props = {
    scene: Scene;
};

const useStyles = makeStyles((theme) =>
    createStyles({
        listItemIcon: {
            minWidth: "auto",
            margin: `0 ${theme.spacing(1)}px 0 0`,
        },
        searchButton: {
            textTransform: "none",
            fontWeight: 400,
        },
    })
);

export function ModelTree({ scene }: Props) {
    const scrollBoxStyles = useScrollBoxStyles().box;
    const theme = useTheme();

    const selected = useAppSelector(selectDefaultHighlighted);
    const hidden = useAppSelector(selectHiddenObjects);
    const mainObject = useAppSelector(selectMainObject);
    const dispatch = useDispatch();

    const [status, setStatus] = useMountedState(Status.Initial);
    const [currentDepth, setCurrentDepth] = useMountedState<
        | {
              nodes: HierarchicalObjectReference[];
              path: string;
              iterator: AsyncIterableIterator<HierarchicalObjectReference> | undefined;
          }
        | undefined
    >(undefined);
    const [node, setNode] = useMountedState<HierarchicalObjectReference | undefined>(undefined);

    const [abortController, abort] = useAbortController();
    const listElRef = useRef<HTMLElement | null>(null);
    const listRef = useRef<FixedSizeList | null>(null);

    useEffect(() => {
        abort();
    }, [mainObject, abort]);

    useEffect(() => {
        init();

        async function init() {
            if (mainObject === undefined) {
                setNode(undefined);
                return setStatus(Status.Ready);
            }

            setStatus(Status.Loading);

            try {
                const obj = await getObjectData({ scene, id: mainObject });

                if (!obj) {
                    return setStatus(Status.Ready);
                }

                setNode(obj);
            } catch {
                setStatus(Status.Ready);
            }
        }
    }, [mainObject, scene, setStatus, setNode]);

    useEffect(() => {
        const isSamePath = !currentDepth
            ? false
            : node
            ? node.type === NodeType.Internal
                ? node.path === currentDepth.path
                : getParentPath(node.path) === currentDepth.path
            : currentDepth.path === "";

        if (isSamePath) {
            return setStatus(Status.Ready);
        }

        getCurrentDepth();

        async function getCurrentDepth() {
            setStatus(Status.Loading);
            const parentPath = node ? (node.type === NodeType.Internal ? node.path : getParentPath(node.path)) : "";

            try {
                const iterator = scene.search({ parentPath, descentDepth: 1 });
                const [nodes] = await iterateAsync({ iterator, count: 25 });

                setCurrentDepth({
                    nodes,
                    iterator,
                    path: parentPath,
                });
            } catch {
                // nada
            } finally {
                setStatus(Status.Ready);
            }
        }
    }, [node, currentDepth, scene, setCurrentDepth, setStatus]);

    const setCurrentDepthIterator = (
        iterator: AsyncIterableIterator<HierarchicalObjectReference> | undefined
    ): void => {
        setCurrentDepth((state) => (state ? { ...state, iterator } : undefined));
    };

    const setCurrentDepthNodes = (nodes: HierarchicalObjectReference[]) => {
        setCurrentDepth((state) => (state ? { ...state, nodes } : undefined));
    };

    const loadMore = async () => {
        if (!currentDepth?.iterator || status !== Status.Ready) {
            return;
        }

        try {
            setStatus(Status.Loading);
            const [nodesToAdd, done] = await iterateAsync({ iterator: currentDepth.iterator, count: 25 });

            setCurrentDepthNodes(currentDepth ? [...currentDepth.nodes, ...nodesToAdd] : []);

            if (done) {
                setCurrentDepthIterator(undefined);
            }
        } catch {
            // nada
        } finally {
            setStatus(Status.Ready);
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

    const handleBreadcrumbClick = async (crumbPath = "") => {
        if (crumbPath === currentDepth?.path) {
            return;
        }

        setStatus(Status.Loading);

        if (crumbPath) {
            try {
                const node = await searchFirstObjectAtPath({ scene, path: crumbPath });

                if (node) {
                    dispatch(renderActions.setMainObject(node.id));
                }
            } catch {
                // nada
            }
        } else {
            dispatch(renderActions.setMainObject(undefined));
        }

        setStatus(Status.Ready);
    };

    const handleNodeClick = async (node: HierarchicalObjectReference, isSelected: boolean) => {
        if (node.type === NodeType.Internal) {
            dispatch(renderActions.setMainObject(node.id));
        } else if (node.type === NodeType.Leaf) {
            isSelected ? unSelect(node) : select(node);
        }
    };

    const handleChange =
        (type: "select" | "hide", node: HierarcicalObjectReference) => (e: ChangeEvent<HTMLInputElement>) => {
            if (status === Status.Loading) {
                return;
            }

            if (type === "select") {
                return e.target.checked ? select(node) : unSelect(node);
            }

            return e.target.checked ? hide(node) : show(node);
        };

    const select = async (node: HierarchicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            dispatch(renderActions.selectObjects([node.id]));
            dispatch(renderActions.setMainObject(node.id));
            return;
        }

        setStatus(Status.Loading);
        const abortSignal = abortController.current.signal;

        try {
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatch(renderActions.selectObjects(extractObjectIds(refs))),
                callbackInterval: 1000,
            });

            if (!abortSignal.aborted) {
                dispatch(renderActions.selectObjects([node.id]));
                setStatus(Status.Ready);
            }
        } catch {
            if (!abortSignal.aborted) {
                setStatus(Status.Ready);
            }
        }
    };

    const unSelect = async (node: HierarchicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            return dispatch(renderActions.unSelectObjects([node.id]));
        }

        dispatch(renderActions.unSelectObjects([node.id]));

        setStatus(Status.Loading);
        const abortSignal = abortController.current.signal;

        try {
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatch(renderActions.unSelectObjects(extractObjectIds(refs))),
                callbackInterval: 1000,
            });
        } catch {
            // nada
        } finally {
            if (!abortSignal.aborted) {
                setStatus(Status.Ready);
            }
        }
    };

    const hide = async (node: HierarchicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            return dispatch(renderActions.hideObjects([node.id]));
        }

        setStatus(Status.Loading);
        const abortSignal = abortController.current.signal;

        try {
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatch(renderActions.hideObjects(extractObjectIds(refs))),
                callbackInterval: 1000,
            });

            if (!abortSignal.aborted) {
                dispatch(renderActions.hideObjects([node.id]));
                setStatus(Status.Ready);
            }
        } catch {
            if (!abortSignal.aborted) {
                setStatus(Status.Ready);
            }
        }
    };

    const show = async (node: HierarchicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            return dispatch(renderActions.showObjects([node.id]));
        }

        dispatch(renderActions.showObjects([node.id]));

        setStatus(Status.Loading);
        const abortSignal = abortController.current.signal;

        try {
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatch(renderActions.showObjects(extractObjectIds(refs))),
                callbackInterval: 1000,
            });
        } catch {
            // nada
        } finally {
            if (!abortSignal.aborted) {
                setStatus(Status.Ready);
            }
        }
    };

    return (
        <Box display="flex" flexDirection="column" height={1}>
            {status === Status.Loading ? <LinearProgress /> : null}
            {currentDepth ? (
                <>
                    <Box px={1}>
                        <Breadcrumbs
                            id="scene-tree-breadcrumbs"
                            path={currentDepth.path}
                            onClick={handleBreadcrumbClick}
                            rootName="Scene"
                        />
                        <Divider />
                    </Box>
                    <Box flex={"1 1 100%"}>
                        <AutoSizer>
                            {({ height, width }) => (
                                <FixedSizeList
                                    style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                                    className={scrollBoxStyles}
                                    onScroll={handleScroll}
                                    height={height}
                                    width={width}
                                    itemSize={32}
                                    overscanCount={3}
                                    itemCount={currentDepth.nodes ? currentDepth.nodes.length : 0}
                                    ref={listRef}
                                    outerRef={listElRef}
                                >
                                    {({ index, style }) => {
                                        const node = currentDepth.nodes[index];

                                        if (!node) {
                                            return null;
                                        }

                                        const isSelected = selected.includes(node.id);
                                        const isHidden = hidden.includes(node.id);

                                        return (
                                            <Node
                                                style={style}
                                                node={node}
                                                selected={isSelected}
                                                hidden={isHidden}
                                                onToggleSelect={handleChange("select", node)}
                                                onToggleHide={handleChange("hide", node)}
                                                onNodeClick={handleNodeClick}
                                            />
                                        );
                                    }}
                                </FixedSizeList>
                            )}
                        </AutoSizer>
                    </Box>
                </>
            ) : null}
        </Box>
    );
}

function Node({
    node,
    selected,
    hidden,
    onToggleSelect,
    onToggleHide,
    onNodeClick,
    ...props
}: {
    node: HierarchicalObjectReference;
    selected: boolean;
    hidden: boolean;
    onToggleSelect: ChangeEventHandler<HTMLInputElement>;
    onToggleHide: ChangeEventHandler<HTMLInputElement>;
    onNodeClick: (node: HierarchicalObjectReference, isSelected: boolean) => void;
} & ListItemProps) {
    const theme = useTheme();
    const classes = useStyles();

    const stopPropagation: MouseEventHandler = (e) => {
        e.stopPropagation();
    };

    const pathName = getObjectNameFromPath(node.path);

    return (
        <ListItem
            disableGutters
            button
            key={node.id}
            style={{ ...props.style, paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
            onClick={() => onNodeClick(node, selected)}
        >
            <Box display="flex" width={1} alignItems="center">
                <Box display="flex" alignItems="center" width={0} flex={"1 1 100%"}>
                    {node.type === NodeType.Internal ? (
                        <FolderIcon className={classes.listItemIcon} fontSize="small" />
                    ) : (
                        <EcoIcon className={classes.listItemIcon} fontSize="small" />
                    )}
                    <Tooltip title={pathName} interactive>
                        <Typography noWrap={true}>{pathName}</Typography>
                    </Tooltip>
                </Box>
                <Checkbox
                    aria-label="Select node"
                    size="small"
                    checked={selected}
                    onChange={onToggleSelect}
                    onClick={stopPropagation}
                />
                <Checkbox
                    aria-label="Toggle node visibility"
                    size="small"
                    icon={<VisibilityIcon />}
                    checkedIcon={<VisibilityIcon color="disabled" />}
                    checked={hidden}
                    onChange={onToggleHide}
                    onClick={stopPropagation}
                />
            </Box>
        </ListItem>
    );
}
