import { HierarcicalObjectReference } from "@novorender/webgl-api";

export function getParentPath(path: string): string {
    return path.split("/").slice(0, -1).join("/");
}

export function extractObjectIds<T extends { id: any } = HierarcicalObjectReference>(
    objects: { id: any }[]
): T["id"][] {
    return objects.map((obj) => obj.id);
}

export function getObjectNameFromPath(path: string): string {
    const arr = path.split("/");

    return arr.length ? arr.pop()! : path;
}
