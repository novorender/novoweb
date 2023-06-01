import { useAppDispatch, useAppSelector } from "app/store";
import { ImgModal } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { ditioActions, selectActiveImg } from "features/ditio";
import { imagesActions, isFlat, selectActiveImage } from "features/images";
import { getAssetUrl } from "utils/misc";

export function Images() {
    const {
        state: { scene_OLD: scene },
    } = useExplorerGlobals();
    const dispatch = useAppDispatch();
    const activeImage = useAppSelector(selectActiveImage);
    const activeDitioImage = useAppSelector(selectActiveImg);

    if (scene && activeImage && isFlat(activeImage.image)) {
        return (
            <ImgModal
                open={true}
                onClose={() => dispatch(imagesActions.setActiveImage(undefined))}
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                src={getAssetUrl(scene, activeImage.image.src).toString()}
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
