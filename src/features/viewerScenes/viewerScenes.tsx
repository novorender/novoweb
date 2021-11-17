import { useAppSelector } from "app/store";
import { selectViewerScenes } from "slices/explorerSlice";

export function ViewerScenes() {
    const viewerScenes = useAppSelector(selectViewerScenes);
    return (
        <>
            Scenes: {viewerScenes.length}
            {viewerScenes.map((scene) => (
                <div key={scene.id}>{scene.title}</div>
            ))}
        </>
    );
}
