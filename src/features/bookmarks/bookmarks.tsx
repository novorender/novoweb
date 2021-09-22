import { Fragment } from "react";
import { quat, vec3 } from "gl-matrix";
import {
    makeStyles,
    createStyles,
    useTheme,
    List,
    ListItem,
    Box,
    Typography,
    Tooltip as MuiTooltip,
} from "@material-ui/core";
import type { Bookmark } from "@novorender/data-js-api";
import type { View } from "@novorender/webgl-api";

import { ScrollBox, Tooltip, Divider } from "components";
import { renderActions, selectBookmarks, selectViewOnlySelected } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted } from "contexts/highlightedGroup";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hiddenGroup";
import { CustomGroup, customGroupsActions, useCustomGroups } from "contexts/customGroups";

const useStyles = makeStyles((theme) =>
    createStyles({
        img: {
            height: "100%",
            width: "100%",
            objectFit: "cover",
            display: "block",
        },
        listItem: {
            padding: `${theme.spacing(0.5)}px ${theme.spacing(1)}px`,
        },
        name: {
            fontWeight: 600,
        },
        description: {
            display: "-webkit-box",
            overflow: "hidden",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
        },
        tooltip: {
            maxWidth: "none",
            background: theme.palette.common.white,
            padding: theme.spacing(1),
            borderRadius: "4px",
            border: `1px solid ${theme.palette.grey.A100}`,
        },
    })
);

type Props = {
    view: View;
};

export function Bookmarks({ view }: Props) {
    const classes = useStyles();
    const theme = useTheme();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();

    const bookmarks = useAppSelector(selectBookmarks);
    const viewOnlySelected = useAppSelector(selectViewOnlySelected);
    const dispatch = useAppDispatch();

    function handleSelect(bookmark: Bookmark) {
        if (bookmark.camera) {
            const sameCameraPosition =
                vec3.equals(view.camera.position, bookmark.camera.position) &&
                quat.equals(view.camera.rotation, bookmark.camera.rotation);

            if (!sameCameraPosition) {
                view.camera.controller.moveTo(bookmark.camera.position, bookmark.camera.rotation);
            }
        }

        if (bookmark.objectGroups) {
            const bmDefaultGroup = bookmark.objectGroups.find((group) => !group.id && group.selected);
            if (bmDefaultGroup?.ids) {
                dispatchHighlighted(highlightActions.overwriteIds(bmDefaultGroup.ids as number[]));
            }

            const bmHiddenGroup = bookmark.objectGroups.find((group) => !group.id && group.hidden);
            if (bmHiddenGroup?.ids) {
                dispatchHidden(hiddenGroupActions.overwriteIds(bmHiddenGroup.ids as number[]));
            }

            const updatedCustomGroups = Object.values(customGroups).reduce((groups, group) => {
                const bookmarked = bookmark.objectGroups!.find((bmGroup) => bmGroup.id === group.id);

                return {
                    ...groups,
                    [group.id]: {
                        ...group,
                        selected: bookmarked ? bookmarked.selected : false,
                        hidden: bookmarked ? bookmarked.hidden : false,
                    },
                };
            }, {} as Record<string, CustomGroup>);

            dispatchCustom(customGroupsActions.overwriteGroups(updatedCustomGroups));

            const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
            renderActions.setMainObject(main);
        }

        if (bookmark.selectedOnly !== undefined && viewOnlySelected !== bookmark.selectedOnly) {
            dispatch(renderActions.toggleViewOnlySelected());
        }
    }

    return (
        <ScrollBox height={1} pb={2}>
            <List>
                {bookmarks.map((bookmark, index, array) => (
                    <Fragment key={bookmark.name + index}>
                        <ListItem className={classes.listItem} button onClick={() => handleSelect(bookmark)}>
                            <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                                <Box
                                    bgcolor={theme.palette.grey[200]}
                                    height={65}
                                    width={100}
                                    flexShrink={0}
                                    flexGrow={0}
                                >
                                    {bookmark.img ? (
                                        <MuiTooltip
                                            interactive
                                            placement="bottom-end"
                                            classes={{ tooltip: classes.tooltip }}
                                            title={
                                                <Box height={176} width={176} style={{ cursor: "pointer" }}>
                                                    <img alt="" className={classes.img} src={bookmark.img} />
                                                </Box>
                                            }
                                        >
                                            <img
                                                alt=""
                                                height="32px"
                                                width="32px"
                                                className={classes.img}
                                                src={bookmark.img}
                                            />
                                        </MuiTooltip>
                                    ) : null}
                                </Box>
                                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                                    <Tooltip interactive={false} title={bookmark.name}>
                                        <Typography noWrap variant="body1" className={classes.name}>
                                            {bookmark.name}
                                        </Typography>
                                    </Tooltip>
                                    {bookmark.description ? (
                                        <Tooltip interactive={false} title={bookmark.description}>
                                            <Typography className={classes.description}>
                                                {bookmark.description}
                                            </Typography>
                                        </Tooltip>
                                    ) : null}
                                </Box>
                            </Box>
                        </ListItem>
                        {index !== array.length - 1 ? (
                            <Box my={0.5} component="li">
                                <Divider />
                            </Box>
                        ) : null}
                    </Fragment>
                ))}
            </List>
        </ScrollBox>
    );
}
