import { MeasureInfo, View } from "@novorender/webgl-api";
import { quat, vec2, vec3 } from "gl-matrix";

import { measureApi } from "app";

type Size = {
    width: number;
    height: number;
};

export function resetSVG({ pathName, svg }: { pathName: string; svg: SVGSVGElement }) {
    if (!svg) {
        return;
    }
    const obj = svg.children.namedItem(pathName);
    if (!obj) {
        return;
    }
    obj.innerHTML = "";
    obj.setAttribute("d", "");
    obj.setAttribute("r", "0");
}

export function renderAngles({
    anglePoint,
    fromP,
    toP,
    diffA,
    diffB,
    pathName,
    svg,
}: {
    anglePoint: vec2;
    fromP: vec2;
    toP: vec2;
    diffA: vec3;
    diffB: vec3;
    pathName: string;
    svg: SVGSVGElement;
}) {
    if (!svg) {
        return;
    }
    const angleToZ = vec3.angle(diffA, diffB) * (180 / Math.PI);
    const g = svg.children.namedItem(pathName);
    if (!g) {
        return;
    }

    const d0 = vec2.sub(vec2.create(), fromP, anglePoint);
    const d1 = vec2.sub(vec2.create(), toP, anglePoint);
    const l0 = vec2.len(d0);
    const l1 = vec2.len(d1);
    if (l0 < 40 || l1 < 40 || angleToZ < 0.1) {
        g.innerHTML = "";
        return;
    }
    vec2.scale(d0, d0, 1 / l0);
    vec2.scale(d1, d1, 1 / l1);
    const sw = d0[0] * d1[1] - d0[1] * d1[0] > 0 ? 1 : 0;
    const text = +angleToZ.toFixed(1) + "°";
    const dir = vec2.add(vec2.create(), d1, d0);
    const dirLen = vec2.len(dir);
    if (dirLen < 0.001) {
        vec2.set(dir, 0, 1);
    } else {
        vec2.scale(dir, dir, 1 / dirLen);
    }
    const angle = (Math.asin(dir[1]) * 180) / Math.PI;
    g.innerHTML = `<path d="M ${anglePoint[0] + d0[0] * 20} ${anglePoint[1] + d0[1] * 20} A 20 20, 0, 0, ${sw}, ${
        anglePoint[0] + d1[0] * 20
    } ${anglePoint[1] + d1[1] * 20}" stroke="blue" fill="transparent" stroke-width="2" stroke-linecap="square" />
                    <text text-anchor=${dir[0] < 0 ? "end" : "start"} alignment-baseline="central" fill="white" x="${
        anglePoint[0] + dir[0] * 25
    }" y="${anglePoint[1] + dir[1] * 25}" transform="rotate(${dir[0] < 0 ? -angle : angle} ${
        anglePoint[0] + dir[0] * 25
    },${anglePoint[1] + dir[1] * 25})">${text}</text>`;
}

export function moveSvgCursor({
    svg,
    view,
    size,
    x,
    y,
    measurement,
}: {
    svg: SVGSVGElement;
    view: View;
    size: Size;
    x: number;
    y: number;
    measurement: MeasureInfo | undefined;
}) {
    if (!svg || !view) {
        return;
    }
    const g = svg.children.namedItem("cursor");
    if (!g) {
        return;
    }
    if (x < 0) {
        g.innerHTML = "";
        return;
    }

    let normal =
        measurement &&
        measurement.normalVS &&
        (measurement?.normalVS?.some((v) => Number.isNaN(v)) ? undefined : vec3.clone(measurement.normalVS));
    if (normal) {
        const { width, height } = size;
        const { camera } = view;

        if (normal[2] < 0.98) {
            const angleX = (y / height - 0.5) * camera.fieldOfView;
            const angleY = ((x - width * 0.5) / height) * camera.fieldOfView;
            vec3.transformQuat(normal, normal, quat.fromEuler(quat.create(), angleX, angleY, 0));
            let style = "";
            if (normal[2] < 1) {
                const rot = vec3.cross(vec3.create(), normal, vec3.fromValues(0, 0, 1));
                vec3.normalize(rot, rot);
                const angle = (Math.acos(normal[2]) * 180) / Math.PI;
                style = `style="transform:rotate3d(${rot[0]},${-rot[1]},${rot[2]},${angle}deg)"`;
            }
            g.innerHTML = `<circle r="20" fill="rgba(255,255,255,0.25)" ${style}/><line x2="${(normal[0] * 20).toFixed(
                1
            )}" y2="${(normal[1] * -20).toFixed(1)}" stroke="lightblue" stroke-width="2" stroke-linecap="round" />`;
        } else {
            g.innerHTML = `<circle r="20" fill="rgba(255,255,255,0.25)" /><circle r="2" fill="lightblue" />`;
        }
    } else {
        g.innerHTML = `<path d="M-10,-10L10,10M-10,10L10,-10" stroke-width="2" stroke-linecap="round" stroke="${
            measurement ? "lightgreen" : "red"
        }"/>`;
    }
    g.setAttribute("transform", `translate(${x},${y})`);
}

export function getPathPoints({ view, points }: { view: View; points: vec3[] }) {
    const pts = measureApi.toPathPoints(points, view);

    if (pts && pts.flat(2).every((num) => !Number.isNaN(num) && Number.isFinite(num))) {
        const [pathPoints, pixelPoints] = pts;
        return { pixel: pixelPoints, path: pathPoints } as const;
    }
    return undefined;
}
