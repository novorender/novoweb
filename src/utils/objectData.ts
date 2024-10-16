import { ObjectId, View } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { BoundingSphere, HierarcicalObjectReference, ObjectData } from "@novorender/webgl-api";
import { quat, vec3 } from "gl-matrix";

import { flip } from "features/render/utils";

import { batchedPropertySearch, getObjectData } from "./search";

export function decodeObjPathName(str: string) {
    try {
        return decodeURIComponent(str);
    } catch {
        return str.replace(/%2f/g, "/").replace(/%20/g, " ");
    }
}

export function getParentPath(path: string): string {
    const lastSlashIdx = path.lastIndexOf("/");
    return lastSlashIdx > 0 ? path.slice(0, lastSlashIdx) : "";
}

export function extractObjectIds<T extends { id: number } = HierarcicalObjectReference>(
    objects: { id: number }[],
): T["id"][] {
    return objects.map((obj) => obj.id);
}

export function getObjectNameFromPath(path: string): string {
    const arr = path.split("/");

    return decodeObjPathName(arr.at(-1) ?? path);
}

export function getFilePathFromObjectPath(objectPath: string): string | null {
    //https://novorender.com/formats-integrations/
    const match = objectPath.match(
        /^(?<path>.+\.(dem|dwg|dxf|ifc|xml|kof|nwd|obj|pdms|rvm|step|stp|wms|wmts|pts|las|laz|e57|jpg|jpeg|tif|tiff|pdf))/i,
    )?.groups;

    if (!match || !match.path) {
        return null;
    }

    return match.path;
}

export async function getObjectMetadataRotation(
    view: View,
    db: ObjectDB,
    objectId: ObjectId,
): Promise<quat | undefined> {
    const metadata = await (view.data ? view.data.getObjectMetaData(objectId) : db.getObjectMetdata(objectId));

    const filePath = getFilePathFromObjectPath(metadata.path);
    if (!filePath) {
        return;
    }

    const [descendantName] = metadata.path.substring(filePath.length + 1).split("/", 1);
    if (!descendantName) {
        return;
    }

    const descendantPath = `${filePath}/${descendantName}`;

    const objects = db.search(
        {
            descentDepth: 0,
            parentPath: descendantPath,
            full: true,
        },
        undefined,
    );

    for await (const object of objects) {
        const fileMetadata = await object.loadMetaData();
        const rotationProp = fileMetadata.properties.find((p) => p[0] === "Novorender/Rotation")?.[1];
        if (rotationProp) {
            return JSON.parse(rotationProp);
        }
    }
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
    flip,
    view,
}: {
    ids: number[];
    abortSignal: AbortSignal;
    db: ObjectDB;
    flip?: boolean;
    view: View;
}) {
    // let nodes = [] as HierarcicalObjectReference[];
    const nodes = navigator.onLine
        ? await batchedPropertySearch({
              db,
              property: "id",
              value: ids.map((id) => String(id)),
              abortSignal,
          })
        : (await Promise.all(ids.slice(-50).map((id) => getObjectData({ db, id, view })))).filter(
              (obj): obj is ObjectData => obj !== undefined,
          );

    return getTotalBoundingSphere(nodes, { flip });
}

export function getTotalBoundingSphere(
    nodes: HierarcicalObjectReference[],
    options?: { flip?: boolean },
): BoundingSphere | undefined {
    const spheres: BoundingSphere[] = [];

    for (const node of nodes) {
        const sphere = node.bounds?.sphere;

        if (sphere) {
            spheres.push({ ...sphere, center: options?.flip ? flip(sphere.center) : sphere.center });
        }
    }

    if (spheres.length < 1) {
        return;
    }

    const center = vec3.clone(spheres[0].center);
    let radius = spheres[0].radius;

    for (const sphere of spheres) {
        const delta = vec3.sub(vec3.create(), sphere.center, center);
        const dist = vec3.len(delta) + sphere.radius;

        if (dist > radius) {
            radius = (radius + dist) * 0.5;
            vec3.add(center, center, vec3.scale(delta, delta, 1 - radius / dist));
        }
    }

    return { center, radius };
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
    } catch {
        console.warn(`Failed to decode property "${property}".`);
    }

    const display = decoded ?? property;

    return display[0]?.toUpperCase() + display.slice(1);
}

export function isUrl(str: string): boolean {
    return str.startsWith("http");
}
