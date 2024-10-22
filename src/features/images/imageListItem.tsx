import { Box, Button, css, ListItemButton, styled, Typography, useTheme } from "@mui/material";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";
import { handleImageResponse } from "utils/bcf";
import { getAssetUrl } from "utils/misc";

import { imagesActions, selectActiveImage } from "./imagesSlice";
import { Image, ImageType } from "./types";
import { isPanorama } from "./utils";

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `,
);

export function ImageListItem({ image, style }: { image: Image; style: CSSProperties }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const theme = useTheme();
    const dispatch = useAppDispatch();

    const activeImage = useAppSelector(selectActiveImage);
    const isCurrent = activeImage?.image.guid === image.guid;
    const loading = isCurrent && activeImage.status === AsyncStatus.Loading;
    const url = useRef(getAssetUrl(view, image.preview).toString());
    const [dataUrl, setDataUrl] = useState("");

    useEffect(() => {
        fetch(url.current).then((res) => handleImageResponse(res).then((data) => setDataUrl(data)));
    }, [url]);

    const viewImage = (forceFlat = false) => {
        if (isPanorama(image) && !forceFlat) {
            dispatch(imagesActions.setActiveImage({ image, mode: ImageType.Panorama, status: AsyncStatus.Loading }));
        } else {
            dispatch(imagesActions.setActiveImage({ image, mode: ImageType.Flat, status: AsyncStatus.Loading }));
        }
    };

    return (
        <ListItemButton
            style={style}
            sx={{
                padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
                background: loading ? theme.palette.grey[200] : isCurrent ? theme.palette.grey[300] : "",
            }}
            onClick={() => viewImage(false)}
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
                    <Img src={dataUrl} />
                </Box>
                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                    <Typography noWrap variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                        {image.name}
                    </Typography>
                    <Typography noWrap variant="body2" color={"text.secondary"}>
                        {image.guid}
                    </Typography>
                </Box>
                {isPanorama(image) && (
                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            viewImage(true);
                        }}
                        color="grey"
                        sx={{ alignSelf: "center" }}
                    >
                        {t("flat")}
                    </Button>
                )}
            </Box>
        </ListItemButton>
    );
}
