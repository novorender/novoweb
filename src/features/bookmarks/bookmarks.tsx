import { Fragment } from "react";
import { quat, vec3 } from "gl-matrix";
import {
    useTheme,
    List,
    ListItem,
    Box,
    Typography,
    Tooltip as MuiTooltip,
    styled,
    tooltipClasses,
    TooltipProps,
} from "@mui/material";
import type { Bookmark } from "@novorender/data-js-api";
import { css } from "@mui/styled-engine";

import { ScrollBox, Tooltip, Divider } from "components";
import { ObjectVisibility, renderActions, selectBookmarks } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";

const Description = styled(Typography)(
    () => css`
        display: --webkit-box;
        overflow: hidden;
        --webkit-line-clamp: 2;
        --webkit-box-orient: vertical;
    `
);

const ImgTooltip = styled(({ className, ...props }: TooltipProps) => (
    <MuiTooltip {...props} classes={{ popper: className }} />
))(
    ({ theme }) => css`
        & .${tooltipClasses.tooltip} {
            max-width: none;
            background: ${theme.palette.common.white};
            padding: ${theme.spacing(1)};
            border-radius: 4px;
            border: 1px solid ${theme.palette.grey.A400};
        }
    `
);

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `
);

export function Bookmarks() {
    const theme = useTheme();

    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view },
    } = useExplorerGlobals(true);

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
            dispatch(renderActions.setClippingBox({ ...bookmark.clippingPlanes, highlight: -1, defining: false }));
        } else {
            dispatch(renderActions.resetClippingBox());
        }
    }

    return (
        <ScrollBox height={1} pb={2}>
            <List>
                {bookmarks.map((bookmark, index, array) => (
                    <Fragment key={bookmark.name + index}>
                        <ListItem
                            sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }}
                            button
                            onClick={() => handleSelect(bookmark)}
                        >
                            <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                                <Box
                                    bgcolor={theme.palette.grey[200]}
                                    height={65}
                                    width={100}
                                    flexShrink={0}
                                    flexGrow={0}
                                >
                                    {bookmark.img ? (
                                        <ImgTooltip
                                            placement="bottom-end"
                                            title={
                                                <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                                                    <Img alt="" src={bookmark.img} />
                                                </Box>
                                            }
                                        >
                                            <Img alt="" height="32px" width="32px" src={bookmark.img} />
                                        </ImgTooltip>
                                    ) : null}
                                </Box>
                                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                                    <Tooltip disableInteractive title={bookmark.name}>
                                        <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                            {bookmark.name}
                                        </Typography>
                                    </Tooltip>
                                    {bookmark.description ? (
                                        <Tooltip disableInteractive title={bookmark.description}>
                                            <Description>{bookmark.description}</Description>
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
