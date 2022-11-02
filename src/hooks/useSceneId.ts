import { useParams } from "react-router-dom";

let _id: string = "";

export function useSceneId() {
    const { id = process.env.REACT_APP_SCENE_ID ?? "2ac7543bcfe6486f830619012340eea9" } = useParams<{ id?: string }>();
    _id = _id || id;

    return _id;
}
