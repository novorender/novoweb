import { Cached, Delete, Edit, MoreVert, Share } from "@mui/icons-material";
import {
    Box,
    IconButton,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    styled,
    Tooltip as MuiTooltip,
    tooltipClasses,
    TooltipProps,
    Typography,
    useTheme,
} from "@mui/material";
import { css } from "@mui/styled-engine";
import { MouseEvent, useState } from "react";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Tooltip } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { selectHasAdminCapabilities } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { BookmarkAccess, bookmarksActions, ExtendedBookmark, selectBookmarks } from "./bookmarksSlice";
import { useCreateBookmark } from "./useCreateBookmark";
import { useSelectBookmark } from "./useSelectBookmark";
import { createBookmarkImg } from "./utils";

const Description = styled(Typography)(
    () => css`
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        flex: 1 1 100%;
        height: 0;
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

export function Bookmark({ bookmark }: { bookmark: ExtendedBookmark }) {
    const {
        state: { canvas },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const history = useHistory();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const selectBookmark = useSelectBookmark();
    const createBookmark = useCreateBookmark();
    const dispatch = useAppDispatch();
    const bookmarks = useAppSelector(selectBookmarks);
    const sceneId = useSceneId();

    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canManage =
        (checkPermission(Permission.BookmarkManage) || checkPermission(Permission.SceneManage)) ?? isAdmin;
    const user = useAppSelector(selectUser);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleUpdate = async () => {
        const { img, explorerState } = createBookmark(await createBookmarkImg(canvas));

        const newBookmarks = bookmarks.map((bm) => (bm === bookmark ? { ...bm, img, explorerState } : bm));

        try {
            await dataApi.saveBookmarks(
                sceneId,
                newBookmarks.filter((bm) => bm.access === bookmark.access).map(({ access: _access, ...bm }) => bm),
                { personal: bookmark.access === BookmarkAccess.Personal }
            );
            dispatch(bookmarksActions.setBookmarks(newBookmarks));
            dispatch(
                bookmarksActions.setSaveStatus({
                    status: AsyncStatus.Success,
                    data: "Bookmark updated",
                })
            );
        } catch (e) {
            console.warn(e);
            dispatch(
                bookmarksActions.setSaveStatus({
                    status: AsyncStatus.Error,
                    msg: "An error occurred while updating the bookmark.",
                })
            );
        }

        closeMenu();
    };

    return (
        <ListItemButton
            sx={{ padding: `${theme.spacing(0.5)} ${theme.spacing(1)}` }}
            onClick={() => selectBookmark(bookmark)}
        >
            <Box width={1} maxHeight={70} height={70} display="flex" alignItems="flex-start" overflow="hidden">
                <Box bgcolor={theme.palette.grey[200]} height={70} width={100} flexShrink={0} flexGrow={0}>
                    {bookmark.img ? (
                        <ImgTooltip
                            placement="bottom-end"
                            title={
                                <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                                    <Img alt="" src={bookmark.img} />
                                </Box>
                            }
                        >
                            <Img alt="" height="70px" width="100px" src={bookmark.img} />
                        </ImgTooltip>
                    ) : null}
                </Box>
                <Box ml={1} display="flex" flexDirection="column" flexGrow={1} width={0} height={1}>
                    <Box display="flex" width={1}>
                        <Tooltip disableInteractive title={bookmark.name}>
                            <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                {bookmark.name}
                            </Typography>
                        </Tooltip>
                        {canManage ||
                        (bookmark.access === BookmarkAccess.Personal && user) ||
                        bookmark.access === BookmarkAccess.Public ? (
                            <IconButton
                                color={menuAnchor ? "primary" : "default"}
                                size="small"
                                sx={{ ml: "auto", py: 0 }}
                                aria-haspopup="true"
                                onClick={openMenu}
                            >
                                <MoreVert />
                            </IconButton>
                        ) : null}
                    </Box>
                    {bookmark.description ? (
                        <Tooltip disableInteractive title={bookmark.description}>
                            <Description>{bookmark.description}</Description>
                        </Tooltip>
                    ) : null}
                </Box>
            </Box>
            <Menu
                onClick={(e) => e.stopPropagation()}
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                id={`${bookmark.name}-menu`}
                MenuListProps={{ sx: { maxWidth: "100%" } }}
            >
                {bookmark.access === BookmarkAccess.Public && (
                    <MenuItem
                        onClick={() => {
                            navigator.clipboard.writeText(
                                `${window.location.origin}${window.location.pathname}?bookmarkId=${bookmark.id}`
                            );
                            closeMenu();
                        }}
                    >
                        <ListItemIcon>
                            <Share fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Share</ListItemText>
                    </MenuItem>
                )}
                {(canManage || (bookmark.access === BookmarkAccess.Personal && user)) && [
                    <MenuItem
                        key="edit"
                        onClick={async () => {
                            selectBookmark({
                                ...bookmark,
                                ...(bookmark.explorerState
                                    ? {
                                          explorerState: {
                                              ...bookmark.explorerState,
                                              options: { addToSelectionBasket: false },
                                          },
                                      }
                                    : { options: { addSelectedToSelectionBasket: false } }), // legacy
                            });
                            history.push(`/edit/${bookmark.id}`);
                        }}
                    >
                        <ListItemIcon>
                            <Edit fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Edit</ListItemText>
                    </MenuItem>,
                    <MenuItem key="update" onClick={handleUpdate}>
                        <ListItemIcon>
                            <Cached fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Update</ListItemText>
                    </MenuItem>,
                    <MenuItem key="delete" onClick={() => history.push(`delete/${bookmark.id}`)}>
                        <ListItemIcon>
                            <Delete fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </MenuItem>,
                ]}
            </Menu>
        </ListItemButton>
    );
}
