import { Download, Folder, MoreVert, Visibility } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    IconButton,
    ListItem,
    ListItemIcon,
    ListItemProps,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    useTheme,
} from "@mui/material";
import { HierarcicalObjectReference, ObjectData } from "@novorender/webgl-api";
import { ChangeEvent, CSSProperties, forwardRef, MouseEventHandler, MutableRefObject, useMemo, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList, FixedSizeListProps, ListOnScrollProps } from "react-window";

import { useLazyGetFileDownloadLinkQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch } from "app/redux-store-interactions";
import { FixedSizeVirualizedList, Tooltip } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden, useIsHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted, useIsHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { renderActions } from "features/render";
import { NodeType } from "types/misc";
import { extractObjectIds, getObjectNameFromPath } from "utils/objectData";
import { getDescendants, searchByParentPath } from "utils/search";

const DOWNLOAD_PROPERTY = "Novorender/Download";

type Props = {
    nodes: (HierarcicalObjectReference | ObjectData)[];
    parentNode?: HierarcicalObjectReference;
    CustomParent?: (props: { style: CSSProperties }) => JSX.Element;
    onScroll?: (props: ListOnScrollProps) => void;
    outerRef?: FixedSizeListProps["outerRef"];
    loading?: boolean;
    allowDownload?: boolean;
    setLoading: (state: boolean) => void;
    abortController: MutableRefObject<AbortController>;
};

export const NodeList = forwardRef<FixedSizeList, Props>(
    ({ nodes, onScroll, outerRef, CustomParent, parentNode, ...nodeProps }, ref) => {
        const theme = useTheme();

        const atLeastOneNodeHasMenu = useMemo(
            () => nodeProps.allowDownload && nodes.some(shouldShowNodeMenu),
            [nodeProps.allowDownload, nodes]
        );

        return (
            <AutoSizer>
                {({ height, width }) => (
                    <FixedSizeVirualizedList
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
                                    <Node
                                        parent
                                        style={parentStyles}
                                        node={parentNode!}
                                        canHaveMenu={atLeastOneNodeHasMenu}
                                        {...nodeProps}
                                    />
                                );
                            }

                            return (
                                <>
                                    {parent}
                                    <Node
                                        style={nodeStyles}
                                        node={node}
                                        canHaveMenu={atLeastOneNodeHasMenu}
                                        {...nodeProps}
                                    />
                                </>
                            );
                        }}
                    </FixedSizeVirualizedList>
                )}
            </AutoSizer>
        );
    }
);

type NodeProps = {
    node: HierarcicalObjectReference | ObjectData;
    parent?: boolean;
    loading?: boolean;
    canHaveMenu?: boolean;
    setLoading: (state: boolean) => void;
    abortController: MutableRefObject<AbortController>;
} & ListItemProps;

function Node({ node, parent, loading, canHaveMenu, setLoading, abortController, ...props }: NodeProps) {
    const theme = useTheme();

    const {
        state: { db },
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

    const [getFileDownloadLink] = useLazyGetFileDownloadLinkQuery();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const onNodeClick = async (node: HierarcicalObjectReference, isSelected: boolean) => {
        if (node.type === NodeType.Internal) {
            dispatch(renderActions.setMainObject(node.id));
        } else if (node.type === NodeType.Leaf) {
            isSelected ? unSelect(node) : select(node);
        }
    };

    const showMenu = canHaveMenu && shouldShowNodeMenu(node);

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
            dispatchHidden(hiddenActions.remove([node.id]));
            dispatch(renderActions.setMainObject(node.id));
            return;
        }

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ db, parentNode: node, abortSignal }).then((ids) => {
                    dispatchHighlighted(highlightActions.add(ids));
                    dispatchHidden(hiddenActions.remove(ids));
                });
            } catch {
                await searchByParentPath({
                    db,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => {
                        const ids = extractObjectIds(refs);
                        dispatchHighlighted(highlightActions.add(ids));
                        dispatchHidden(hiddenActions.remove(ids));
                    },
                });
            }

            if (!abortSignal.aborted) {
                dispatchHighlighted(highlightActions.add([node.id]));
                dispatchHidden(hiddenActions.remove([node.id]));
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
                await getDescendants({ db, parentNode: node, abortSignal }).then((ids) =>
                    dispatchHighlighted(highlightActions.remove(ids))
                );
            } catch {
                await searchByParentPath({
                    db,
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
            dispatchHidden(hiddenActions.add([node.id]));
            dispatchHighlighted(highlightActions.remove([node.id]));
            dispatchSelectionBasket(selectionBasketActions.remove([node.id]));
            return;
        }

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ db, parentNode: node, abortSignal }).then((ids) => {
                    dispatchHidden(hiddenActions.add(ids));
                    dispatchHighlighted(highlightActions.remove(ids));
                });
            } catch {
                await searchByParentPath({
                    db,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => {
                        const ids = extractObjectIds(refs);
                        dispatchHidden(hiddenActions.add(ids));
                        dispatchHighlighted(highlightActions.remove(ids));
                    },
                });
            }

            if (!abortSignal.aborted) {
                dispatchHidden(hiddenActions.add([node.id]));
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
            return dispatchHidden(hiddenActions.remove([node.id]));
        }

        dispatchHidden(hiddenActions.remove([node.id]));

        setLoading(true);
        const abortSignal = abortController.current.signal;

        try {
            try {
                await getDescendants({ db, parentNode: node, abortSignal }).then((ids) =>
                    dispatchHidden(hiddenActions.remove(ids))
                );
            } catch {
                await searchByParentPath({
                    db,
                    abortSignal,
                    parentPath: node.path,
                    callback: (refs) => dispatchHidden(hiddenActions.remove(extractObjectIds(refs))),
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

    const download = async () => {
        setMenuAnchor(null);

        const data = node as ObjectData;
        const relativeUrl = data.properties.find((p) => p[0] === DOWNLOAD_PROPERTY)![1];
        const downloadLink = await getFileDownloadLink({ relativeUrl }).unwrap();

        const link = document.createElement("a");
        link.href = downloadLink;
        document.body.appendChild(link);
        link.click();
        link.remove();
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
                    {!parent ? node.type === NodeType.Internal ? <Folder fontSize="small" /> : null : null}
                    <Tooltip title={parent ? "Folder" : pathName}>
                        <Typography color={parent ? "textSecondary" : "textPrimary"} noWrap={true}>
                            {parent ? "Folder" : pathName}
                        </Typography>
                    </Tooltip>
                </Box>
                <Checkbox
                    name="toggle node highlight"
                    aria-label="toggle node highlight"
                    size="small"
                    checked={selected}
                    onChange={(e) => handleChange("select")(e, node)}
                    onClick={stopPropagation}
                />
                <Checkbox
                    name="toggle node visibility"
                    aria-label="Toggle node visibility"
                    size="small"
                    icon={<Visibility />}
                    checkedIcon={<Visibility color="disabled" />}
                    checked={hidden}
                    onChange={(e) => handleChange("hide")(e, node)}
                    onClick={stopPropagation}
                />
                {canHaveMenu && (
                    <Box flex="0 0 auto" visibility={showMenu ? "visible" : "hidden"}>
                        <IconButton
                            color={menuAnchor ? "primary" : "default"}
                            size="small"
                            sx={{ p: 1 }}
                            aria-haspopup="true"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuAnchor(e.currentTarget.parentElement);
                            }}
                        >
                            <MoreVert />
                        </IconButton>
                    </Box>
                )}
            </Box>

            {showMenu && (
                <Menu
                    onClick={(e) => e.stopPropagation()}
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={() => setMenuAnchor(null)}
                    id={`${node.id}-menu`}
                    MenuListProps={{ sx: { maxWidth: "100%", minWidth: 100 } }}
                >
                    <MenuItem onClick={download}>
                        <ListItemIcon>
                            <Download fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Download</ListItemText>
                    </MenuItem>
                </Menu>
            )}
        </ListItem>
    );
}

function shouldShowNodeMenu(node: HierarcicalObjectReference | ObjectData) {
    const canDownload = "properties" in node && node.properties.some((p) => p[0] === DOWNLOAD_PROPERTY);
    return canDownload;
}
