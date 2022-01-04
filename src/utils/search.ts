import { HierarcicalObjectReference, ObjectData, ObjectId, Scene, SearchPattern } from "@novorender/webgl-api";
import { NodeType } from "features/modelTree/modelTree";
import { sleep } from "./timers";

const defaultCallbackInterval = 10000;

export async function iterateAsync<T = HierarcicalObjectReference>({
    iterator,
    count,
    abortSignal,
}: {
    iterator: AsyncIterableIterator<T>;
    count: number;
    abortSignal?: AbortSignal;
}): Promise<[T[], boolean]> {
    let values: T[] = [];
    let done = false;

    for (let i = 0; i < count; i++) {
        if (abortSignal?.aborted) {
            break;
        }

        const next = await iterator.next();

        if (next.done) {
            done = true;
            break;
        }

        values = [...values, next.value];
    }

    return [values, done];
}

/**
    Find objects matching the specified patterns.
    The callback gets called at the specified interval with only the new results since the last call.

    @remarks
    Some searches may return thousands of objects and take several seconds to complete.
*/
export async function searchByPatterns({
    scene,
    searchPatterns,
    callback,
    callbackInterval = defaultCallbackInterval,
    abortSignal,
    full,
}: {
    scene: Scene;
    searchPatterns: SearchPattern[] | string;
    callback: (result: HierarcicalObjectReference[]) => void;
    callbackInterval?: number;
    abortSignal?: AbortSignal;
    full?: boolean;
}): Promise<void> {
    const iterator = scene.search({ searchPattern: searchPatterns, full }, abortSignal);
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync({ iterator, abortSignal, count: callbackInterval });
        done = _done;
        callback(result);
        await sleep(1);
    }
}

/**
    Find objects matching the specified patterns.
    The callback gets called at the specified interval with only the new results since the last call.
    Includes the IDs of all children of parent nodes found matching the search pattern.

    @remarks
    Some searches may return thousands of objects and take several seconds to complete.
*/
export async function searchDeepByPatterns({
    scene,
    searchPatterns,
    callback,
    callbackInterval = defaultCallbackInterval,
    abortSignal,
}: {
    scene: Scene;
    searchPatterns: SearchPattern[] | string;
    callback: (result: ObjectId[]) => void;
    callbackInterval?: number;
    abortSignal?: AbortSignal;
}): Promise<void> {
    const iterator = scene.search({ searchPattern: searchPatterns }, abortSignal);
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync({ iterator, abortSignal, count: callbackInterval });
        done = _done;
        callback(result.map((res) => res.id));
        await sleep(1);

        const [cachedDescendants, unCachedDescendants] = result.reduce(
            (acc, obj) => {
                if (obj.descendants) {
                    acc[0] = acc[0].concat(obj.descendants);
                } else {
                    acc[1].push(obj);
                }

                return acc;
            },
            [[], []] as [cached: ObjectId[], uncached: HierarcicalObjectReference[]]
        );

        callback(cachedDescendants);

        const batchSize = 25;
        const batches = unCachedDescendants.reduce(
            (acc, obj) => {
                if (obj.type === NodeType.Leaf) {
                    return acc;
                }

                const lastBatch = acc.slice(-1)[0];

                if (lastBatch.length < batchSize) {
                    lastBatch.push(obj);
                } else {
                    acc.push([obj]);
                }

                return acc;
            },
            [[]] as HierarcicalObjectReference[][]
        );

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];

            await Promise.all(
                batch.map((obj) =>
                    getDescendants({ scene, parentNode: obj, abortSignal })
                        .then((ids) => callback(ids))
                        .catch(() =>
                            searchByParentPath({
                                scene,
                                abortSignal,
                                callback: (results) => callback(results.map((res) => res.id)),
                                callbackInterval: callbackInterval,
                                parentPath: obj.path,
                            })
                        )
                )
            );

            await sleep(1);
        }
    }
}

/**
    Find objects by parent path.
    The callback gets called at the specified interval with only the new results since the last call.

    @remarks
    Some searches may return thousands of objects and take several seconds to complete.    
*/
export async function searchByParentPath({
    scene,
    parentPath,
    callback,
    callbackInterval = defaultCallbackInterval,
    depth,
    abortSignal,
}: {
    scene: Scene;
    parentPath: string;
    callback: (result: HierarcicalObjectReference[]) => void;
    callbackInterval?: number;
    depth?: number;
    abortSignal?: AbortSignal;
}): Promise<void> {
    const allChildren = scene.search({ parentPath, descentDepth: depth }, abortSignal);
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync({ iterator: allChildren, count: callbackInterval, abortSignal });
        done = _done;
        callback(result);
        await sleep(1);
    }
}

/**
 * Find the first object that matches the passed in path, and load its full meta data.
 *  */
export async function searchFirstObjectAtPath({
    scene,
    path,
}: {
    scene: Scene;
    path: string;
}): Promise<ObjectData | undefined> {
    return scene
        .search({ parentPath: path, descentDepth: 0, full: true })
        .next()
        .then((res) => (res.value ? res.value.loadMetaData() : undefined))
        .catch(() => undefined);
}

export async function getDescendants({
    scene,
    parentNode,
    abortSignal,
}: {
    scene: Scene;
    parentNode: HierarcicalObjectReference;
    abortSignal?: AbortSignal;
}): Promise<ObjectId[]> {
    return (
        parentNode.descendants ??
        scene.descendants(parentNode, abortSignal).then((ids) => {
            if (!ids.length) {
                // Probably not cached so throw to handle fallback in catch
                throw new Error("No descendants found");
            }

            return ids;
        })
    );
}

export function getObjectData({ scene, id }: { scene: Scene; id: ObjectId }): Promise<ObjectData | undefined> {
    return scene
        .getObjectReference(id)
        .loadMetaData()
        .catch(() => undefined);
}
