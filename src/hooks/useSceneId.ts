import { useParams } from "react-router-dom";

export function useSceneId() {
    const { id = process.env.REACT_APP_SCENE_ID ?? "95a89d20dd084d9486e383e131242c4c" } = useParams<{ id?: string }>();

    return id;
}
