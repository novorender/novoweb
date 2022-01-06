import { Fragment, MouseEvent, useState } from "react";
import {
    useTheme,
    Box,
    Typography,
    styled,
    tooltipClasses,
    TooltipProps,
    Tooltip as MuiTooltip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import { Delete, MoreVert } from "@mui/icons-material";
import type { Bookmark as BookmarkType } from "@novorender/data-js-api";
import { css } from "@mui/styled-engine";

import { Tooltip } from "components";

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

export function Bookmark({ bookmark, onDelete }: { bookmark: BookmarkType; onDelete: (bm: BookmarkType) => void }) {
    const theme = useTheme();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    return (
        <>
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
                        <IconButton
                            color={Boolean(menuAnchor) ? "primary" : "default"}
                            size="small"
                            sx={{ ml: "auto", py: 0 }}
                            aria-haspopup="true"
                            onClick={openMenu}
                        >
                            <MoreVert />
                        </IconButton>
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
                <MenuItem onClick={() => onDelete(bookmark)}>
                    <ListItemIcon>
                        <Delete fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Delete</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );
}
