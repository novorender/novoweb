import { View } from "@novorender/api";
import { quat, vec2, vec3 } from "gl-matrix";

import { isRealVec } from "utils/misc";

type Size = {
    width: number;
    height: number;
};

export function moveSvgCursor({
    svg,
    view,
    size,
    x,
    y,
    pickResult,
    color,
    overrideKind = undefined,
}: {
    svg: SVGSVGElement;
    view: View;
    size: Size;
    x: number;
    y: number;
    pickResult:
        | {
              position: vec3;
              normal: vec3;
              sampleType: "edge" | "corner" | "surface" | undefined;
              normalVS: vec3;
              x: number;
              y: number;
              objectId: number;
              deviation?: number | undefined;
              depth: number;
          }
        | undefined;
    color: string;
    overrideKind: "edge" | "corner" | "surface" | "cross" | "gizmo" | undefined;
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
    if (overrideKind === "cross") {
        g.innerHTML = `<path d="M-10,0L10,0M0,-10L0,10" stroke-width="2" stroke-linecap="round" stroke="${
            color || "red"
        }"/>`;
    } else if (overrideKind === "gizmo" && pickResult) {
        const pos = pickResult.position;
        const z0 = pos;
        const z1 = vec3.add(vec3.create(), pos, pickResult.normal);
        const xDir = vec3.cross(vec3.create(), pickResult.normal, vec3.fromValues(0, 0, 1));
        vec3.normalize(xDir, xDir);
        const x0 = vec3.add(vec3.create(), pos, xDir);
        const x1 = vec3.scaleAndAdd(vec3.create(), pos, xDir, -1);
        const yDir = vec3.cross(vec3.create(), pickResult.normal, xDir);
        vec3.normalize(yDir, yDir);
        const y0 = vec3.add(vec3.create(), pos, yDir);
        const y1 = vec3.scaleAndAdd(vec3.create(), pos, yDir, -1);
        const [sx0, sx1, sy0, sy1, sz0, sz1] = view.convert.worldSpaceToScreenSpace([x0, x1, y0, y1, z0, z1]);

        if (!sz0) {
            return;
        }

        const drawPath = (p0: vec2 | undefined, p1: vec2 | undefined, color: string) => {
            if (!p0 || !p1) {
                return "";
            }
            p0 = vec2.sub(vec2.create(), p0, sz0);
            p1 = vec2.sub(vec2.create(), p1, sz0);
            return `<path d="M${p0[0]} ${p0[1]}L${p1[0]} ${p1[1]}" stroke-width="2" stroke-linecap="round" stroke="${color}" />`;
        };

        g.innerHTML = [
            drawPath(sx0, sx1, "#8BC34A"), // green
            drawPath(sy0, sy1, "#03A9F4"), // blue
            drawPath(sz0, sz1, "#F44336"), // red
        ].join("");
    } else {
        const kind = (overrideKind ? overrideKind : pickResult?.sampleType) ?? "corner";

        const normal =
            kind === "surface" && pickResult?.normalVS && isRealVec(pickResult.normalVS)
                ? vec3.clone(pickResult.normalVS)
                : undefined;
        if (normal) {
            const { width, height } = size;
            const { camera } = view.renderState;

            if (normal[2] < 0.98) {
                const angleX = (y / height - 0.5) * camera.fov;
                const angleY = ((x - width * 0.5) / height) * camera.fov;
                vec3.transformQuat(normal, normal, quat.fromEuler(quat.create(), angleX, angleY, 0));
                let style = "";
                if (normal[2] < 1) {
                    const rot = vec3.cross(vec3.create(), normal, vec3.fromValues(0, 0, 1));
                    vec3.normalize(rot, rot);
                    const angle = (Math.acos(normal[2]) * 180) / Math.PI;
                    style = `style="transform:rotate3d(${rot[0]},${-rot[1]},${rot[2]},${angle}deg)"`;
                }
                g.innerHTML = `<circle r="20" fill="rgba(255,255,255,0.25)" ${style}/><line x2="${(
                    normal[0] * 20
                ).toFixed(1)}" y2="${(normal[1] * -20).toFixed(
                    1,
                )}" stroke=${color} stroke-width="2" stroke-linecap="round" />`;
            } else {
                g.innerHTML = `<circle r="20" fill="rgba(255,255,255,0.25)" /><circle r="2" fill=${color} />`;
            }
        } else {
            if (kind === "edge") {
                g.innerHTML = `<path d="M-12,0L12,0M0,-7L0,7" stroke-width="2" stroke-linecap="round" stroke="${
                    color || "red"
                }"/>`;
            } else {
                g.innerHTML = `<path d="M-10,-10L10,10M-10,10L10,-10" stroke-width="2" stroke-linecap="round" stroke="${
                    color || "red"
                }"/>`;
            }
        }
    }

    g.setAttribute("transform", `translate(${x},${y})`);
}
