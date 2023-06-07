import { useParams } from "react-router-dom";

let _id: string = "";

export function useSceneId() {
    const { id = import.meta.env.REACT_APP_SCENE_ID ?? "a8bcb9521ef04db6822d1d93382f9b72" } = useParams<{
        // TODO FIX ID
        id?: string;
    }>();
    _id = _id || id;

    return _id;
}
