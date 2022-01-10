import { Camera, OrthoControllerParams, RenderSettings } from "@novorender/webgl-api";
import { vec3, mat3, quat, vec4, mat4 } from "gl-matrix";

import { ObjectVisibility } from "slices/renderSlice";
import { VecRGB, VecRGBA, vecToHex } from "utils/color";
import { uniqueArray } from "utils/misc";

import { Viewpoint } from "./types";

type Point = {
    x: number;
    y: number;
    z: number;
};

type Direction = Point;

export type PerspectiveCamera = {
    camera_view_point: Point;
    camera_direction: Direction;
    camera_up_vector: Direction;
    field_of_view: number;
};

export type OrthogonalCamera = {
    camera_view_point: Point;
    camera_direction: Direction;
    camera_up_vector: Direction;
    view_to_world_scale: number;
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

export function translateOrthogonalCamera(
    orthoCam: OrthogonalCamera
): Pick<OrthoControllerParams, "referenceCoordSys" | "fieldOfView"> {
    // in BCF Z is Y
    const direction = vec3.negate(
        vec3.create(),
        vec3.fromValues(orthoCam.camera_direction.x, orthoCam.camera_direction.z, -orthoCam.camera_direction.y)
    );

    const upVector = vec3.fromValues(
        orthoCam.camera_up_vector.x,
        orthoCam.camera_up_vector.z,
        -orthoCam.camera_up_vector.y
    );

    const cross = vec3.cross(
        vec3.create(),
        vec3.fromValues(orthoCam.camera_direction.x, orthoCam.camera_direction.z, -orthoCam.camera_direction.y),
        upVector
    );

    const referenceCoordSys = mat4.fromValues(
        cross[0],
        cross[1],
        cross[2],
        0,
        upVector[0],
        upVector[1],
        upVector[2],
        0,
        direction[0],
        direction[1],
        direction[2],
        0,
        orthoCam.camera_view_point.x,
        orthoCam.camera_view_point.z,
        -orthoCam.camera_view_point.y,
        1
    );

    return {
        referenceCoordSys,
        fieldOfView: orthoCam.view_to_world_scale,
    };
}

export function createPerspectiveCamera(
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

export function createOrthogonalCamera(
    camera: Pick<Camera, "position" | "rotation" | "fieldOfView">
): OrthogonalCamera {
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
        view_to_world_scale: camera.fieldOfView,
    };
}

export function translateBcfClippingPlanes(planes: Viewpoint["clipping_planes"]): [number, number, number, number][] {
    return planes.map(({ location, direction }) => {
        return vec4.fromValues(
            direction.x,
            direction.z,
            -direction.y,
            -vec3.dot(
                vec3.fromValues(direction.x, direction.z, -direction.y),
                vec3.fromValues(location.x, location.z, -location.y)
            )
        ) as [number, number, number, number];
    });
}

export function createBcfClippingPlanes(
    planes: RenderSettings["clippingVolume"]["planes"]
): Viewpoint["clipping_planes"] {
    return planes.map((plane) => {
        const normal = vec3.fromValues(plane[0], -plane[2], plane[1]);
        const pointOnPlane = vec3.scale(vec3.create(), normal, -plane[3]);

        return {
            location: {
                x: pointOnPlane[0],
                y: pointOnPlane[1],
                z: pointOnPlane[2],
            },
            direction: {
                x: normal[0],
                y: normal[1],
                z: normal[2],
            },
        };
    });
}

export function createBcfSnapshot(canvas: HTMLCanvasElement): Viewpoint["snapshot"] | undefined {
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
    exceptions = [],
    coloring,
}: {
    selected: string[];
    coloring: { color: VecRGB | VecRGBA; guids: string[] }[];
    defaultVisibility: ObjectVisibility;
    exceptions?: string[];
}): Promise<Viewpoint["components"] | undefined> {
    return {
        selection: selected.map((guid) => ({ ifc_guid: guid })),
        coloring: coloring.map((item) => ({
            color: vecToHex(
                item.color.length === 3 ? item.color : ([item.color[3], ...item.color.slice(0, 4)] as VecRGBA)
            ),
            components: item.guids.map((guid) => ({ ifc_guid: guid })),
        })),
        visibility: {
            default_visibility: defaultVisibility === ObjectVisibility.Neutral,
            exceptions: uniqueArray(
                exceptions.concat(defaultVisibility === ObjectVisibility.Neutral ? [] : selected)
            ).map((guid) => ({ ifc_guid: guid })),
            view_setup_hints: {
                spaces_visible: false,
                space_boundaries_visible: false,
                openings_visible: false,
            },
        },
    };
}

export function handleImageResponse(res: Response): Promise<string> {
    return res.arrayBuffer().then((buffer) => `data:image/png;base64, ${Buffer.from(buffer).toString("base64")}`);
}
