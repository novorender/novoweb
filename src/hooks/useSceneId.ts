import { useParams } from "react-router-dom";

let _id: string = "";

export function useSceneId() {
    const { id = import.meta.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c" } = useParams<{
        // TODO FIX ID
        id?: string;
    }>();
    _id = _id || id;

    return _id;
}
