import { Cameraswitch, ChevronLeft, ChevronRight, FlightTakeoff } from "@mui/icons-material";
import { Box, IconButton } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { imagesActions, isPanorama, selectActiveImage, selectImagesData } from "features/images";
import { CameraType, renderActions } from "features/render";

export function FlatImageActions() {
    const dispatch = useAppDispatch();
    const images = useAppSelector(selectImagesData);
    const activeImage = useAppSelector(selectActiveImage);
    const {
        state: { view },
    } = useExplorerGlobals(true);

    if (!activeImage) {
        return null;
    }

    return (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: 1, color: "#fff" }}>
            <IconButton
                disabled={images.length <= 1}
                onClick={() => dispatch(imagesActions.prevImage())}
                sx={{ mr: 1, color: "inherit" }}
                edge="start"
            >
                <ChevronLeft />
            </IconButton>

            <Box>
                <IconButton
                    sx={{ mr: 1, color: "inherit" }}
                    onClick={() =>
                        dispatch(
                            renderActions.setCamera({
                                type: CameraType.Pinhole,
                                goTo: {
                                    position: activeImage.image.position,
                                    rotation:
                                        "rotation" in activeImage.image && activeImage.image.rotation
                                            ? activeImage.image.rotation
                                            : [...view.renderState.camera.rotation],
                                },
                            })
                        )
                    }
                >
                    <FlightTakeoff />
                </IconButton>
                <IconButton
                    sx={{ color: "inherit" }}
                    disabled={!isPanorama(activeImage.image)}
                    onClick={() => dispatch(imagesActions.swapMode())}
                >
                    <Cameraswitch />
                </IconButton>
            </Box>

            <IconButton
                disabled={images.length <= 1}
                onClick={() => dispatch(imagesActions.nextImage())}
                sx={{ color: "inherit" }}
                edge="end"
            >
                <ChevronRight />
            </IconButton>
        </Box>
    );
}
