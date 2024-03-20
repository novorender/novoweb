import { Box, CircularProgress } from "@mui/material";
import { ObjectDB } from "@novorender/data-js-api";
import { HierarcicalObjectReference, ObjectId } from "@novorender/webgl-api";
import { useEffect, useState } from "react";
import { useStore } from "react-redux";

import { RootState } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHidden } from "contexts/hidden";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazyObjectGroups } from "contexts/objectGroups";
import { useLazySelectionBasket } from "contexts/selectionBasket";
import { ObjectVisibility, selectDefaultVisibility } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { Viewpoint } from "types/bcf";
import {
    createBcfClippingPlanes,
    createBcfSnapshot,
    createBcfViewpointComponents,
    createOrthogonalCamera,
    createPerspectiveCamera,
} from "utils/bcf";
import { uniqueArray } from "utils/misc";
import { getGuids } from "utils/objectData";
import { searchByPatterns } from "utils/search";
import { sleep } from "utils/time";

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
        state: { canvas, view, db },
    } = useExplorerGlobals(true);
    const store = useStore<RootState>();

    const [abortController, abort] = useAbortController();
    const [loading, setLoading] = useState(false);

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
            const getSelected = idsToGuids({ db, abortSignal, ids: highlighted.current.idArr });
            const getExceptions = idsToGuids({
                db,
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
                clipping_planes: createBcfClippingPlanes(
                    view.renderState.clipping.planes.map((plane) => plane.normalOffset)
                ),
                components: await createBcfViewpointComponents({
                    selected,
                    defaultVisibility,
                    exceptions,
                    coloring: [],
                }),
            };

            if (view.renderState.camera.kind === "orthographic") {
                setViewpoint({ ...baseVp, orthogonal_camera: createOrthogonalCamera(view.renderState.camera) });
            } else if (view.renderState.camera.kind === "pinhole") {
                setViewpoint({ ...baseVp, perspective_camera: createPerspectiveCamera(view.renderState.camera) });
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
        db,
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
    db,
    abortSignal,
}: {
    ids: ObjectId[];
    db: ObjectDB;
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
                    db,
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
