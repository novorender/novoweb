import { rotationFromDirection } from "@novorender/api";
import { RenderSettings } from "@novorender/webgl-api";
import { quat, vec3, vec4 } from "gl-matrix";

import { ObjectVisibility } from "features/render";
import { Viewpoint } from "types/bcf";
import { VecRGB, VecRGBA, vecToHex } from "utils/color";
import { base64UrlEncodeImg, createCanvasSnapshot, uniqueArray } from "utils/misc";

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

export function translatePerspectiveCamera(perspectiveCamera: PerspectiveCamera): {
    rotation: quat;
    position: vec3;
    fov: number;
} {
    const direction = vec3.negate(
        vec3.create(),
        vec3.fromValues(
            perspectiveCamera.camera_direction.x,
            perspectiveCamera.camera_direction.y,
            perspectiveCamera.camera_direction.z
        )
    );

    return {
        position: vec3.fromValues(
            perspectiveCamera.camera_view_point.x,
            perspectiveCamera.camera_view_point.y,
            perspectiveCamera.camera_view_point.z
        ),
        rotation: rotationFromDirection(direction),
        fov: perspectiveCamera.field_of_view,
    };
}

export function translateOrthogonalCamera(orthoCam: OrthogonalCamera): { rotation: quat; position: vec3; fov: number } {
    // in BCF Z is Y
    const direction = vec3.negate(
        vec3.create(),
        vec3.fromValues(orthoCam.camera_direction.x, orthoCam.camera_direction.y, orthoCam.camera_direction.z)
    );

    return {
        rotation: rotationFromDirection(direction),
        position: vec3.fromValues(
            orthoCam.camera_view_point.x,
            orthoCam.camera_view_point.y,
            orthoCam.camera_view_point.z
        ),
        fov: orthoCam.view_to_world_scale,
    };
}

export function createPerspectiveCamera(camera: { position: vec3; rotation: quat; fov: number }): PerspectiveCamera {
    const cameraDirection = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), camera.rotation);
    const cameraUp = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), camera.rotation);

    return {
        camera_view_point: {
            x: camera.position[0],
            y: camera.position[1],
            z: camera.position[2],
        },
        camera_direction: {
            x: cameraDirection[0],
            y: cameraDirection[1],
            z: cameraDirection[2],
        },
        camera_up_vector: {
            x: cameraUp[0],
            y: cameraUp[1],
            z: cameraUp[2],
        },
        field_of_view: camera.fov,
    };
}

export function createOrthogonalCamera(camera: { position: vec3; rotation: quat; fov: number }): OrthogonalCamera {
    const cameraDirection = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), camera.rotation);
    const cameraUp = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), camera.rotation);

    return {
        camera_view_point: {
            x: camera.position[0],
            y: camera.position[1],
            z: camera.position[1],
        },
        camera_direction: {
            x: cameraDirection[0],
            y: cameraDirection[1],
            z: cameraDirection[2],
        },
        camera_up_vector: {
            x: cameraUp[0],
            y: cameraUp[1],
            z: cameraUp[2],
        },
        view_to_world_scale: camera.fov,
    };
}

export function translateBcfClippingPlanes(planes: Viewpoint["clipping_planes"]): Vec4[] {
    return planes.map(({ location, direction }) => {
        return vec4.fromValues(
            direction.x,
            direction.y,
            direction.z,
            vec3.dot(
                vec3.fromValues(direction.x, direction.y, direction.z),
                vec3.fromValues(location.x, location.y, location.z)
            )
        ) as Vec4;
    });
}

export function createBcfClippingPlanes(
    planes: RenderSettings["clippingVolume"]["planes"]
): Viewpoint["clipping_planes"] {
    return planes.map((plane) => {
        const normal = vec3.fromValues(plane[0], plane[1], plane[2]);
        const pointOnPlane = vec3.scale(vec3.create(), normal, plane[3]);

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

export async function createBcfSnapshot(canvas: HTMLCanvasElement): Promise<Viewpoint["snapshot"] | undefined> {
    const snapshot = await createCanvasSnapshot(canvas, 1500, 1500);

    if (!snapshot) {
        return;
    }

    return { snapshot_type: "png", snapshot_data: snapshot.split(";base64,")[1] };
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
    return res.arrayBuffer().then((buffer) => `data:image/png;base64, ${base64UrlEncodeImg(buffer)}`);
}
