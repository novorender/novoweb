import { ObjectId } from "@novorender/api";

export function toIdArr(ids: Record<ObjectId, true | undefined>): ObjectId[] {
    return Object.keys(ids).map((id) => Number(id));
}

export function toIdObj(ids: ObjectId[]): Record<ObjectId, true | undefined> {
    return Object.fromEntries(ids.map((id) => [String(id), true]));
}
