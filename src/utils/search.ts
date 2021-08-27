import { HierarcicalObjectReference, ObjectData, ObjectId, Scene, SearchPattern } from "@novorender/webgl-api";
import { NodeType } from "features/modelTree/modelTree";

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
    If the deep option is set to true; find all children of any parent object found.

    @remarks
    Some searches may return thousands of objects and take several seconds to complete.\
*/
export async function searchByPatterns({
    scene,
    searchPatterns,
    callback,
    callbackInterval,
    deep,
    abortSignal,
}: {
    scene: Scene;
    searchPatterns: SearchPattern[];
    callback: (result: HierarcicalObjectReference[]) => void;
    callbackInterval: number;
    deep?: boolean;
    abortSignal?: AbortSignal;
}): Promise<void> {
    const iterator = scene.search({ searchPattern: searchPatterns }, abortSignal);
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync({ iterator, abortSignal, count: callbackInterval });
        done = _done;
        callback(result);

        if (deep) {
            await Promise.all(
                result.map(async (obj) => {
                    if (obj.type === NodeType.Internal) {
                        return searchByParentPath({
                            scene,
                            abortSignal,
                            callback,
                            callbackInterval: callbackInterval / 2,
                            parentPath: obj.path,
                        });
                    }
                })
            );
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
    callbackInterval,
    depth,
    abortSignal,
}: {
    scene: Scene;
    parentPath: string;
    callback: (result: HierarcicalObjectReference[]) => void;
    callbackInterval: number;
    depth?: number;
    abortSignal?: AbortSignal;
}): Promise<void> {
    const allChildren = scene.search({ parentPath, descentDepth: depth }, abortSignal);
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync({ iterator: allChildren, count: callbackInterval, abortSignal });
        done = _done;

        callback(result);
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

export function getObjectData({ scene, id }: { scene: Scene; id: ObjectId }): Promise<ObjectData | undefined> {
    return scene
        .getObjectReference(id)
        .loadMetaData()
        .catch(() => undefined);
}
