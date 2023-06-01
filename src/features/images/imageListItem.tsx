import { Box, css, ListItemButton, styled, Typography, useTheme } from "@mui/material";
import { CSSProperties, useRef } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch, useAppSelector } from "app/store";
import { AsyncStatus } from "types/misc";
import { getAssetUrl } from "utils/misc";

import { imagesActions, Image, selectActiveImage } from "./imagesSlice";
import { isPanorama } from "./utils";

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `
);

export function ImageListItem({ image, style }: { image: Image; style: CSSProperties }) {
    const {
        state: { scene_OLD: scene },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const activeImage = useAppSelector(selectActiveImage);
    const isCurrent = activeImage?.image.guid === image.guid;
    const loading = isCurrent && activeImage.status === AsyncStatus.Loading;
    const url = useRef(getAssetUrl(scene, image.preview).toString());

    const viewImage = () => {
        if (isCurrent) {
            return;
        }

        dispatch(imagesActions.setActiveImage({ image, status: AsyncStatus.Loading }));
    };

    return (
        <ListItemButton
            style={style}
            sx={{
                padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
                background: loading ? theme.palette.grey[200] : isCurrent ? theme.palette.grey[300] : "",
            }}
            onClick={viewImage}
        >
            <Box width={1} maxHeight={70} height={70} display="flex" alignItems="flex-start" overflow="hidden">
                <Box
                    sx={{
                        position: "relative",

                        "&::before": {
                            position: "absolute",
                            top: 0,
                            left: 0,
                            borderRadius: "2px",
                            px: 1,
                            py: 0.5,
                            color: "common.white",
                            fontSize: "10px",
                            fontWeight: 600,
                            content: isPanorama(image) ? "'PANO'" : "'FLAT'",
                            backgroundColor: isPanorama(image) ? "primary.main" : "secondary.main",
                        },
                    }}
                    bgcolor={theme.palette.grey[200]}
                    height={70}
                    width={100}
                    flexShrink={0}
                    flexGrow={0}
                >
                    <Img src={url.current} />
                </Box>
                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                    <Typography noWrap variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        {image.name}
                    </Typography>
                    <Typography noWrap variant="body2" color={"text.secondary"}>
                        {image.guid}
                    </Typography>
                </Box>
            </Box>
        </ListItemButton>
    );
}
