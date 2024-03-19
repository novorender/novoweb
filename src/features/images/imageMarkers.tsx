import { CameraAlt } from "@mui/icons-material";
import { css, styled } from "@mui/material";
import { SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { imagesActions, ImageType, selectActiveImage, selectImages, selectShowImageMarkers } from "features/images";
import { selectViewMode } from "features/render";
import { useRedirectWheelEvents } from "hooks/useRedirectWheelEvents";
import { AsyncStatus, ViewMode } from "types/misc";

const Marker = styled((props: SVGProps<SVGGElement>) => (
    <g {...props}>
        <CameraAlt color="primary" height="32px" width="32px" />
    </g>
))(
    () => css`
        cursor: pointer;
        pointer-events: bounding-box;

        svg {
            filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
        }
    `
);

export function ImageMarkers() {
    const dispatch = useAppDispatch();
    const images = useAppSelector(selectImages);
    const showImageMarkers = useAppSelector(selectShowImageMarkers);
    const viewMode = useAppSelector(selectViewMode);
    const activeImage = useAppSelector(selectActiveImage);
    const onWheel = useRedirectWheelEvents();

    return (
        <>
            {images.status === AsyncStatus.Success && showImageMarkers
                ? images.data.map((image, idx) => {
                      if (!activeImage || viewMode !== ViewMode.Panorama) {
                          return (
                              <Marker
                                  id={`image-${idx}`}
                                  name={`image-${idx}`}
                                  key={image.guid}
                                  onClick={() =>
                                      dispatch(
                                          imagesActions.setActiveImage({
                                              image: image,
                                              mode: ImageType.Flat,
                                              status: AsyncStatus.Loading,
                                          })
                                      )
                                  }
                                  onWheel={onWheel}
                              />
                          );
                      }

                      const activeIdx = images.data.findIndex((image) => image.guid === activeImage.image.guid);

                      if (Math.abs(idx - activeIdx) === 1) {
                          return (
                              <Marker
                                  id={`image-${idx}`}
                                  name={`image-${idx}`}
                                  key={image.guid}
                                  onClick={() =>
                                      dispatch(
                                          imagesActions.setActiveImage({
                                              image: image,
                                              mode: ImageType.Flat,
                                              status: AsyncStatus.Loading,
                                          })
                                      )
                                  }
                                  onWheel={onWheel}
                              />
                          );
                      }

                      return null;
                  })
                : null}
        </>
    );
}
