import { css, styled, useTheme } from "@mui/material";
import { mat3, quat, ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { Fragment, useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHighlighted } from "contexts/highlighted";
import { renderActions, selectCameraType } from "features/render/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { objIdsToTotalBoundingSphere } from "utils/objectData";

// prettier-ignore
const back = [
    -1, 0, 0, 
    0, 0, 1, 
    0, 1, 0
] as mat3;

// prettier-ignore
const front = [
    1, 0, 0, 
    0, 0, 1,
    0, -1, 0
] as mat3;

// prettier-ignore
const left = [
    0, -1, 0, 
    0, 0, 1, 
    -1, 0, 0
] as mat3;

// prettier-ignore
const right = [
    0, 1, 0, 
    0, 0, 1, 
    1, 0, 0
] as mat3;

// prettier-ignore
const top = [
    1, 0, 0, 
    0, 1, 0, 
    0, 0, 1
] as mat3;

// prettier-ignore
const bottom = [
    -1, 0, 0, 
    0, 1, 0, 
    0, 0, -1
] as mat3;

const ids = ["front", "right", "back", "left", "bottom", "top"] as const;
const rotationMats = {
    front,
    right,
    back,
    left,
    bottom,
    top,
} as { [k: string]: mat3 };

class Face {
    vertices: vec3[] = [];
    constructor(vertices: vec3[]) {
        this.vertices = vertices;
    }
}

// https://codepen.io/MRokas/pen/aNBjdQ

class Cube {
    faces: Face[] = [];

    constructor(readonly center: vec3, readonly size: number) {
        const d = size / 2;

        const vertices = [
            vec3.fromValues(center[0] - d, center[1] - d, center[2] + d),
            vec3.fromValues(center[0] - d, center[1] - d, center[2] - d),
            vec3.fromValues(center[0] + d, center[1] - d, center[2] - d),
            vec3.fromValues(center[0] + d, center[1] - d, center[2] + d),
            vec3.fromValues(center[0] + d, center[1] + d, center[2] + d),
            vec3.fromValues(center[0] + d, center[1] + d, center[2] - d),
            vec3.fromValues(center[0] - d, center[1] + d, center[2] - d),
            vec3.fromValues(center[0] - d, center[1] + d, center[2] + d),
        ];

        this.updateFaces(vertices);
    }

    private updateFaces(vertices: vec3[]) {
        this.faces = [
            new Face([vertices[0], vertices[1], vertices[2], vertices[3]]),
            new Face([vertices[3], vertices[2], vertices[5], vertices[4]]),
            new Face([vertices[4], vertices[5], vertices[6], vertices[7]]),
            new Face([vertices[7], vertices[6], vertices[1], vertices[0]]),
            new Face([vertices[7], vertices[0], vertices[3], vertices[4]]),
            new Face([vertices[1], vertices[6], vertices[5], vertices[2]]),
        ];
    }

    Project(vertex: vec3) {
        return vec2.fromValues(vertex[0], vertex[1]);
    }

    toPaths(dx: number, dy: number): Path[] {
        return this.faces.map((face, idx) => {
            const firstPoint = this.Project(face.vertices[0]);
            const mid = vec2.fromValues(
                (firstPoint[0] + face.vertices[2][0]) / 2,
                (firstPoint[1] + face.vertices[2][1]) / 2
            );

            let path = `M${firstPoint[0] + dx} ${-firstPoint[1] + dy}`;

            for (let i = 1; i < 4; ++i) {
                const point = this.Project(face.vertices[i]);
                path += ` L ${point[0] + dx} ${-point[1] + dy}`;
            }

            path += ` L ${firstPoint[0] + dx} ${-firstPoint[1] + dy}`;

            return {
                kind: "cube",
                zIndex: face.vertices.reduce((tot, v) => (tot += v[2]), 0),
                path,
                id: ids[idx],
                center: {
                    x: mid[0] + dx,
                    y: -mid[1] + dy,
                },
            };
        });
    }

    setRotation(q: quat) {
        const rot = mat3.fromQuat(mat3.create(), q);
        const d = this.size / 2;

        const vertices = [
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] - d, this.center[1] - d, this.center[2] + d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] - d, this.center[1] - d, this.center[2] - d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] + d, this.center[1] - d, this.center[2] - d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] + d, this.center[1] - d, this.center[2] + d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] + d, this.center[1] + d, this.center[2] + d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] + d, this.center[1] + d, this.center[2] - d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] - d, this.center[1] + d, this.center[2] - d),
                rot
            ),
            vec3.transformMat3(
                vec3.create(),
                vec3.fromValues(this.center[0] - d, this.center[1] + d, this.center[2] + d),
                rot
            ),
        ];
        this.updateFaces(vertices);
    }
}

const CubeContainer = styled("svg", { shouldForwardProp: (prop) => prop !== "loading" })<{ loading?: boolean }>(
    ({ loading }) => css`
        position: absolute;
        top: 30px;
        left: 30px;
        overflow: visible;
        pointer-events: none;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);

        text {
            user-select: none;
            text-transform: capitalize;
            opacity: 0.8;
            transition: opacity 0.15s ease-in-out;
        }

        path {
            transition: filter 0.15s ease-in-out;
        }

        g {
            pointer-events: auto;
            cursor: ${loading ? "progress" : "pointer"};

            ${loading
                ? ""
                : css`
                      &:hover {
                          path {
                              filter: brightness(1.5);
                          }

                          text {
                              opacity: 1;
                          }
                      }
                  `}
        }
    `
);

const createCircle = (radius: number, y: number) => {
    const circle: vec3[] = [];
    const step = 0.01745;

    for (let x = 0; x < Math.PI * 2; x += step) {
        circle.push(vec3.fromValues(radius * Math.cos(x), radius * Math.sin(x), y));
    }

    return circle;
};

class Circle {
    radius: number;
    originalPts: vec3[];
    pts: vec3[];

    constructor(radius: number, z: number) {
        this.originalPts = createCircle(radius, z);
        this.pts = createCircle(radius, z);
        this.radius = radius;
    }

    project(vertex: vec3) {
        return vec2.fromValues(vertex[0], vertex[1]);
    }

    toPaths(dx: number, dy: number): Path[] {
        const batchSize = 100;
        const batches = this.pts.reduce(
            (prev, curr) => {
                const lastBatch = prev.slice(-1)[0];

                if (lastBatch.length < batchSize) {
                    lastBatch.push(curr);
                } else {
                    prev.push([curr]);
                }

                return prev;
            },
            [[]] as vec3[][]
        );

        return batches.map((batch, idx, arr) => {
            const prevPt = idx ? arr[idx - 1][arr[idx - 1].length - 1] : arr.slice(-1)[0][arr.slice(-1)[0].length - 1];
            const firstPoint = this.project(prevPt ? prevPt : batch[0]);

            let path = `M${firstPoint[0] + dx} ${-firstPoint[1] + dy}`;

            for (let i = 1; i < batch.length; ++i) {
                const point = this.project(batch[i]);
                path += ` L ${point[0] + dx} ${-point[1] + dy}`;
            }

            return {
                kind: "circle",
                path,
                zIndex: 0,
                id: `circle-${this.radius}-${idx}`,
            };
        });
    }

    setRotation(rot: quat) {
        this.pts = this.originalPts.map((p) => vec3.transformQuat(vec3.create(), p, rot));
    }
}

class Compass {
    originalPts: [vec3, vec3, vec3, vec3];
    pts: [vec3, vec3, vec3, vec3];
    size: number;

    constructor(size: number, z: number, radius: number) {
        this.size = size;
        this.pts = [
            vec3.fromValues(0, 0 + radius, z),
            vec3.fromValues(0 + radius, 0, z),
            vec3.fromValues(0, 0 - radius, z),
            vec3.fromValues(0 - radius, 0, z),
        ];
        this.originalPts = [
            vec3.fromValues(0, 0 + radius, z),
            vec3.fromValues(0 + radius, 0, z),
            vec3.fromValues(0, 0 - radius, z),
            vec3.fromValues(0 - radius, 0, z),
        ];
    }

    project(vertex: vec3) {
        return vec2.fromValues(vertex[0], vertex[1]);
    }

    setRotation(rot: quat) {
        this.pts = this.originalPts.map((p) => vec3.transformQuat(vec3.create(), p, rot)) as typeof this.originalPts;
    }

    toPaths(): Path {
        const n = this.project(this.pts[0]);
        const e = this.project(this.pts[1]);
        const s = this.project(this.pts[2]);
        const w = this.project(this.pts[3]);

        return {
            kind: "compass",
            path: "",
            pts: [n, e, s, w],
            zIndex: -1,
            id: `compass-${this.size}`,
        };
    }
}

const cubeSize = 85;
const triangleSize = 15;
const radius = cubeSize + triangleSize;
const cube = new Cube([0, 0, 0], cubeSize);
const innerCircle = new Circle(radius, radius / 2 + 10);
const compass = new Compass(15, radius / 2 + 10, radius);

type Path = {
    id: string;
    zIndex: number;
    path: string;
} & (
    | { kind: "cube"; center: { x: number; y: number } }
    | { kind: "compass"; pts: [n: vec2, e: vec2, s: vec2, w: vec2] }
    | { kind: "circle" }
);

export function NavigationCube() {
    const theme = useTheme();
    const {
        state: { view, db, scene },
    } = useExplorerGlobals(true);
    const highlighted = useHighlighted().idArr;
    const prevPivotPt = useRef<ReadonlyVec3>();
    const [circlePaths, setCirclePaths] = useState([] as Path[]);
    const [cubePaths, setCubePaths] = useState([] as Path[]);
    const [compassPaths, setCompassPath] = useState([] as Path[]);
    const [loading, setLoading] = useMountedState(false);
    const [abortController, abort] = useAbortController();
    const cameraType = useAppSelector(selectCameraType);
    const dispatch = useAppDispatch();

    const highlightedBoundingSphereCenter = useRef<ReadonlyVec3>();
    const prevRotation = useRef<quat>();
    const animationFrameId = useRef<number>(-1);

    useEffect(() => {
        prevPivotPt.current = undefined;
        highlightedBoundingSphereCenter.current = undefined;
        abort();
    }, [highlighted, abort]);

    const handleClick = (face: string) => async () => {
        if (!face || loading) {
            return;
        }

        let pt: ReadonlyVec3 | undefined = vec3.clone(view.renderState.camera.position);

        if (highlighted.length) {
            const abortSignal = abortController.current.signal;
            const prevCenter = highlightedBoundingSphereCenter.current;

            if (prevCenter) {
                pt = prevCenter;
            } else {
                setLoading(true);

                try {
                    pt =
                        highlightedBoundingSphereCenter.current ??
                        (
                            await objIdsToTotalBoundingSphere({
                                ids: highlighted,
                                abortSignal,
                                db,
                                flip: !vec3.equals(scene.up ?? [0, 1, 0], [0, 0, 1]),
                            })
                        )?.center;

                    highlightedBoundingSphereCenter.current = pt;
                } catch {
                    if (abortSignal.aborted) {
                        pt = undefined;
                    }
                }

                setLoading(false);
            }
        }

        if (!pt) {
            return;
        }

        const ab = vec3.sub(vec3.create(), view.renderState.camera.position, [pt[0], pt[1], pt[2]]);
        const len = vec3.len(ab);
        const mat = rotationMats[face];
        const dir = vec3.fromValues(0, 0, 1);
        vec3.transformMat3(dir, dir, mat);
        vec3.scale(dir, dir, len);

        vec3.transformMat3(ab, ab, mat);
        const target = vec3.add(vec3.create(), [pt[0], pt[1], pt[2]], dir);

        dispatch(
            renderActions.setCamera({
                type: cameraType,
                goTo: {
                    position: target,
                    rotation: quat.fromMat3(quat.create(), mat),
                    fov: view.renderState.camera.fov,
                },
            })
        );
    };

    useEffect(() => {
        animate();

        function animate() {
            if (!prevRotation.current || !quat.equals(prevRotation.current, view.renderState.camera.rotation)) {
                prevRotation.current = quat.clone(view.renderState.camera.rotation);

                const rot = view.renderState.camera.rotation;
                const q = quat.fromValues(rot[0], rot[1], -rot[2], rot[3]);
                cube.setRotation(q);
                innerCircle.setRotation(q);
                compass.setRotation(q);

                setCubePaths(cube.toPaths(cubeSize, cubeSize));
                setCirclePaths(innerCircle.toPaths(cubeSize, cubeSize));
                setCompassPath([compass.toPaths()]);
            }

            animationFrameId.current = requestAnimationFrame(() => animate());
        }

        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view]);

    return (
        <CubeContainer loading={loading} height={cubeSize * 2} width={cubeSize * 2}>
            <defs>
                <linearGradient id="navigation-cube-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style={{ stopColor: theme.palette.secondary.dark, stopOpacity: 1 }} />
                    <stop
                        offset="100%"
                        style={{
                            stopColor: loading ? theme.palette.secondary.dark : theme.palette.secondary.main,
                            stopOpacity: 1,
                        }}
                    />
                </linearGradient>
            </defs>

            {circlePaths.map((path) =>
                path.kind === "circle" ? (
                    <path
                        stroke={"rgba(100,100,100, .3)"}
                        fill={"none"}
                        strokeWidth={1}
                        d={path.path}
                        key={`${path.id}`}
                        id={path.id}
                    />
                ) : null
            )}

            {compassPaths.map((path) =>
                path.kind === "compass"
                    ? path.pts.map((pt, i) => (
                          <text
                              key={i}
                              x={pt[0] + cubeSize}
                              y={-pt[1] + cubeSize}
                              dominantBaseline="middle"
                              textAnchor="middle"
                              fill="#fff"
                              fontWeight={"bold"}
                          >
                              {i === 0 ? "N" : i === 1 ? "E" : i === 2 ? "S" : "W"}
                          </text>
                      ))
                    : null
            )}

            {[...cubePaths]
                .sort((a, b) => b.zIndex - a.zIndex)
                .map((path) =>
                    path.kind === "cube" ? (
                        <Fragment key={path.id}>
                            <g onClick={handleClick(path.id)}>
                                <path
                                    stroke={theme.palette.secondary.light}
                                    strokeWidth={1}
                                    fill={"url(#navigation-cube-gradient)"}
                                    id={path.id}
                                    d={path.path}
                                />
                                <text
                                    x={
                                        path.center.x <= cubeSize - cubeSize / 5
                                            ? path.center.x - (cubeSize - cubeSize / 5 - path.center.x)
                                            : path.center.x >= cubeSize + cubeSize / 5
                                            ? path.center.x + (path.center.x - (cubeSize + cubeSize / 5))
                                            : path.center.x
                                    }
                                    y={
                                        path.center.y <= cubeSize - cubeSize / 3.5
                                            ? path.center.y - (cubeSize - cubeSize / 3.5 - path.center.y)
                                            : path.center.y >= cubeSize + cubeSize / 3.5
                                            ? path.center.y + (path.center.y - (cubeSize + cubeSize / 3.5))
                                            : path.center.y
                                    }
                                    dominantBaseline="middle"
                                    textAnchor="middle"
                                    fill="#fff"
                                >
                                    {path.id}
                                </text>
                            </g>
                        </Fragment>
                    ) : null
                )}
        </CubeContainer>
    );
}
