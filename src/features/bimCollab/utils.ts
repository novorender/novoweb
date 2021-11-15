import { Camera, RenderSettings } from "@novorender/webgl-api";
import { vec3, mat3, quat, vec4 } from "gl-matrix";

import { ObjectVisibility } from "slices/renderSlice";
import { vecToHex } from "utils/color";

import { Viewpoint } from "./types";

type Point = {
    x: number;
    y: number;
    z: number;
};

type Direction = Point;

type PerspectiveCamera = {
    camera_view_point: Point;
    camera_direction: Direction;
    camera_up_vector: Direction;
    field_of_view: number;
};

export function translatePerspectiveCamera(
    perspectiveCamera: PerspectiveCamera
): Pick<Camera, "position" | "rotation" | "fieldOfView"> {
    // in BCF Z is Y
    const direction = vec3.negate(
        vec3.create(),
        vec3.fromValues(
            perspectiveCamera.camera_direction.x,
            perspectiveCamera.camera_direction.z,
            -perspectiveCamera.camera_direction.y
        )
    );

    const upVector = vec3.fromValues(
        perspectiveCamera.camera_up_vector.x,
        perspectiveCamera.camera_up_vector.z,
        -perspectiveCamera.camera_up_vector.y
    );

    const cross = vec3.cross(
        vec3.create(),
        vec3.fromValues(
            perspectiveCamera.camera_direction.x,
            perspectiveCamera.camera_direction.z,
            -perspectiveCamera.camera_direction.y
        ),
        upVector
    );

    const matrix3 = mat3.fromValues(
        cross[0],
        cross[1],
        cross[2],
        upVector[0],
        upVector[1],
        upVector[2],
        direction[0],
        direction[1],
        direction[2]
    );

    const quaternion = quat.normalize(quat.create(), quat.fromMat3(quat.create(), matrix3));

    return {
        position: vec3.fromValues(
            perspectiveCamera.camera_view_point.x,
            perspectiveCamera.camera_view_point.z,
            -perspectiveCamera.camera_view_point.y
        ),
        rotation: quaternion,
        fieldOfView: perspectiveCamera.field_of_view,
    };
}

export function createBcfPerspectiveCamera(
    camera: Pick<Camera, "position" | "rotation" | "fieldOfView">
): PerspectiveCamera {
    const matrix3 = mat3.fromQuat(mat3.create(), camera.rotation);
    const cameraDirection = vec3.transformMat3(vec3.create(), vec3.fromValues(0, 0, -1), matrix3);
    const cameraUp = vec3.transformMat3(vec3.create(), vec3.fromValues(0, 1, 0), matrix3);

    // in BCF Z is Y
    return {
        camera_view_point: {
            x: camera.position[0],
            y: -camera.position[2],
            z: camera.position[1],
        },
        camera_direction: {
            x: cameraDirection[0],
            y: -cameraDirection[2],
            z: cameraDirection[1],
        },
        camera_up_vector: {
            x: cameraUp[0],
            y: -cameraUp[2],
            z: cameraUp[1],
        },
        field_of_view: camera.fieldOfView,
    };
}

export function translateBcfClippingPlanes(
    planes: Viewpoint["clipping_planes"]
): RenderSettings["clippingVolume"]["planes"] {
    return planes.map(({ location, direction }) => {
        return vec4.fromValues(
            direction.x,
            direction.z,
            -direction.y,
            -vec3.dot(
                vec3.fromValues(direction.x, direction.z, -direction.y),
                vec3.fromValues(location.x, location.z, -location.y)
            )
        );
    });
}

export function createBcfClippingPlanes(
    planes: RenderSettings["clippingVolume"]["planes"]
): Viewpoint["clipping_planes"] {
    return planes.map((plane) => ({
        location: {
            x: plane[0] ? -plane[3] / plane[0] : 0,
            y: plane[2] ? -plane[3] / -plane[2] : 0,
            z: plane[1] ? -plane[3] / plane[1] : 0,
        },
        direction: {
            x: plane[0],
            y: -plane[2],
            z: plane[1],
        },
    }));
}

export function createBcfSnapshot(): Viewpoint["snapshot"] | undefined {
    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;

    if (!canvas) {
        return;
    }

    const dist = document.createElement("canvas");
    const width = Math.min(canvas.width, 1500);
    const height = Math.min(canvas.height, 1500);
    dist.height = height;
    dist.width = width;
    const ctx = dist.getContext("2d", { alpha: false, desynchronized: false })!;
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
    return { snapshot_type: "png", snapshot_data: dist.toDataURL("image/png").split(";base64,")[1] };
}

export async function createBcfViewpointComponents({
    selected,
    defaultVisibility,
    exceptions,
    coloring,
}: {
    selected: string[];
    coloring: { color: [number, number, number]; guids: string[] }[];
    defaultVisibility: ObjectVisibility;
    exceptions?: string[];
}): Promise<Viewpoint["components"] | undefined> {
    return {
        selection: selected.map((guid) => ({ ifc_guid: guid })),
        coloring: coloring.map((item) => ({
            color: vecToHex(item.color),
            components: item.guids.map((guid) => ({ ifc_guid: guid })),
        })),
        visibility: {
            default_visibility: defaultVisibility === ObjectVisibility.Neutral,
            exceptions: exceptions?.map((guid) => ({ ifc_guid: guid })),
            view_setup_hints: {
                spaces_visible: false,
                space_boundaries_visible: false,
                openings_visible: false,
            },
        },
    };
}
