import { Fragment } from "react";
import { quat, vec3 } from "gl-matrix";
import { useTheme, List, ListItem, Box, Typography, Tooltip as MuiTooltip } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import createStyles from "@mui/styles/createStyles";
import type { Bookmark } from "@novorender/data-js-api";
import type { View } from "@novorender/webgl-api";

import { ScrollBox, Tooltip, Divider } from "components";
import { ObjectVisibility, renderActions, selectBookmarks } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";

const useStyles = makeStyles((theme) =>
    createStyles({
        img: {
            height: "100%",
            width: "100%",
            objectFit: "cover",
            display: "block",
        },
        listItem: {
            padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
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
                dispatchHighlighted(highlightActions.setIds(bmDefaultGroup.ids as number[]));
            }

            const bmHiddenGroup = bookmark.objectGroups.find((group) => !group.id && group.hidden);
            if (bmHiddenGroup?.ids) {
                dispatchHidden(hiddenGroupActions.setIds(bmHiddenGroup.ids as number[]));
            }

            const updatedCustomGroups = customGroups.map((group) => {
                const bookmarked = bookmark.objectGroups!.find((bmGroup) => bmGroup.id === group.id);

                return {
                    ...group,
                    selected: bookmarked ? bookmarked.selected : false,
                    hidden: bookmarked ? bookmarked.hidden : false,
                };
            });

            dispatchCustom(customGroupsActions.set(updatedCustomGroups));

            const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
            dispatch(renderActions.setMainObject(main));
        }

        if (bookmark.selectedOnly !== undefined) {
            dispatch(
                renderActions.setDefaultVisibility(
                    bookmark.selectedOnly ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral
                )
            );
        }

        if (bookmark.measurement) {
            dispatch(renderActions.setMeasurePoints(bookmark.measurement));
        } else {
            dispatch(renderActions.setMeasurePoints([]));
        }

        if (bookmark.clippingPlanes) {
            view.applySettings({ clippingPlanes: { ...bookmark.clippingPlanes, highlight: -1 } });
            dispatch(renderActions.setClippingPlanes({ ...bookmark.clippingPlanes, highlight: -1, defining: false }));
        } else {
            dispatch(renderActions.resetClippingPlanes());
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
                                    <Tooltip disableInteractive title={bookmark.name}>
                                        <Typography noWrap variant="body1" className={classes.name}>
                                            {bookmark.name}
                                        </Typography>
                                    </Tooltip>
                                    {bookmark.description ? (
                                        <Tooltip disableInteractive title={bookmark.description}>
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
