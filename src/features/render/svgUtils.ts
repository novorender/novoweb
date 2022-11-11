import { MeasureInfo, View } from "@novorender/webgl-api";
import { quat, vec2, vec3 } from "gl-matrix";

import { measureApi } from "app";

import { inversePixelRatio } from "./utils";
import { DrawableEntity, MeasureScene, MeasureSettings } from "@novorender/measure-api";

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
    const normal = measurement?.normalVS?.some((v) => Number.isNaN(v)) ? undefined : measurement?.normalVS;
    if (normal) {
        const { width, height } = size;
        const { camera } = view;

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
        g.innerHTML = `<path d="M-10,-10L10,10M-10,10L10,-10" stroke-width="2" stroke-linecap="round" stroke="${
            measurement ? "lightgreen" : "red"
        }"/>`;
    }
    g.setAttribute("transform", `translate(${x},${y})`);
}

export function getPathPoints({ view, points }: { view: View; points: vec3[] }) {
    const pts = measureApi.toPathPoints(points, view);

    if (pts && pts.flat(2).every((num) => !Number.isNaN(num) && Number.isFinite(num))) {
        const [_pathPoints, _pixelPoints] = pts;
        const path = inversePixelRatio(_pathPoints as vec2[]);
        const pixel = inversePixelRatio(_pixelPoints as vec2[]);
        return { pixel, path } as const;
    }
    return undefined;
}

export function renderSingleMeasurePoint({
    svg,
    pixelPoint,
    pointName,
}: {
    svg: SVGSVGElement;
    pixelPoint: vec2;
    pointName: string;
}) {
    if (!svg) {
        return;
    }
    const circle = svg.children.namedItem(pointName);
    if (circle) {
        circle.setAttribute("r", "5");
        circle.setAttribute("cx", pixelPoint[0].toFixed(1));
        circle.setAttribute("cy", pixelPoint[1].toFixed(1));
    }
}

export function renderMeasurePoints({
    svg,
    svgNames,
    text,
    points,
    closed = true,
}: {
    svg: SVGSVGElement;
    svgNames: { path?: string; point?: string };
    text?: { textName: string; value: number[]; type: "distance" | "center"; unit?: string; multitext?: boolean };
    points: { pixel: vec2[]; path: vec2[] } | undefined;
    closed?: boolean;
}) {
    if (!svg) {
        return;
    }

    if (svgNames.path) {
        let curve = "";
        if (points && points.path.length > 1) {
            curve += `M${points.path[0][0]}, ${points.path[0][1]}`;
            for (let i = 0; i < points.path.length; ++i) {
                curve += ` L${points.path[i][0]}, ${points.path[i][1]}`;
            }
        }
        const path = svg.children.namedItem(svgNames.path);

        if (closed && curve) {
            curve += " Z";
        }

        if (path) {
            path.setAttribute("d", curve);
        }
    }
    if (svgNames.point) {
        if (points && points.pixel.length) {
            points.pixel.forEach((p, i) => {
                const circle = svg.children.namedItem(`${svgNames.point}_${i}`);
                if (circle) {
                    circle.setAttribute("cx", p[0].toFixed(1));
                    circle.setAttribute("cy", p[1].toFixed(1));
                }
            });
        } else {
            const circles = svg.querySelectorAll(`[id^='${svgNames.point}_']`);
            circles.forEach((circle) => {
                circle.removeAttribute("cx");
                circle.removeAttribute("cy");
            });
        }
    }
    if (text) {
        for (let i = 0; i < text.value.length; ++i) {
            const textEl =
                text.multitext === true
                    ? svg.children.namedItem(`${text.textName}_${i}`)
                    : svg.children.namedItem(text.textName);
            if (!textEl) {
                return;
            }
            if (points === undefined) {
                textEl.innerHTML = "";
                return;
            }
            if (text.type === "distance") {
                if (points.path.length < i + 1) {
                    textEl.innerHTML = "";
                    return;
                }
                const _text = `${+text.value[i].toFixed(3)} ${text.unit ? text.unit : "m"}`;
                let dir =
                    points.path[i][0] > points.path[i + 1][0]
                        ? vec2.sub(vec2.create(), points.path[0], points.path[1])
                        : vec2.sub(vec2.create(), points.path[1], points.path[0]);
                const pixLen = _text.length * 12 + 20;
                if (vec2.sqrLen(dir) > pixLen * pixLen) {
                    const angle = (Math.asin(dir[1] / vec2.len(dir)) * 180) / Math.PI;
                    const off = vec3.fromValues(0, 0, -1);
                    vec3.scale(off, vec3.normalize(off, vec3.cross(off, off, vec3.fromValues(dir[0], dir[1], 0))), 5);
                    const center = vec2.create();
                    vec2.lerp(center, points.path[i], points.path[i + 1], 0.5);
                    textEl.setAttribute("x", (center[0] + off[0]).toFixed(1));
                    textEl.setAttribute("y", (center[1] + off[1]).toFixed(1));
                    textEl.setAttribute("transform", `rotate(${angle} ${center[0] + off[0]},${center[1] + off[1]})`);
                    textEl.innerHTML = _text;
                } else {
                    textEl.innerHTML = "";
                }
            } else if (text.type === "center") {
                if (points.path.length < 2 || text.value[0] === 0) {
                    textEl.innerHTML = "";
                    return;
                }
                const _text = `${text.value[0].toFixed(3)} ${text.unit ? text.unit : "m"}`;
                const center = vec2.create();
                for (const p of points.path) {
                    vec2.add(center, center, p);
                }
                textEl.setAttribute("x", (center[0] / points.path.length).toFixed(1));
                textEl.setAttribute("y", (center[1] / points.path.length).toFixed(1));
                textEl.innerHTML = _text;
            }
        }
        const textEl = svg.children.namedItem(text.textName);
        if (!textEl) {
            return;
        }
        if (points === undefined) {
            textEl.innerHTML = "";
            return;
        }
        if (text.type === "distance") {
            if (points.path.length !== 2) {
                textEl.innerHTML = "";
                return;
            }
            const _text = `${+text.value[0].toFixed(3)} ${text.unit ? text.unit : "m"}`;
            let dir =
                points.path[0][0] > points.path[1][0]
                    ? vec2.sub(vec2.create(), points.path[0], points.path[1])
                    : vec2.sub(vec2.create(), points.path[1], points.path[0]);
            const pixLen = _text.length * 12 + 20;
            if (vec2.sqrLen(dir) > pixLen * pixLen) {
                const angle = (Math.asin(dir[1] / vec2.len(dir)) * 180) / Math.PI;
                const off = vec3.fromValues(0, 0, -1);
                vec3.scale(off, vec3.normalize(off, vec3.cross(off, off, vec3.fromValues(dir[0], dir[1], 0))), 5);
                const center = vec2.create();
                vec2.lerp(center, points.path[0], points.path[1], 0.5);
                textEl.setAttribute("x", (center[0] + off[0]).toFixed(1));
                textEl.setAttribute("y", (center[1] + off[1]).toFixed(1));
                textEl.setAttribute("transform", `rotate(${angle} ${center[0] + off[0]},${center[1] + off[1]})`);
                textEl.innerHTML = _text;
            } else {
                textEl.innerHTML = "";
            }
        } else if (text.type === "center") {
            if (points.path.length < 2 || text.value[0] === 0) {
                textEl.innerHTML = "";
                return;
            }
            const _text = `${text.value[0].toFixed(3)} ${text.unit ? text.unit : "m"}`;
            const center = vec2.create();
            for (const p of points.path) {
                vec2.add(center, center, p);
            }
            textEl.setAttribute("x", (center[0] / points.path.length).toFixed(1));
            textEl.setAttribute("y", (center[1] / points.path.length).toFixed(1));
            textEl.innerHTML = _text;
        }
    }
}

export async function renderMeasureObject({
    svg,
    view,
    measureScene,
    fillColor,
    pathName,
    entity,
    advancedDrawing = false,
    measureSettings = undefined,
}: {
    svg: SVGSVGElement;
    view: View;
    measureScene: MeasureScene;
    fillColor: string;
    pathName: string;
    entity: DrawableEntity;
    advancedDrawing: boolean;
    measureSettings: undefined | MeasureSettings;
}) {
    let path = svg.children.namedItem(pathName + (advancedDrawing ? "_0" : ""));

    if (!path) {
        return;
    }

    const topZCol = "green";
    const botZCol = "red";
    const drawProduct = await measureApi.getDrawMeasureEntity(view, measureScene, entity, measureSettings);
    if (drawProduct) {
        for (let i = 0; i < 3; ++i) {
            const cleanPath = svg.children.namedItem(pathName + "_" + i);
            if (cleanPath) {
                cleanPath.setAttribute("d", "");
            }
        }

        let pathIdx = 0;
        let fillCurves = "";
        let edgeCurves = "";
        let topFirst = false;

        const flush = () => {
            if (!path) {
                return;
            }
            const hasEdgeDrawing = edgeCurves.length > 0;
            if (hasEdgeDrawing) {
                path.setAttribute("d", edgeCurves);
                edgeCurves = "";
                path.setAttribute("fill", "none");
            }
            if (fillCurves.length > 0) {
                if (hasEdgeDrawing) {
                    path = svg.children.namedItem(pathName + "_filled");
                }
                if (path) {
                    path.setAttribute("d", fillCurves);
                    fillCurves = "";
                    path.setAttribute("fill", fillColor);
                }
            }
        };

        for (const drawObject of drawProduct.objects) {
            for (const part of drawObject.parts) {
                if (part.vertices2D === undefined) {
                    continue;
                }
                if (pathIdx !== 0) {
                    flush();
                    path = svg.children.namedItem(pathName + "_" + pathIdx);
                    if (!path) {
                        return;
                    }
                    const col = pathIdx === 1 ? (topFirst ? topZCol : botZCol) : topFirst ? botZCol : topZCol;
                    path.setAttribute("stroke", col);
                    pathIdx++;
                }
                if (part && part.vertices2D.length > 1) {
                    part.vertices2D = inversePixelRatio(part.vertices2D as vec2[]);
                    const cylinderDawing =
                        advancedDrawing &&
                        part.elevation &&
                        part.elevation.from !== part.elevation.to &&
                        part.vertices2D.length === 2;
                    if (part.elevation && cylinderDawing) {
                        //Special handle to cylinders
                        path!.setAttribute("stroke", "url(#gr_" + entity.ObjectId + ")");
                        let flip = false;

                        const defs = svg.children.namedItem("gr_def_" + entity.ObjectId);
                        const gradient = defs?.children[0];
                        topFirst = part.elevation.from > part.elevation.to;
                        if (gradient) {
                            if (part.elevation.horizontalDisplay) {
                                flip = topFirst
                                    ? part.vertices2D[0][0] < part.vertices2D[1][0]
                                    : part.vertices2D[0][0] > part.vertices2D[1][0];
                                gradient.setAttribute("x2", "1");
                                gradient.setAttribute("y2", "0");
                            } else {
                                flip = topFirst
                                    ? part.vertices2D[0][1] < part.vertices2D[1][1]
                                    : part.vertices2D[0][1] > part.vertices2D[1][1];
                                gradient.setAttribute("x2", "0");
                                gradient.setAttribute("y2", "1");
                            }

                            if (flip) {
                                gradient.children[0].setAttribute("stop-color", topZCol);
                                gradient.children[1].setAttribute("stop-color", botZCol);
                            } else {
                                gradient.children[0].setAttribute("stop-color", botZCol);
                                gradient.children[1].setAttribute("stop-color", topZCol);
                            }
                        }
                        pathIdx++;
                    }
                    if (part.drawType === "lines") {
                        edgeCurves += `M${part.vertices2D[0][0]}, ${part.vertices2D[0][1]}`;
                        for (let i = 0; i < part.vertices2D.length; ++i) {
                            edgeCurves += ` L${part.vertices2D[i][0]}, ${part.vertices2D[i][1]}`;
                        }
                    } else {
                        fillCurves += `M${part.vertices2D[0][0]}, ${part.vertices2D[0][1]}`;
                        for (let i = 0; i < part.vertices2D.length; ++i) {
                            fillCurves += ` L${part.vertices2D[i][0]}, ${part.vertices2D[i][1]}`;
                        }
                    }
                }
            }
        }
        flush();
    }
}
