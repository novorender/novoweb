import { CameraAlt } from "@mui/icons-material";
import { css, styled } from "@mui/material";
import { forwardRef, SVGProps, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectViewMode } from "features/render";
import { useRedirectWheelEvents } from "hooks/useRedirectWheelEvents";
import { AsyncStatus, ViewMode } from "types/misc";

import { imagesActions, selectActiveImage, selectImages, selectShowImageMarkers } from "./imagesSlice";
import { ImageType } from "./types";

const Marker = styled(
    forwardRef<SVGGElement, SVGProps<SVGGElement>>((props, ref) => (
        <g {...props} ref={ref}>
            <CameraAlt color="primary" height="32px" width="32px" />
        </g>
    )),
)(
    () => css`
        cursor: pointer;
        pointer-events: bounding-box;

        svg {
            filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
        }
    `,
);

export const ImageMarkers = forwardRef<{ update: () => void }>(function ImageMarkers(_, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const images = useAppSelector(selectImages);
    const showImageMarkers = useAppSelector(selectShowImageMarkers);
    const viewMode = useAppSelector(selectViewMode);
    const activeImage = useAppSelector(selectActiveImage);

    const onWheel = useRedirectWheelEvents();
    const containerRef = useRef<(SVGGElement | null)[]>([]);

    const update = useCallback(() => {
        if (!view?.measure || !containerRef.current.length || images.status !== AsyncStatus.Success) {
            return;
        }

        view.measure.draw.toMarkerPoints(images.data.map((marker) => marker.position)).forEach((pos, idx) => {
            containerRef.current[idx]?.setAttribute(
                "transform",
                pos ? `translate(${pos[0] - 25} ${pos[1] - 25})` : "translate(-100 -100)",
            );
        });
    }, [images, view]);

    useImperativeHandle(ref, () => ({ update }), [update]);

    useEffect(() => {
        update();
    }, [update, showImageMarkers]);

    return (
        <>
            {images.status === AsyncStatus.Success && showImageMarkers
                ? images.data.map((image, idx) => {
                      // image guid is not guaranteed to be unique
                      const key = idx;

                      if (!activeImage || viewMode !== ViewMode.Panorama) {
                          return (
                              <Marker
                                  key={key}
                                  onClick={() =>
                                      dispatch(
                                          imagesActions.setActiveImage({
                                              image: image,
                                              mode: ImageType.Flat,
                                              status: AsyncStatus.Loading,
                                          }),
                                      )
                                  }
                                  onWheel={onWheel}
                                  ref={(el) => (containerRef.current[idx] = el)}
                              />
                          );
                      }

                      const activeIdx = images.data.findIndex((image) => image.guid === activeImage.image.guid);

                      if (Math.abs(idx - activeIdx) === 1) {
                          return (
                              <Marker
                                  key={key}
                                  onClick={() =>
                                      dispatch(
                                          imagesActions.setActiveImage({
                                              image: image,
                                              mode: ImageType.Flat,
                                              status: AsyncStatus.Loading,
                                          }),
                                      )
                                  }
                                  onWheel={onWheel}
                                  ref={(el) => (containerRef.current[idx] = el)}
                              />
                          );
                      }

                      return null;
                  })
                : null}
        </>
    );
});
