import { Box } from "@material-ui/core";
import { useRef, useEffect, ChangeEvent } from "react";
import { useDispatch } from "react-redux";
import { ListOnScrollProps } from "react-window";
import { HierarcicalObjectReference, Scene } from "@novorender/webgl-api";

import { Divider, LinearProgress } from "components";
import { Breadcrumbs } from "features/breadcrumbs";
import { NodeList } from "features/nodeList";
import { useAppSelector } from "app/store";
import { renderActions, selectMainObject } from "slices/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { getObjectData, iterateAsync, searchByParentPath, searchFirstObjectAtPath } from "utils/search";

import { extractObjectIds, getParentPath } from "utils/objectData";

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

export function ModelTree({ scene }: Props) {
    const mainObject = useAppSelector(selectMainObject);
    const dispatch = useDispatch();

    const [status, setStatus] = useMountedState(Status.Initial);
    const [currentDepth, setCurrentDepth] = useMountedState<
        | {
              nodes: HierarcicalObjectReference[];
              path: string;
              iterator: AsyncIterableIterator<HierarcicalObjectReference> | undefined;
          }
        | undefined
    >(undefined);
    const [node, setNode] = useMountedState<HierarcicalObjectReference | undefined>(undefined);

    const [abortController, abort] = useAbortController();
    const listElRef = useRef<HTMLElement | null>(null);

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

    const setCurrentDepthIterator = (iterator: AsyncIterableIterator<HierarcicalObjectReference> | undefined): void => {
        setCurrentDepth((state) => (state ? { ...state, iterator } : undefined));
    };

    const setCurrentDepthNodes = (nodes: HierarcicalObjectReference[]) => {
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

    const handleNodeClick = async (node: HierarcicalObjectReference, isSelected: boolean) => {
        if (node.type === NodeType.Internal) {
            dispatch(renderActions.setMainObject(node.id));
        } else if (node.type === NodeType.Leaf) {
            isSelected ? unSelect(node) : select(node);
        }
    };

    const handleChange =
        (type: "select" | "hide") => (e: ChangeEvent<HTMLInputElement>, node: HierarcicalObjectReference) => {
            if (status === Status.Loading) {
                return;
            }

            if (type === "select") {
                return e.target.checked ? select(node) : unSelect(node);
            }

            return e.target.checked ? hide(node) : show(node);
        };

    const select = async (node: HierarcicalObjectReference) => {
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

    const unSelect = async (node: HierarcicalObjectReference) => {
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

    const hide = async (node: HierarcicalObjectReference) => {
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

    const show = async (node: HierarcicalObjectReference) => {
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
                        {currentDepth?.nodes ? (
                            <NodeList
                                nodes={currentDepth.nodes}
                                onNodeClick={handleNodeClick}
                                onToggleHide={handleChange("hide")}
                                onToggleSelect={handleChange("select")}
                                onScroll={handleScroll}
                                outerRef={listElRef}
                            />
                        ) : null}
                    </Box>
                </>
            ) : null}
        </Box>
    );
}
