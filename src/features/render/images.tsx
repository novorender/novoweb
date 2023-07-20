import { useAppDispatch, useAppSelector } from "app/store";
import { ImgModal } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ditioActions, selectActiveImg } from "features/ditio";
import { imagesActions, isFlat, selectActiveImage } from "features/images";

export function Images() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const activeImage = useAppSelector(selectActiveImage);
    const activeDitioImage = useAppSelector(selectActiveImg);

    if (view && activeImage && isFlat(activeImage.image)) {
        return (
            <ImgModal
                open={true}
                onClose={() => dispatch(imagesActions.setActiveImage(undefined))}
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                src={activeImage.image.src.startsWith("data:image") ? activeImage.image.src : ""}
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
