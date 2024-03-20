import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ImgModal } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ditioActions, selectActiveImg } from "features/ditio";
import { imagesActions, ImageType, selectActiveImage } from "features/images";
import { FlatImageActions } from "features/images/flatImageActions";

export function Images() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const activeImage = useAppSelector(selectActiveImage);
    const activeDitioImage = useAppSelector(selectActiveImg);

    if (view && activeImage?.mode === ImageType.Flat) {
        return (
            <ImgModal
                open={true}
                onClose={() => dispatch(imagesActions.setActiveImage(undefined))}
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                src={activeImage.image.src.startsWith("data:image") ? activeImage.image.src : ""}
                Actions={FlatImageActions}
                onKeyUp={(evt) => {
                    if (evt.key === "ArrowLeft") {
                        dispatch(imagesActions.prevImage());
                    } else if (evt.key === "ArrowRight") {
                        dispatch(imagesActions.nextImage());
                    }
                }}
            />
        );
    } else if (activeDitioImage) {
        return (
            <ImgModal
                open={true}
                onClose={() => dispatch(ditioActions.setActiveImg(""))}
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                src={activeDitioImage}
            />
        );
    }

    return null;
}
