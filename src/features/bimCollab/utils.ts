import { Camera } from "@novorender/webgl-api";
import { vec3, mat3, quat } from "gl-matrix";

const refreshTokenKey = "BIMcollab_refresh_token";

export function storeRefreshToken(token: string): void {
    localStorage.setItem(refreshTokenKey, token);
}

export function getStoredRefreshToken(): string {
    return localStorage.getItem(refreshTokenKey) ?? "";
}

export function deleteStoredRefreshToken() {
    localStorage.removeItem(refreshTokenKey);
}

const codeVerifierKey = "BIMcollab_code_verifier";

export function storeCodeVerifier(verifier: string) {
    sessionStorage.setItem(codeVerifierKey, verifier);
}

export function getStoredCodeVerifier(): string {
    return sessionStorage.getItem(codeVerifierKey) ?? "";
}

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
