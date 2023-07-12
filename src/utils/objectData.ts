import { ObjectDB } from "@novorender/data-js-api";
import { BoundingSphere, HierarcicalObjectReference, ObjectId } from "@novorender/webgl-api";
import { flip } from "features/render/utils";
import { vec3 } from "gl-matrix";
import { batchedPropertySearch } from "./search";

export function decodeObjPathName(str: string) {
    try {
        return decodeURIComponent(str);
    } catch {
        return str.replace(/%2f/g, "/").replace(/%20/g, " ");
    }
}

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

    return decodeObjPathName(arr.length ? arr.pop()! : path);
}

export function getFilePathFromObjectPath(objectPath: string): string | null {
    //https://novorender.com/formats-integrations/
    const match = objectPath.match(
        /^(?<path>.+\.(dem|dwg|dxf|ifc|xml|kof|nwd|obj|pdms|rvm|step|stp|wms|wmts|pts|las|e57|jpg|jpeg|tif|tiff|pdf))/i
    )?.groups;

    if (!match || !match.path) {
        return null;
    }

    return match.path;
}

export function getFileNameFromPath(path: string): string | null {
    const filePath = getFilePathFromObjectPath(path);

    if (!filePath) {
        return null;
    }

    if (!filePath.includes("/")) {
        return filePath;
    }

    return filePath.split("/").at(-1) ?? null;
}

export async function objIdsToTotalBoundingSphere({
    ids,
    abortSignal,
    db,
}: {
    ids: number[];
    abortSignal: AbortSignal;
    db: ObjectDB;
}) {
    let nodes = [] as HierarcicalObjectReference[];

    nodes = await batchedPropertySearch({
        db,
        property: "id",
        value: ids.map((id) => String(id)),
        abortSignal,
    });

    return getTotalBoundingSphere(nodes);
}

export function getTotalBoundingSphere(nodes: HierarcicalObjectReference[]): BoundingSphere | undefined {
    const spheres: BoundingSphere[] = [];

    for (const node of nodes) {
        const sphere = node.bounds?.sphere;

        if (sphere) {
            spheres.push({ ...sphere, center: flip(sphere.center) });
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

export function getPropertyDisplayName(property: string): string {
    let decoded: string | undefined = undefined;

    try {
        decoded = decodeURIComponent(property);
    } catch (e) {
        console.warn(`Failed to decode property "${property}".`);
    }

    const display = decoded ?? property;

    return display[0]?.toUpperCase() + display.slice(1);
}

export function isUrl(str: string): boolean {
    return str.startsWith("http");
}
