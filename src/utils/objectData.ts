import { BoundingSphere, HierarcicalObjectReference, ObjectId } from "@novorender/webgl-api";
import { vec3 } from "gl-matrix";

import { replaceEncodedSlash } from "./misc";

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

    return replaceEncodedSlash(arr.length ? arr.pop()! : path);
}

export function getTotalBoundingSphere(nodes: HierarcicalObjectReference[]): BoundingSphere | undefined {
    const spheres: BoundingSphere[] = [];

    for (const node of nodes) {
        const sphere = node.bounds?.sphere;

        if (sphere) {
            spheres.push(sphere);
        }
    }

    if (spheres.length < 1) {
        return;
    }

    const center = vec3.clone(spheres[0].center);
    let radius = spheres[0].radius;

    for (let sphere of spheres) {
        const delta = vec3.sub(vec3.create(), sphere.center, center);
        const dist = vec3.len(delta) + sphere.radius;

        if (dist > radius) {
            radius = (radius + dist) * 0.5;
            vec3.add(center, center, vec3.scale(delta, delta, 1 - radius / dist));
        }
    }

    return { center, radius };
}

export function toIdArr(ids: Record<ObjectId, true | undefined>): ObjectId[] {
    return Object.keys(ids).map((id) => Number(id));
}

export function toIdObj(ids: ObjectId[]): Record<ObjectId, true | undefined> {
    return Object.fromEntries(ids.map((id) => [String(id), true]));
}

export function getGuids(refs: HierarcicalObjectReference[]): Promise<string[]> {
    return Promise.all(refs.map((ref) => getGuid(ref))).then((guids) => guids.filter((guid) => guid !== ""));
}

export function getGuid(ref: HierarcicalObjectReference): Promise<string> {
    return ref.loadMetaData().then((obj) => {
        const guid = obj.properties.find((prop) => prop[0] === "GUID");
        return guid ? guid[1] : "";
    });
}
