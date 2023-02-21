import { ChangeEvent, forwardRef, MouseEventHandler, CSSProperties, MutableRefObject } from "react";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { FixedSizeList, FixedSizeListProps, ListOnScrollProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { ListItemProps, useTheme, ListItem, Box, Typography, Checkbox } from "@mui/material";

import { useAppDispatch } from "app/store";
import { Tooltip, withCustomScrollbar } from "components";
import { NodeType } from "features/modelTree/modelTree";

import { getDescendants, searchByParentPath } from "utils/search";
import { extractObjectIds, getObjectNameFromPath } from "utils/objectData";

import { highlightActions, useDispatchHighlighted, useIsHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden, useIsHidden } from "contexts/hidden";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions } from "features/render/renderSlice";

import FolderIcon from "@mui/icons-material/Folder";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useDispatchSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";

const StyledFixedSizeList = withCustomScrollbar(FixedSizeList) as typeof FixedSizeList;

type Props = {
    nodes: HierarcicalObjectReference[];
    parentNode?: HierarcicalObjectReference;
    CustomParent?: (props: { style: CSSProperties }) => JSX.Element;
    onScroll?: (props: ListOnScrollProps) => void;
    outerRef?: FixedSizeListProps["outerRef"];
    loading?: boolean;
    setLoading: (state: boolean) => void;
    abortController: MutableRefObject<AbortController>;
};

export const NodeList = forwardRef<any, Props>(
    ({ nodes, onScroll, outerRef, CustomParent, parentNode, ...nodeProps }, ref) => {
        const theme = useTheme();

        return (
            <AutoSizer>
                {({ height, width }) => (
                    <StyledFixedSizeList
                        style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                        onScroll={onScroll}
                        height={height}
                        width={width}
                        itemSize={32}
                        overscanCount={3}
                        itemCount={nodes.length}
                        ref={ref}
                        outerRef={outerRef}
                    >
                        {({ index, style }) => {
                            const node = nodes[index];
                            const nodeStyles =
                                (parentNode || CustomParent) && style.top !== undefined && style.height !== undefined
                                    ? { ...style, top: Number(style.top) + Number(style.height) }
                                    : style;

                            if (!node) {
                                return null;
                            }

                            let parent: JSX.Element | null = null;

                            if (index === 0 && (parentNode || CustomParent)) {
                                const parentStyles = style;

                                parent = CustomParent ? (
                                    <CustomParent style={parentStyles} />
                                ) : (
                                    <Node parent style={parentStyles} node={parentNode!} {...nodeProps} />
                                );
                            }

                            return (
                                <>
                                    {parent}
                                    <Node style={nodeStyles} node={node} {...nodeProps} />
                                </>
                            );
                        }}
                    </StyledFixedSizeList>
                )}
            </AutoSizer>
        );
    }
);

type NodeProps = {
    node: HierarcicalObjectReference;
    parent?: boolean;
    loading?: boolean;
    setLoading: (state: boolean) => void;
    abortController: MutableRefObject<AbortController>;
} & ListItemProps;

function Node({ node, parent, loading, setLoading, abortController, ...props }: NodeProps) {
    const theme = useTheme();

    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatchSelectionBasket = useDispatchSelectionBasket();

    const selected = useIsHighlighted(node.id);
    const hidden = useIsHidden(node.id);

    const stopPropagation: MouseEventHandler = (e) => {
        e.stopPropagation();
    };

    const pathName = getObjectNameFromPath(node.path);

    const onNodeClick = async (node: HierarcicalObjectReference, isSelected: boolean) => {
        if (node.type === NodeType.Internal) {
            dispatch(renderActions.setMainObject(node.id));
        } else if (node.type === NodeType.Leaf) {
            isSelected ? unSelect(node) : select(node);
        }
    };

    const handleChange =
        (type: "select" | "hide") => (e: ChangeEvent<HTMLInputElement>, node: HierarcicalObjectReference) => {
            if (loading) {
                return;
            }

            if (type === "select") {
                return e.target.checked ? select(node) : unSelect(node);
            }

            return e.target.checked ? hide(node) : show(node);
        };

    const select = async (node: HierarcicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            dispatchHighlighted(highlightActions.add([node.id]));
            dispatchHidden(hiddenGroupActions.remove([node.id]));
            dispatch(renderActions.setMainObject(node.id));
            return;
        }

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ scene, parentNode: node, abortSignal }).then((ids) => {
                    dispatchHighlighted(highlightActions.add(ids));
                    dispatchHidden(hiddenGroupActions.remove(ids));
                });
            } catch {
                await searchByParentPath({
                    scene,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => {
                        const ids = extractObjectIds(refs);
                        dispatchHighlighted(highlightActions.add(ids));
                        dispatchHidden(hiddenGroupActions.remove(ids));
                    },
                });
            }

            if (!abortSignal.aborted) {
                dispatchHighlighted(highlightActions.add([node.id]));
                dispatchHidden(hiddenGroupActions.remove([node.id]));
                setLoading(false);
            }
        } catch {
            if (!abortSignal.aborted) {
                setLoading(false);
            }
        }
    };

    const unSelect = async (node: HierarcicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            return dispatchHighlighted(highlightActions.remove([node.id]));
        }

        dispatchHighlighted(highlightActions.remove([node.id]));

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ scene, parentNode: node, abortSignal }).then((ids) =>
                    dispatchHighlighted(highlightActions.remove(ids))
                );
            } catch {
                await searchByParentPath({
                    scene,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => dispatchHighlighted(highlightActions.remove(extractObjectIds(refs))),
                });
            }
        } catch {
            // nada
        } finally {
            if (!abortSignal.aborted) {
                setLoading(false);
            }
        }
    };

    const hide = async (node: HierarcicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            dispatchHidden(hiddenGroupActions.add([node.id]));
            dispatchHighlighted(highlightActions.remove([node.id]));
            dispatchSelectionBasket(selectionBasketActions.remove([node.id]));
            return;
        }

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ scene, parentNode: node, abortSignal }).then((ids) => {
                    dispatchHidden(hiddenGroupActions.add(ids));
                    dispatchHighlighted(highlightActions.remove(ids));
                });
            } catch {
                await searchByParentPath({
                    scene,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => {
                        const ids = extractObjectIds(refs);
                        dispatchHidden(hiddenGroupActions.add(ids));
                        dispatchHighlighted(highlightActions.remove(ids));
                    },
                });
            }

            if (!abortSignal.aborted) {
                dispatchHidden(hiddenGroupActions.add([node.id]));
                dispatchHighlighted(highlightActions.remove([node.id]));
                setLoading(false);
            }
        } catch {
            if (!abortSignal.aborted) {
                setLoading(false);
            }
        }
    };

    const show = async (node: HierarcicalObjectReference) => {
        if (node.type === NodeType.Leaf) {
            return dispatchHidden(hiddenGroupActions.remove([node.id]));
        }

        dispatchHidden(hiddenGroupActions.remove([node.id]));

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ scene, parentNode: node, abortSignal }).then((ids) =>
                    dispatchHidden(hiddenGroupActions.remove(ids))
                );
            } catch {
                await searchByParentPath({
                    scene,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => dispatchHidden(hiddenGroupActions.remove(extractObjectIds(refs))),
                });
            }
        } catch {
            // nada
        } finally {
            if (!abortSignal.aborted) {
                setLoading(false);
            }
        }
    };

    return (
        <ListItem
            disableGutters
            button
            key={node.id}
            style={{ ...props.style }}
            sx={{ paddingLeft: 1, paddingRight: 1 }}
            onClick={() => (onNodeClick ? onNodeClick(node, selected) : undefined)}
        >
            <Box display="flex" width={1} alignItems="center">
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        width: 0,
                        flex: "1 1 100%",

                        "& svg": {
                            minWidth: "auto",
                            margin: `0 ${theme.spacing(1)} 0 0`,
                            color: theme.palette.grey[700],
                        },
                    }}
                >
                    {!parent ? node.type === NodeType.Internal ? <FolderIcon fontSize="small" /> : null : null}
                    <Tooltip title={parent ? "Folder" : pathName}>
                        <Typography color={parent ? "textSecondary" : "textPrimary"} noWrap={true}>
                            {parent ? "Folder" : pathName}
                        </Typography>
                    </Tooltip>
                </Box>
                <Checkbox
                    aria-label="Select node"
                    size="small"
                    checked={selected}
                    onChange={(e) => handleChange("select")(e, node)}
                    onClick={stopPropagation}
                />
                <Checkbox
                    aria-label="Toggle node visibility"
                    size="small"
                    icon={<VisibilityIcon />}
                    checkedIcon={<VisibilityIcon color="disabled" />}
                    checked={hidden}
                    onChange={(e) => handleChange("hide")(e, node)}
                    onClick={stopPropagation}
                />
            </Box>
        </ListItem>
    );
}
