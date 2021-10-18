import { CSSProperties } from "react";
import {
    ListItemProps,
    useTheme,
    ListItem,
    Box,
    Typography,
    Checkbox,
    createStyles,
    makeStyles,
} from "@material-ui/core";
import { HierarcicalObjectReference, Scene } from "@novorender/webgl-api";
import AutoSizer from "react-virtualized-auto-sizer";
import { ChangeEvent, forwardRef, MouseEventHandler, MutableRefObject } from "react";
import { FixedSizeList, FixedSizeListProps, ListOnScrollProps } from "react-window";

import { useAppDispatch } from "app/store";
import { Tooltip, useScrollBoxStyles } from "components";
import { NodeType } from "features/modelTree/modelTree";

import { searchByParentPath } from "utils/search";
import { extractObjectIds, getObjectNameFromPath } from "utils/objectData";

import { highlightActions, useDispatchHighlighted, useIsHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden, useIsHidden } from "contexts/hidden";
import { renderActions } from "slices/renderSlice";

import FolderIcon from "@material-ui/icons/Folder";
import EcoIcon from "@material-ui/icons/Eco";
import VisibilityIcon from "@material-ui/icons/Visibility";

type Props = {
    nodes: HierarcicalObjectReference[];
    parentNode?: HierarcicalObjectReference & { displayName?: string };
    CustomParent?: (props: { style: CSSProperties }) => JSX.Element;
    onScroll?: (props: ListOnScrollProps) => void;
    outerRef?: FixedSizeListProps["outerRef"];
    loading?: boolean;
    setLoading: (state: boolean) => void;
    abortController: MutableRefObject<AbortController>;
    scene: Scene;
};

export const NodeList = forwardRef<any, Props>(
    ({ nodes, onScroll, outerRef, CustomParent, parentNode, ...nodeProps }, ref) => {
        const theme = useTheme();
        const scrollBoxStyles = useScrollBoxStyles().box;

        return (
            <AutoSizer>
                {({ height, width }) => (
                    <FixedSizeList
                        style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                        className={scrollBoxStyles}
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
                    </FixedSizeList>
                )}
            </AutoSizer>
        );
    }
);

const useStyles = makeStyles((theme) =>
    createStyles({
        listItemIcon: {
            minWidth: "auto",
            margin: `0 ${theme.spacing(1)}px 0 0`,
            color: theme.palette.grey[700],
        },
    })
);

type NodeProps = {
    node: HierarcicalObjectReference & { displayName?: string };
    parent?: boolean;
    loading?: boolean;
    setLoading: (state: boolean) => void;
    abortController: MutableRefObject<AbortController>;
    scene: Scene;
} & ListItemProps;

function Node({ node, parent, loading, setLoading, abortController, scene, ...props }: NodeProps) {
    const theme = useTheme();
    const classes = useStyles();

    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();

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
            dispatch(renderActions.setMainObject(node.id));
            return;
        }

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatchHighlighted(highlightActions.add(extractObjectIds(refs))),
                callbackInterval: 1000,
            });

            if (!abortSignal.aborted) {
                dispatchHighlighted(highlightActions.add([node.id]));
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
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatchHighlighted(highlightActions.remove(extractObjectIds(refs))),
                callbackInterval: 1000,
            });
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
            return dispatchHidden(hiddenGroupActions.add([node.id]));
        }

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatchHidden(hiddenGroupActions.add(extractObjectIds(refs))),
                callbackInterval: 1000,
            });

            if (!abortSignal.aborted) {
                dispatchHidden(hiddenGroupActions.add([node.id]));
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
            await searchByParentPath({
                scene,
                abortSignal,
                parentPath: node.path,
                callback: (refs) => dispatchHidden(hiddenGroupActions.remove(extractObjectIds(refs))),
                callbackInterval: 1000,
            });
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
            style={{ ...props.style, paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
            onClick={() => (onNodeClick ? onNodeClick(node, selected) : undefined)}
        >
            <Box display="flex" width={1} alignItems="center">
                <Box display="flex" alignItems="center" width={0} flex={"1 1 100%"}>
                    {!parent ? (
                        node.type === NodeType.Internal ? (
                            <FolderIcon className={classes.listItemIcon} fontSize="small" />
                        ) : (
                            <EcoIcon className={classes.listItemIcon} fontSize="small" />
                        )
                    ) : null}
                    <Tooltip title={node.displayName ?? pathName} interactive>
                        <Typography color={parent ? "textSecondary" : "textPrimary"} noWrap={true}>
                            {node.displayName ?? pathName}
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
