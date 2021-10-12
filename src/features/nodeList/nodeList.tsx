import { ListItemProps, useTheme, ListItem, Box, Typography, Checkbox } from "@mui/material";
import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { Tooltip, useScrollBoxStyles } from "components";
import { NodeType } from "features/modelTree/modelTree";
import { ChangeEvent, forwardRef, MouseEventHandler } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList, FixedSizeListProps, ListOnScrollProps } from "react-window";
import { getObjectNameFromPath } from "utils/objectData";
import { useIsHighlighted } from "contexts/highlighted";
import { useIsHidden } from "contexts/hidden";

import FolderIcon from "@mui/icons-material/Folder";
import VisibilityIcon from "@mui/icons-material/Visibility";

type Props = {
    nodes: HierarcicalObjectReference[];
    parentNode?: HierarcicalObjectReference;
    onScroll?: (props: ListOnScrollProps) => void;
    onNodeClick: (node: HierarcicalObjectReference, isSelected: boolean) => void;
    onToggleSelect?: (event: ChangeEvent<HTMLInputElement>, node: HierarcicalObjectReference) => void;
    onToggleHide?: (event: ChangeEvent<HTMLInputElement>, node: HierarcicalObjectReference) => void;
    outerRef?: FixedSizeListProps["outerRef"];
};

export const NodeList = forwardRef<any, Props>(
    ({ nodes, onScroll, onNodeClick, onToggleSelect, onToggleHide, outerRef, parentNode }, ref) => {
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
                                parentNode && style.top !== undefined && style.height !== undefined
                                    ? { ...style, top: Number(style.top) + Number(style.height) }
                                    : style;

                            if (!node) {
                                return null;
                            }

                            let parent: JSX.Element | null = null;

                            if (index === 0 && parentNode) {
                                const parentStyles = style;

                                parent = (
                                    <Node
                                        parent
                                        style={parentStyles}
                                        node={parentNode}
                                        onToggleSelect={onToggleSelect}
                                        onToggleHide={onToggleHide}
                                        onNodeClick={onNodeClick}
                                    />
                                );
                            }

                            return (
                                <>
                                    {parent}
                                    <Node
                                        style={nodeStyles}
                                        node={node}
                                        onToggleSelect={onToggleSelect}
                                        onToggleHide={onToggleHide}
                                        onNodeClick={onNodeClick}
                                    />
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
            margin: `0 ${theme.spacing(1)} 0 0`,
            color: theme.palette.grey[700],
        },
    })
);

function Node({
    node,
    parent,
    onToggleSelect,
    onToggleHide,
    onNodeClick,
    ...props
}: {
    node: HierarcicalObjectReference;
    parent?: boolean;
    onToggleSelect?: (event: ChangeEvent<HTMLInputElement>, node: HierarcicalObjectReference) => void;
    onToggleHide?: (event: ChangeEvent<HTMLInputElement>, node: HierarcicalObjectReference) => void;
    onNodeClick?: (node: HierarcicalObjectReference, isSelected: boolean) => void;
} & ListItemProps) {
    const theme = useTheme();
    const classes = useStyles();

    const selected = useIsHighlighted(node.id);
    const hidden = useIsHidden(node.id);

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
            onClick={() => (onNodeClick ? onNodeClick(node, selected) : undefined)}
        >
            <Box display="flex" width={1} alignItems="center">
                <Box display="flex" alignItems="center" width={0} flex={"1 1 100%"}>
                    {!parent ? (
                        node.type === NodeType.Internal ? (
                            <FolderIcon className={classes.listItemIcon} fontSize="small" />
                        ) : null
                    ) : null}
                    <Tooltip title={parent ? "Folder" : pathName}>
                        <Typography color={parent ? "textSecondary" : "textPrimary"} noWrap={true}>
                            {parent ? "Folder" : pathName}
                        </Typography>
                    </Tooltip>
                </Box>
                {onToggleSelect ? (
                    <Checkbox
                        aria-label="Select node"
                        size="small"
                        checked={selected}
                        onChange={(e) => onToggleSelect(e, node)}
                        onClick={stopPropagation}
                    />
                ) : null}
                {onToggleHide ? (
                    <Checkbox
                        aria-label="Toggle node visibility"
                        size="small"
                        icon={<VisibilityIcon />}
                        checkedIcon={<VisibilityIcon color="disabled" />}
                        checked={hidden}
                        onChange={(e) => onToggleHide(e, node)}
                        onClick={stopPropagation}
                    />
                ) : null}
            </Box>
        </ListItem>
    );
}
