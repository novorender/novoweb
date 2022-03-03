import { useParams } from "react-router-dom";

let _id: string = "";

export function useSceneId() {
    const { id = process.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c" } = useParams<{ id?: string }>();
    _id = _id || id;

    return _id;
}
