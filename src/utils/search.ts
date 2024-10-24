import { View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { HierarcicalObjectReference, ObjectData, ObjectId, SearchPattern } from "@novorender/webgl-api";
import pMap from "p-map";

import { DeepMutable, NodeType } from "types/misc";

import { sleep } from "./time";

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
    const values: T[] = [];
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

        values.push(next.value);
    }

    return [values, done];
}

/**
    Find objects matching the specified patterns.
    The callback gets called at the specified interval with only the new results since the last call.

    @remarks
    Some searches may return thousands of objects and take several seconds to complete.
*/
export async function searchByPatterns<T = HierarcicalObjectReference>({
    db,
    searchPatterns,
    callback,
    callbackInterval = defaultCallbackInterval,
    abortSignal,
    full,
}: {
    db: ObjectDB;
    searchPatterns: SearchPattern[] | string;
    callback: (result: T[]) => void;
    callbackInterval?: number;
    abortSignal?: AbortSignal;
    full?: boolean;
}): Promise<void> {
    const iterator = db.search({ searchPattern: searchPatterns, full }, abortSignal) as AsyncIterableIterator<T>;
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync<T>({ iterator, abortSignal, count: callbackInterval });
        done = _done;
        callback(result);
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
    db,
    searchPatterns,
    callback,
    callbackInterval = defaultCallbackInterval,
    abortSignal,
}: {
    db: ObjectDB;
    searchPatterns: SearchPattern[] | string;
    callback: (result: ObjectId[]) => void;
    callbackInterval?: number;
    abortSignal?: AbortSignal;
}): Promise<void> {
    const iterator = db.search({ searchPattern: searchPatterns }, abortSignal);
    let done = false;

    while (!done && !abortSignal?.aborted) {
        const [result, _done] = await iterateAsync({ iterator, abortSignal, count: callbackInterval });
        done = _done;
        callback(result.map((res) => res.id));
        await sleep(1);

        const [cachedDescendants, unCachedDescendants] = result.reduce(
            (acc, obj) => {
                if (obj.type == NodeType.Leaf) {
                    return acc;
                } else if (obj.descendants) {
                    acc[0] = acc[0].concat(obj.descendants);
                } else {
                    acc[1].push(obj);
                }

                return acc;
            },
            [[], []] as [cached: ObjectId[], uncached: HierarcicalObjectReference[]],
        );

        callback(cachedDescendants);

        await pMap(
            unCachedDescendants,
            (obj) =>
                getDescendants({ db: db, parentNode: obj, abortSignal })
                    .then((ids) => callback(ids))
                    .catch(() =>
                        searchByParentPath({
                            db: db,
                            abortSignal,
                            callback: (results) => callback(results.map((res) => res.id)),
                            callbackInterval: callbackInterval,
                            parentPath: obj.path,
                        }),
                    ),
            { concurrency: 10 },
        );
    }
}

/**
    Find objects by parent path.
    The callback gets called at the specified interval with only the new results since the last call.

    @remarks
    Some searches may return thousands of objects and take several seconds to complete.    
*/
export async function searchByParentPath({
    db,
    parentPath,
    callback,
    callbackInterval = defaultCallbackInterval,
    depth,
    abortSignal,
}: {
    db: ObjectDB;
    parentPath: string;
    callback: (result: HierarcicalObjectReference[]) => void;
    callbackInterval?: number;
    depth?: number;
    abortSignal?: AbortSignal;
}): Promise<void> {
    const allChildren = db.search({ parentPath, descentDepth: depth }, abortSignal);
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
    db,
    path,
}: {
    db: ObjectDB;
    path: string;
}): Promise<ObjectData | undefined> {
    return db
        .search({ parentPath: path, descentDepth: 0, full: true }, undefined)
        .next()
        .then((res) => (res.value ? res.value.loadMetaData() : undefined))
        .catch(() => undefined);
}

export async function getDescendants({
    db,
    parentNode,
    abortSignal,
}: {
    db: ObjectDB;
    parentNode: HierarcicalObjectReference;
    abortSignal?: AbortSignal;
}): Promise<ObjectId[]> {
    return (
        parentNode.descendants ??
        db.descendants(parentNode, abortSignal).then((ids) => {
            if (!ids.length) {
                // Probably not cached so throw to handle fallback in catch
                throw new Error("No descendants found");
            }

            // Bug in descendants which can return NaNs
            const filteredIds = ids.filter((e) => !isNaN(e));
            (parentNode as DeepMutable<HierarcicalObjectReference>).descendants = filteredIds;
            return filteredIds;
        })
    );
}

export function getObjectData({
    db,
    id,
    view,
}: {
    db: ObjectDB;
    id: ObjectId;
    view: View;
}): Promise<ObjectData | undefined> {
    return view.data
        ? (view.data.getObjectMetaData(id) as unknown as Promise<ObjectData>)
        : db.getObjectMetdata(id).catch(() => undefined);
}

export async function batchedPropertySearch<T = HierarcicalObjectReference>({
    property,
    value,
    transformResult,
    db,
    abortSignal,
    full,
}: {
    property: string;
    value: string[];
    transformResult?: (res: (HierarcicalObjectReference | ObjectData)[]) => T[];
    db: ObjectDB;
    abortSignal: AbortSignal;
    full?: boolean;
}): Promise<T[]> {
    let result = [] as T[];

    const batchSize = 100;
    const batches = value.reduce(
        (acc, val) => {
            const lastBatch = acc.slice(-1)[0];

            if (lastBatch.length < batchSize) {
                lastBatch.push(val);
            } else {
                acc.push([val]);
            }

            return acc;
        },
        [[]] as string[][],
    );

    const concurrentRequests = 5;
    const callback = (refs: (HierarcicalObjectReference | ObjectData)[]) => {
        result = result.concat(transformResult ? transformResult(refs) : (refs as unknown as T));
    };

    for (let i = 0; i < batches.length / concurrentRequests; i++) {
        await Promise.all(
            batches.slice(i * concurrentRequests, i * concurrentRequests + concurrentRequests).map((batch) => {
                return searchByPatterns({
                    db,
                    callback,
                    abortSignal,
                    full,
                    searchPatterns: [
                        {
                            property,
                            value: batch,
                            exact: true,
                        },
                    ],
                }).catch(() => {
                    // continue
                });
            }),
        );
    }

    if (abortSignal.aborted) {
        return [];
    }

    return result;
}
