import { Box, CircularProgress } from "@mui/material";
import { HierarcicalObjectReference, ObjectId, Scene } from "@novorender/webgl-api";
import { useStore } from "react-redux";
import { useEffect } from "react";

import { RootState } from "app/store";
import { ObjectVisibility, selectDefaultVisibility } from "features/render/renderSlice";
import { useLazyHidden } from "contexts/hidden";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazySelectionBasket } from "contexts/selectionBasket";
import { useLazyObjectGroups } from "contexts/objectGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { searchByPatterns } from "utils/search";
import { getGuids } from "utils/objectData";
import { sleep } from "utils/time";
import {
    createBcfClippingPlanes,
    createPerspectiveCamera,
    createBcfSnapshot,
    createBcfViewpointComponents,
    createOrthogonalCamera,
} from "utils/bcf";
import { uniqueArray } from "utils/misc";

import { Viewpoint } from "types/bcf";

type BaseViewpoint = Partial<Viewpoint> & Pick<Viewpoint, "snapshot">;
export type NewViewpoint = BaseViewpoint &
    (Pick<Viewpoint, "perspective_camera"> | Pick<Viewpoint, "orthogonal_camera">);

export function IncludeViewpoint({
    viewpoint,
    setViewpoint,
    include,
}: {
    include: boolean;
    viewpoint: NewViewpoint | undefined;
    setViewpoint: (vp: NewViewpoint | undefined) => void;
}) {
    const hidden = useLazyHidden();
    const selectionBasket = useLazySelectionBasket();
    const highlighted = useLazyHighlighted();
    const objectGroups = useLazyObjectGroups();
    const {
        state: { view_OLD: view, scene_OLD: scene, canvas },
    } = useExplorerGlobals(true);
    const store = useStore<RootState>();

    const [abortController, abort] = useAbortController();
    const [loading, setLoading] = useMountedState(false);

    useEffect(() => {
        if (include) {
            createNewViewpoint();
        } else {
            abort();
            setViewpoint(undefined);
        }

        async function createNewViewpoint() {
            const snapshot = await createBcfSnapshot(canvas);

            if (!snapshot) {
                return;
            }

            setLoading(true);

            const abortSignal = abortController.current.signal;
            const state = store.getState();
            const defaultVisibility = selectDefaultVisibility(state);
            const getSelected = idsToGuids({ scene, abortSignal, ids: highlighted.current.idArr });
            const getExceptions = idsToGuids({
                scene,
                abortSignal,
                ids:
                    defaultVisibility === ObjectVisibility.Neutral
                        ? hidden.current.idArr
                        : selectionBasket.current.idArr,
            });

            const [exceptions, selected] = await Promise.all([getExceptions, getSelected]);

            setLoading(false);

            if (abortSignal.aborted) {
                return;
            }

            const baseVp: BaseViewpoint = {
                snapshot,
                clipping_planes: createBcfClippingPlanes(view.settings.clippingVolume.planes),
                components: await createBcfViewpointComponents({
                    selected,
                    defaultVisibility,
                    exceptions,
                    coloring: [],
                }),
            };

            if (view.camera.kind === "orthographic") {
                setViewpoint({ ...baseVp, orthogonal_camera: createOrthogonalCamera(view.camera) });
            } else if (view.camera.kind === "pinhole") {
                setViewpoint({ ...baseVp, perspective_camera: createPerspectiveCamera(view.camera) });
            }
        }
    }, [
        include,
        setViewpoint,
        view,
        store,
        hidden,
        selectionBasket,
        highlighted,
        scene,
        abortController,
        abort,
        setLoading,
        objectGroups,
        canvas,
    ]);

    return (
        <>
            {viewpoint?.snapshot ? (
                <Box sx={{ img: { width: "100%", height: 200, objectFit: "contain" } }}>
                    <img
                        alt=""
                        src={`data:image/${viewpoint.snapshot.snapshot_type};base64,${viewpoint.snapshot.snapshot_data}`}
                    />
                </Box>
            ) : loading ? (
                <Box width={1} height={150} display="flex" justifyContent="center" alignItems="center">
                    <CircularProgress />
                </Box>
            ) : null}
        </>
    );
}

async function idsToGuids({
    ids,
    scene,
    abortSignal,
}: {
    ids: ObjectId[];
    scene: Scene;
    abortSignal: AbortSignal;
}): Promise<string[]> {
    if (!ids.length) {
        return [];
    }

    let guids = [] as string[];
    const batchSize = 100;
    const batches = ids.reduce(
        (acc, id) => {
            const lastBatch = acc.slice(-1)[0];

            if (lastBatch.length < batchSize) {
                lastBatch.push(String(id));
            } else {
                acc.push([String(id)]);
            }

            return acc;
        },
        [[]] as string[][]
    );

    const concurrentRequests = 5;
    const callback = async (refs: HierarcicalObjectReference[]) => {
        const _guids = await getGuids(refs);
        guids = guids.concat(_guids);
    };

    for (let i = 0; i < batches.length / concurrentRequests; i++) {
        await Promise.all(
            batches.slice(i * concurrentRequests, i * concurrentRequests + concurrentRequests).map((batch) => {
                return searchByPatterns({
                    scene,
                    abortSignal,
                    callback,
                    full: true,
                    searchPatterns: [{ property: "id", value: batch, exact: true }],
                }).catch(() => {});
            })
        );

        await sleep(1);
    }

    // NOTE(OLA): Apparantly some scenes can have duplicate GUIDS...
    return uniqueArray(guids);
}
