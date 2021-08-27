export {};

/* import type { Camera } from "@novorender/webgl-api";
import { mat3, quat, vec3 } from "gl-matrix";
import { hexToVec, vecToHex } from "@novotech/novoui";

import type { BookmarkAppState } from "./bookmarks";

type Point = {
    x: number;
    y: number;
    z: number;
};

type Direction = Point;

type OrthogonalCamera = {
    camera_view_point: Point;
    camera_direction: Direction;
    camera_up_vector: Direction;
    view_to_world_scale: number;
};

type PerspectiveCamera = {
    camera_view_point: Point;
    camera_direction: Direction;
    camera_up_vector: Direction;
    field_of_view: number;
};

type Line = {
    start_point: Point;
    end_point: Point;
};

type ClippingPlane = {
    location: Point;
    direction: Direction;
};

type Bitmap = {
    bitmap_type: "png" | "jpg";
    bitmap_data: string; //b64 encoded
    location: Point;
    normal: Direction;
    up: Direction;
    height: number;
};

type Snapshot = {
    snapshot_type: "png" | "jpg";
    snapshot_data: string; //b64 encoded
};

type Component = {
    ifc_guid?: string;
    originating_system?: string;
    authoring_tool_id?: string;
};

type Coloring = {
    color: string; // #ARGB | #RGB hex
    components: Component[];
};

type Visibility = {
    default_visibility: boolean;
    exceptions?: Component[];
    view_setup_hints?: {
        spaces_visible?: boolean; // default to false
        space_boundaries_visible?: boolean; // default to false
        openings_visible?: boolean; // default to false
    };
};

// https://github.com/buildingSMART/BCF-API#45-viewpoint-services
export type BCFBookmark = {
    guid: string;
    index?: number;
    orthogonal_camera?: OrthogonalCamera;
    perspective_camera?: PerspectiveCamera;
    lines?: Line[];
    clipping_planes?: ClippingPlane[];
    bitmaps?: Bitmap[];
    snapshot?: Snapshot;
    components?: {
        selection?: Component[];
        coloring?: Coloring[];
        visibility: Visibility;
    };
};

export function createBcfPerspectiveCamera(camera: Pick<Camera, "position" | "rotation" | "fieldOfView">): PerspectiveCamera {
    const matrix3 = mat3.fromQuat(mat3.create(), camera.rotation);
    const cameraDirection = vec3.transformMat3(vec3.create(), vec3.fromValues(0, 0, -1), matrix3);
    const cameraUp = vec3.transformMat3(vec3.create(), vec3.fromValues(0, 1, 0), matrix3);

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
        field_of_view: camera.fieldOfView,
    };
}

export function objectGroupsToBcfComponents(objectGroups: NonNullable<BookmarkAppState["objectGroups"]>): BCFBookmark["components"] {
    const [defaultGroup, defaultHidden, ...otherGroups] = objectGroups;

    const toHide = [defaultHidden, ...otherGroups.filter(group => group.hidden)].map(group => group.ids).flat();
    const toColor = otherGroups.filter(group => group.selected);

    return {
        selection: defaultGroup.ids.map(id => ({ ifc_guid: String(id) })),
        coloring: toColor.map(group => ({
            color: vecToHex(group.color),
            components: group.ids.map(id => ({ ifc_guid: String(id) })),
        })),
        visibility: {
            default_visibility: true,
            exceptions: toHide.map(id => ({ ifc_guid: String(id) })),
            view_setup_hints: {
                spaces_visible: false,
                space_boundaries_visible: false,
                openings_visible: false,
            },
        },
    };
}

export function bcfComponentsToObjectGroups(
    components: NonNullable<BCFBookmark["components"]>
): NonNullable<BookmarkAppState["objectGroups"]> {
    return [
        {
            id: "",
            name: "default",
            selected: true,
            hidden: false,
            ids: components.selection?.map(component => Number(component.ifc_guid)) ?? [],
            color: [1, 0, 0],
        },
        {
            id: "",
            name: "defaultHidden",
            selected: false,
            hidden: true,
            ids: components.visibility.exceptions?.map(component => Number(component.ifc_guid)) ?? [],
            color: [1, 0, 0],
        },
        ...(components.coloring?.map((coloring, idx) => ({
            id: "",
            name: `Bookmark Color Group ${idx + 1}`,
            ids: coloring.components.map(component => Number(component.ifc_guid)),
            color: hexToVec(coloring.color),
            selected: true,
            hidden: false,
        })) ?? []),
    ];
}

export function translatePerspectiveCamera(perspectiveCamera: PerspectiveCamera): Pick<Camera, "position" | "rotation" | "fieldOfView"> {
    const direction = vec3.negate(
        vec3.create(),
        vec3.fromValues(perspectiveCamera.camera_direction.x, perspectiveCamera.camera_direction.y, perspectiveCamera.camera_direction.z)
    );

    const upVector = vec3.fromValues(
        perspectiveCamera.camera_up_vector.x,
        perspectiveCamera.camera_up_vector.y,
        perspectiveCamera.camera_up_vector.z
    );

    const cross = vec3.cross(
        vec3.create(),
        vec3.fromValues(perspectiveCamera.camera_direction.x, perspectiveCamera.camera_direction.y, perspectiveCamera.camera_direction.z),
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
            perspectiveCamera.camera_view_point.y,
            perspectiveCamera.camera_view_point.z
        ),
        rotation: quaternion,
        fieldOfView: perspectiveCamera.field_of_view,
    };
}
 */
