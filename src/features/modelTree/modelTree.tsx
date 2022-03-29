import { Box } from "@mui/material";
import { useRef, useEffect } from "react";
import { ListOnScrollProps } from "react-window";
import { HierarcicalObjectReference } from "@novorender/webgl-api";

import { Divider, LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { Breadcrumbs } from "features/breadcrumbs";
import { NodeList } from "features/nodeList";
import { WidgetList } from "features/widgetList";

import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectMainObject } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { getObjectData, iterateAsync, searchFirstObjectAtPath } from "utils/search";
import { getParentPath } from "utils/objectData";
import { featuresConfig } from "config/features";

enum Status {
    Ready,
    Loading,
}

// the NodeType in api does not work with --isolatedModules
export const NodeType = {
    Internal: 0,
    Leaf: 1,
};

type TreeLevel = {
    nodes: HierarcicalObjectReference[];
    path: string;
    parentNode: HierarcicalObjectReference | undefined;
    iterator: AsyncIterableIterator<HierarcicalObjectReference> | undefined;
};

const rootNode = {
    type: "root",
    name: "Scene",
    path: "",
    id: "root",
} as const;

type RootNode = typeof rootNode;

export function ModelTree() {
    const mainObject = useAppSelector(selectMainObject);
    const dispatch = useAppDispatch();

    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle(false);
    const [status, setStatus] = useMountedState(Status.Loading);
    const [currentDepth, setCurrentDepth] = useMountedState<TreeLevel | undefined>(undefined);
    const [currentNode, setCurrentNode] = useMountedState<HierarcicalObjectReference | RootNode | undefined>(undefined);

    const [abortController, abort] = useAbortController();
    const isLoadingMore = useRef(false);
    const listRef = useRef<any>(null);
    const listElRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        abort();
    }, [mainObject, abort]);

    useEffect(() => {
        init();

        async function init() {
            if (mainObject === undefined) {
                setCurrentNode(rootNode);
                return setStatus(Status.Ready);
            }

            setStatus(Status.Loading);

            try {
                const obj = await getObjectData({ scene, id: mainObject });

                if (!obj) {
                    return setStatus(Status.Ready);
                }

                setCurrentNode(obj);
            } catch {
                setStatus(Status.Ready);
            }
        }
    }, [mainObject, scene, setStatus, setCurrentNode]);

    useEffect(() => {
        if (!currentNode) {
            return;
        }

        const isSamePath = !currentDepth
            ? false
            : currentNode.type === NodeType.Internal || currentNode.type === "root"
            ? currentNode.path === currentDepth.path
            : getParentPath(currentNode.path) === currentDepth.path;

        if (isSamePath) {
            if (currentNode.type === NodeType.Leaf && currentDepth) {
                const indexInCurrentList = currentDepth.nodes.findIndex((_node) => _node.id === currentNode.id);
                const shouldPreprendCurrentList = indexInCurrentList === -1 && currentNode.type === NodeType.Leaf;

                if (shouldPreprendCurrentList) {
                    setCurrentDepth((state) =>
                        state
                            ? {
                                  ...state,
                                  nodes: [currentNode, ...state.nodes],
                              }
                            : state
                    );
                } else if (!isLoadingMore.current) {
                    // add one because we include parent node in list too
                    listRef.current?.scrollToItem(indexInCurrentList + 1);
                }
            }
            return setStatus(Status.Ready);
        }

        getCurrentDepth(currentNode);

        async function getCurrentDepth(node: HierarcicalObjectReference | RootNode) {
            setStatus(Status.Loading);

            const parentPath =
                node.type === NodeType.Internal || node.type === rootNode.type ? node.path : getParentPath(node.path);
            const parentNode =
                node.type === NodeType.Internal
                    ? node
                    : node.type === rootNode.type
                    ? undefined
                    : await searchFirstObjectAtPath({ scene, path: parentPath });

            try {
                const iterator = scene.search({ parentPath, descentDepth: 1 });
                const [nodes] = await iterateAsync({ iterator, count: 100 });

                setCurrentDepth({
                    parentNode,
                    nodes:
                        node.type === NodeType.Leaf
                            ? nodes.find((_node) => _node.id === node.id)
                                ? nodes
                                : [node, ...nodes]
                            : nodes,
                    iterator,
                    path: parentPath,
                });
            } catch {
                // nada
            } finally {
                setStatus(Status.Ready);
            }
        }
    }, [currentNode, currentDepth, scene, setCurrentDepth, setStatus]);

    const loadMore = async () => {
        if (!currentDepth || !currentDepth.iterator || status !== Status.Ready) {
            return;
        }

        try {
            setStatus(Status.Loading);
            const [nodesToAdd, done] = await iterateAsync({ iterator: currentDepth.iterator, count: 50 });

            setCurrentDepth((state) =>
                state
                    ? {
                          ...state,
                          nodes: [
                              ...state.nodes,
                              ...nodesToAdd.filter(
                                  (newNode) => currentDepth.nodes.find((_node) => _node.id === newNode.id) === undefined
                              ),
                          ],
                          iterator: done ? undefined : state.iterator,
                      }
                    : state
            );
        } catch {
            // nada
        } finally {
            setStatus(Status.Ready);
        }
    };

    const handleScroll = async (event: ListOnScrollProps) => {
        const list = listElRef.current;

        if (!list || event.scrollDirection !== "forward") {
            return;
        }

        const isCloseToBottom = list.scrollHeight - event.scrollOffset - list.clientHeight < list.clientHeight / 5;
        if (isCloseToBottom) {
            isLoadingMore.current = true;

            await loadMore();

            setTimeout(() => {
                isLoadingMore.current = false;
            }, 150);
        }
    };

    const handleBreadcrumbClick = async (crumbPath = "") => {
        if (crumbPath === currentDepth?.path) {
            return;
        }

        if (crumbPath) {
            try {
                setStatus(Status.Loading);
                const node = await searchFirstObjectAtPath({ scene, path: crumbPath });

                if (node) {
                    dispatch(renderActions.setMainObject(node.id));
                }

                setStatus(Status.Ready);
            } catch {
                // nada
            }
        } else {
            dispatch(renderActions.setMainObject(undefined));
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized}>
                <WidgetHeader minimized={minimized} toggleMinimize={toggleMinimize} widget={featuresConfig.modelTree} />
                <Box display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" height={1}>
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
                            <Box flex={"1 1 100%"} data-test="model-tree-list-container">
                                {currentDepth?.nodes ? (
                                    <NodeList
                                        parentNode={currentDepth.parentNode}
                                        nodes={currentDepth.nodes}
                                        onScroll={handleScroll}
                                        ref={listRef}
                                        outerRef={listElRef}
                                        loading={status === Status.Loading}
                                        setLoading={(loading: boolean) =>
                                            setStatus(loading ? Status.Loading : Status.Ready)
                                        }
                                        abortController={abortController}
                                    />
                                ) : null}
                            </Box>
                        </>
                    ) : null}
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.modelTree.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.modelTree.key}-widget-menu-fab`}
            />
        </>
    );
}
