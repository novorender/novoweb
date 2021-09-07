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
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { useAppSelector } from "app/store";
import { Tooltip, useScrollBoxStyles } from "components";
import { NodeType } from "features/modelTree/modelTree";
import { ChangeEvent, ChangeEventHandler, forwardRef, MouseEventHandler } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList, FixedSizeListProps, ListOnScrollProps } from "react-window";
import { selectDefaultHighlighted, selectHiddenObjects } from "slices/renderSlice";
import { getObjectNameFromPath } from "utils/objectData";

import FolderIcon from "@material-ui/icons/Folder";
import EcoIcon from "@material-ui/icons/Eco";
import VisibilityIcon from "@material-ui/icons/Visibility";

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

        const selected = useAppSelector(selectDefaultHighlighted);
        const hidden = useAppSelector(selectHiddenObjects);

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
                                const parentIsSelected = selected.includes(parentNode.id);
                                const parentIsHidden = hidden.includes(parentNode.id);

                                parent = (
                                    <Node
                                        parent
                                        style={parentStyles}
                                        node={parentNode}
                                        selected={parentIsSelected}
                                        hidden={parentIsHidden}
                                        onToggleSelect={
                                            onToggleSelect ? (e) => onToggleSelect(e, parentNode) : undefined
                                        }
                                        onToggleHide={onToggleHide ? (e) => onToggleHide(e, parentNode) : undefined}
                                        onNodeClick={
                                            onNodeClick ? () => onNodeClick(parentNode, isSelected) : onNodeClick
                                        }
                                    />
                                );
                            }

                            const isSelected = selected.includes(node.id);
                            const isHidden = hidden.includes(node.id);

                            return (
                                <>
                                    {parent}
                                    <Node
                                        style={nodeStyles}
                                        node={node}
                                        selected={isSelected}
                                        hidden={isHidden}
                                        onToggleSelect={onToggleSelect ? (e) => onToggleSelect(e, node) : undefined}
                                        onToggleHide={onToggleHide ? (e) => onToggleHide(e, node) : undefined}
                                        onNodeClick={onNodeClick ? () => onNodeClick(node, isSelected) : onNodeClick}
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
            margin: `0 ${theme.spacing(1)}px 0 0`,
            color: theme.palette.grey[700],
        },
    })
);

function Node({
    node,
    selected,
    hidden,
    parent,
    onToggleSelect,
    onToggleHide,
    onNodeClick,
    ...props
}: {
    node: HierarcicalObjectReference;
    selected: boolean;
    hidden: boolean;
    parent?: boolean;
    onToggleSelect?: ChangeEventHandler<HTMLInputElement>;
    onToggleHide?: ChangeEventHandler<HTMLInputElement>;
    onNodeClick?: (node: HierarcicalObjectReference, isSelected: boolean) => void;
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
                    <Tooltip title={parent ? "Folder" : pathName} interactive>
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
                        onChange={onToggleSelect}
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
                        onChange={onToggleHide}
                        onClick={stopPropagation}
                    />
                ) : null}
            </Box>
        </ListItem>
    );
}
