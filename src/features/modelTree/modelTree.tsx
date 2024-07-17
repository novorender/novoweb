import { ContentCopy } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { useEffect, useRef, useState } from "react";
import { FixedSizeList, ListOnScrollProps } from "react-window";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { Breadcrumbs } from "features/breadcrumbs";
import { NodeList } from "features/nodeList/nodeList";
import { renderActions, selectMainObject } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { NodeType } from "types/misc";
import { getParentPath } from "utils/objectData";
import { getObjectData, iterateAsync, searchFirstObjectAtPath } from "utils/search";

enum Status {
    Ready,
    Loading,
}

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

export default function ModelTree() {
    const mainObject = useAppSelector(selectMainObject);
    const dispatch = useAppDispatch();

    const {
        state: { db, view },
    } = useExplorerGlobals(true);

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.modelTree.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.modelTree.key);
    const [status, setStatus] = useState(Status.Loading);
    const [currentDepth, setCurrentDepth] = useState<TreeLevel>();
    const [currentNode, setCurrentNode] = useState<HierarcicalObjectReference | RootNode>();

    const [abortController, abort] = useAbortController();
    const isLoadingMore = useRef(false);
    const listRef = useRef<FixedSizeList>(null);
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
                const obj = await getObjectData({ db, id: mainObject, view });

                if (!obj) {
                    return setStatus(Status.Ready);
                }

                setCurrentNode(obj);
            } catch {
                setStatus(Status.Ready);
            }
        }
    }, [mainObject, db, setStatus, setCurrentNode, view]);

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
                    : await searchFirstObjectAtPath({ db, path: parentPath });

            try {
                const iterator = db.search({ parentPath, descentDepth: 1, full: true }, undefined);
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
    }, [currentNode, currentDepth, db, setCurrentDepth, setStatus]);

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
                const node = await searchFirstObjectAtPath({ db, path: crumbPath });

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
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    disableShadow
                    widget={featuresConfig.modelTree}
                    WidgetMenu={(props) => (
                        <Menu {...props}>
                            <div>
                                <MenuItem
                                    onClick={() => {
                                        navigator.clipboard.writeText(currentDepth?.path ?? "");

                                        if (props.onClose) {
                                            props.onClose({}, "backdropClick");
                                        }
                                    }}
                                    disabled={!currentDepth?.path}
                                >
                                    <>
                                        <ListItemIcon>
                                            <ContentCopy fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>Copy current path</ListItemText>
                                    </>
                                </MenuItem>
                            </div>
                        </Menu>
                    )}
                />
                <Box display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" height={1}>
                    {status === Status.Loading ? (
                        <Box position="relative">
                            <LinearProgress />
                        </Box>
                    ) : null}
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
                                        allowDownload
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
                {menuOpen && <WidgetList widgetKey={featuresConfig.modelTree.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
