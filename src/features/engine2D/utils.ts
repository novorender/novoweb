import { DrawPart, DrawProduct, View } from "@novorender/api";
import { quat, ReadonlyVec2, ReadonlyVec3, vec2, vec3 } from "gl-matrix";

import { CameraType } from "features/render";

export interface ColorSettings {
    lineColor?: string | CanvasGradient | string[];
    fillColor?: string | CanvasPattern;
    pointColor?: string | { start: string; middle: string; end: string };
    outlineColor?: string;
    complexCylinder?: boolean;
    displayAllPoints?: boolean;
    lineDash?: number[];
}

export interface TextSettings {
    type: "centerOfLine" | "center" | "default";
    unit?: string;
    customText?: string[];
}

export interface CameraState {
    pos: ReadonlyVec3;
    dir: ReadonlyVec3;
    type: CameraType;
}

type CapStyle = "arrow";

export interface LineCap {
    end?: CapStyle;
    start?: CapStyle;
}

export function drawProduct(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    product: DrawProduct,
    colorSettings: ColorSettings,
    pixelWidth: number,
    textSettings?: TextSettings,
    lineCap?: LineCap,
) {
    for (const obj of product.objects) {
        if (colorSettings.complexCylinder && obj.kind === "cylinder") {
            let startCol = "red";
            let endCol = "lime";
            const cylinderLine = obj.parts[0];
            if (cylinderLine.elevation && cylinderLine.vertices2D && !Array.isArray(cylinderLine.elevation)) {
                if (cylinderLine.elevation.from > cylinderLine.elevation.to) {
                    const tmp = startCol;
                    startCol = endCol;
                    endCol = tmp;
                }
                const gradX = vec2.fromValues(cylinderLine.vertices2D[0][0], cylinderLine.vertices2D[1][0]);
                const gradY = vec2.fromValues(cylinderLine.vertices2D[0][1], cylinderLine.vertices2D[1][1]);
                const gradient = ctx.createLinearGradient(gradX[0], gradY[0], gradX[1], gradY[1]);
                gradient.addColorStop(0, startCol);
                gradient.addColorStop(1, endCol);
                drawPart(
                    ctx,
                    camera,
                    cylinderLine,
                    { lineColor: gradient, outlineColor: "rgba(80, 80, 80, .8)" },
                    pixelWidth,
                    { type: "centerOfLine", unit: " " },
                );
            }

            for (let i = 1; i < 3; ++i) {
                const top = i === 1;
                const col = top ? startCol : endCol;
                drawPart(
                    ctx,
                    camera,
                    obj.parts[i],
                    { lineColor: col, outlineColor: "rgba(80, 80, 80, .8)" },
                    pixelWidth,
                    { type: "center" },
                );
            }

            if (textSettings) {
                for (let i = 3; i < obj.parts.length; ++i) {
                    drawPart(ctx, camera, obj.parts[i], colorSettings, pixelWidth, textSettings, lineCap);
                }
            }
        } else {
            obj.parts.forEach((part) => {
                if (part.drawType === "text" && !textSettings) {
                    return;
                }
                drawPart(ctx, camera, part, colorSettings, pixelWidth, textSettings, lineCap);
            });
        }
    }
}

export function drawPart(
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    part: DrawPart,
    colorSettings: ColorSettings,
    pixelWidth: number,
    textSettings?: TextSettings,
    lineCap?: LineCap,
): boolean {
    if (part.vertices2D) {
        ctx.lineWidth = pixelWidth;
        ctx.fillStyle = colorSettings.fillColor ?? "transparent";
        ctx.strokeStyle = getLineColor(colorSettings.lineColor, 0);
        if (part.drawType === "angle" && part.vertices2D.length === 3 && part.text) {
            return drawAngle(ctx, camera, part);
        } else if (part.drawType === "text") {
            return drawTextPart(ctx, part, camera);
        } else if (part.drawType === "lines" || part.drawType === "filled") {
            return drawLinesOrPolygon(ctx, part, colorSettings, textSettings, lineCap);
        } else if (part.drawType === "vertex") {
            return drawPoints(ctx, part, colorSettings);
        }
    }
    return false;
}
function drawTextPart(ctx: CanvasRenderingContext2D, part: DrawPart, camera: CameraState) {
    if (part.drawType === "text" && part.text && part.vertices2D) {
        if (Array.isArray(part.text)) {
            if (part.text.length === 1 && part.indicesOnScreen) {
                let index = 0;
                let bestCase = Number.MAX_VALUE;
                for (; index < part.text[0].length && index < part.vertices2D.length; ++index) {
                    //Binary search could improve performance
                    const dist = vec3.dist(part.vertices3D[part.indicesOnScreen[index]], camera.pos);
                    if (dist > bestCase) {
                        break;
                    }
                    bestCase = dist;
                }

                let incrementer = 1;
                let numSinceInrement = 0;
                let prevPos: ReadonlyVec2 | undefined;
                for (
                    let i = index;
                    i < part.text[0].length && i < part.vertices2D.length;
                    i += incrementer, numSinceInrement++
                ) {
                    if (numSinceInrement === 5) {
                        incrementer *= 2;
                        numSinceInrement = 0;
                    }
                    if (prevPos) {
                        if (vec2.dist(prevPos, part.vertices2D[i]) < 50) {
                            continue;
                        }
                    }
                    prevPos = part.vertices2D[i];
                    drawText(ctx, [part.vertices2D[i]], part.text[0][part.indicesOnScreen[i]]);
                }

                incrementer = 1;
                numSinceInrement = 0;
                for (let i = index - 1; i >= 0; i -= incrementer, numSinceInrement++) {
                    if (numSinceInrement === 5) {
                        incrementer *= 2;
                        numSinceInrement = 0;
                    }
                    if (prevPos) {
                        if (vec2.dist(prevPos, part.vertices2D[i]) < 50) {
                            continue;
                        }
                    }
                    prevPos = part.vertices2D[i];
                    drawText(ctx, [part.vertices2D[i]], part.text[0][part.indicesOnScreen[i]]);
                }
                return true;
            }
            return false;
        } else {
            return drawText(ctx, part.vertices2D, part.text);
        }
    }
    return false;
}

function drawAngle(ctx: CanvasRenderingContext2D, camera: CameraState, part: DrawPart) {
    if (part.vertices2D) {
        ctx.fillStyle = "transparent";
        const anglePoint = part.vertices2D[0];
        const fromP = part.vertices2D[1];
        const toP = part.vertices2D[2];
        const d0 = vec2.sub(vec2.create(), fromP, anglePoint);
        const d1 = vec2.sub(vec2.create(), toP, anglePoint);
        const l0 = vec2.len(d0);
        const l1 = vec2.len(d1);
        const camDist = vec3.distance(camera.pos, part.vertices3D[0]);

        const dirA = vec3.sub(vec3.create(), part.vertices3D[1], part.vertices3D[0]);
        vec3.normalize(dirA, dirA);
        const dirB = vec3.sub(vec3.create(), part.vertices3D[2], part.vertices3D[0]);
        vec3.normalize(dirB, dirB);
        const dirCamA = vec3.sub(vec3.create(), part.vertices3D[1], camera.pos);
        const dirCamB = vec3.sub(vec3.create(), part.vertices3D[2], camera.pos);
        const dirCamP = vec3.sub(vec3.create(), part.vertices3D[0], camera.pos);
        const norm = vec3.cross(vec3.create(), dirA, dirB);
        vec3.normalize(norm, norm);
        vec3.normalize(dirCamA, dirCamA);
        vec3.normalize(dirCamB, dirCamB);
        vec3.normalize(dirCamP, dirCamP);

        if (camera.type === CameraType.Pinhole && Math.abs(vec3.dot(dirCamP, norm)) < 0.15) {
            return false;
        }

        if (camDist > (l0 + l1) / 10) {
            return false;
        }
        if (l0 < 40 || l1 < 40) {
            return false;
        }
        vec2.scale(d0, d0, 1 / l0);
        vec2.scale(d1, d1, 1 / l1);
        if (part.text && part.text === "90.0°") {
            const start = vec2.scaleAndAdd(vec2.create(), anglePoint, d0, 20);
            const mid = vec2.scaleAndAdd(vec2.create(), start, d1, 20);
            const end = vec2.scaleAndAdd(vec2.create(), mid, d0, -20);
            ctx.beginPath();
            ctx.moveTo(start[0], start[1]);
            ctx.lineTo(mid[0], mid[1]);
            ctx.lineTo(end[0], end[1]);
            ctx.stroke();
        } else {
            const dir = vec2.add(vec2.create(), d1, d0);
            const dirLen = vec2.len(dir);
            if (dirLen < 0.001) {
                vec2.set(dir, 0, 1);
            } else {
                vec2.scale(dir, dir, 1 / dirLen);
            }

            let angleA = Math.atan2(d0[1], d0[0]);
            let angleB = Math.atan2(d1[1], d1[0]);

            const sw = d0[0] * d1[1] - d0[1] * d1[0];

            if (sw < 0) {
                const tmp = angleA;
                angleA = angleB;
                angleB = tmp;
            }

            ctx.beginPath();

            ctx.arc(anglePoint[0], anglePoint[1], 50, angleA, angleB);
            ctx.stroke();

            if (part.text && !Array.isArray(part.text)) {
                ctx.fillStyle = "white";
                ctx.strokeStyle = "black";
                ctx.lineWidth = 2;
                ctx.font = `bold ${16}px "Open Sans", sans-serif`;

                const textX = anglePoint[0] + dir[0] * 25;
                const textY = anglePoint[1] + dir[1] * 25;
                ctx.translate(textX, textY);
                ctx.strokeText(part.text, 0, 0);
                ctx.fillText(part.text, 0, 0);
                ctx.resetTransform();
            }
        }

        return true;
    }
    return false;
}

function drawLinesOrPolygon(
    ctx: CanvasRenderingContext2D,
    part: DrawPart,
    colorSettings: ColorSettings,
    text?: TextSettings,
    lineCap?: LineCap,
) {
    const lineColArray = colorSettings.lineColor !== undefined && Array.isArray(colorSettings.lineColor);
    if (part.vertices2D) {
        if (lineCap?.start === "arrow") {
            const dir = vec2.sub(vec2.create(), part.vertices2D[1], part.vertices2D[0]);
            ctx.fillStyle = colorSettings.outlineColor ?? "black";
            vec2.normalize(dir, dir);
            drawArrow(ctx, part.vertices2D[0], dir, 20);
        }
        ctx.beginPath();
        if (colorSettings.lineDash) {
            ctx.setLineDash(colorSettings.lineDash);
        }
        ctx.moveTo(part.vertices2D[0][0], part.vertices2D[0][1]);

        for (let i = 1; i < part.vertices2D.length; ++i) {
            const drawArrowAndReset = (vertices: [ReadonlyVec2, ReadonlyVec2], arrowIdx: number, resetIdx: number) => {
                ctx.fillStyle = colorSettings.outlineColor ?? "black";
                ctx.stroke();
                const startIdx = arrowIdx == 0 ? 1 : 0;
                const endIdx = 1 - startIdx;
                const dir = vec2.sub(vec2.create(), vertices[endIdx], vertices[startIdx]);
                vec2.normalize(dir, dir);
                drawArrow(ctx, vertices[arrowIdx], dir, 20);
                ctx.beginPath();
                ctx.moveTo(vertices[resetIdx][0], vertices[resetIdx][1]);
            };

            ctx.lineTo(part.vertices2D[i][0], part.vertices2D[i][1]);
            if (lineCap?.end === "arrow") {
                drawArrowAndReset([part.vertices2D[i], part.vertices2D[i - 1]], 0, 0);
            }
            if (Array.isArray(part.elevation)) {
                const currentElevation = part.elevation[i - 1];
                if (currentElevation && currentElevation.slope) {
                    const arrowIdx = currentElevation.from < currentElevation.to ? 1 : 0;
                    drawArrowAndReset([part.vertices2D[i], part.vertices2D[i - 1]], arrowIdx, 0);
                }
            }
            if (lineColArray) {
                ctx.strokeStyle = getLineColor(colorSettings.lineColor, i - 1);
                ctx.lineCap = "butt";
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(part.vertices2D[i][0], part.vertices2D[i][1]);
            }
        }
        if (colorSettings.lineDash) {
            ctx.setLineDash([]);
        }

        if (part.voids) {
            ctx.closePath();
            part.voids.forEach((drawVoid) => {
                if (drawVoid.vertices2D) {
                    ctx.moveTo(drawVoid.vertices2D[0][0], drawVoid.vertices2D[0][1]);
                    for (let i = 1; i < drawVoid.vertices2D.length; ++i) {
                        ctx.lineTo(drawVoid.vertices2D[i][0], drawVoid.vertices2D[i][1]);
                    }
                    ctx.closePath();
                }
            });
        }

        if (part.drawType === "filled") {
            ctx.closePath();
            ctx.fill();
        }

        if (colorSettings.outlineColor && colorSettings.lineColor && !lineColArray) {
            const tmpWidth = ctx.lineWidth;
            ctx.lineWidth *= 2;
            ctx.strokeStyle = colorSettings.outlineColor;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.lineWidth = tmpWidth;
            ctx.strokeStyle = getLineColor(colorSettings.lineColor, 0);
            ctx.lineCap = "butt";
        }

        ctx.stroke();

        if (colorSettings.displayAllPoints) {
            for (let i = 0; i < part.vertices2D.length; ++i) {
                ctx.fillStyle = colorSettings.pointColor
                    ? getPointColor(colorSettings.pointColor, i, part.vertices2D.length)
                    : (colorSettings.fillColor ?? "black");
                ctx.lineWidth = 2;
                ctx.strokeStyle = "black";
                ctx.beginPath();
                ctx.arc(part.vertices2D[i][0], part.vertices2D[i][1], 6, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        }

        if (text && (text.customText?.length || part.text)) {
            if (text.type === "centerOfLine") {
                const points = part.vertices2D;
                for (let i = 0; i < points.length - 1; ++i) {
                    let textStr = `${text.customText && i < text.customText.length ? text.customText[i] : part.text}`;
                    if (textStr.length === 0) {
                        continue;
                    }
                    textStr += `${text.unit ? text.unit : "m"}`;
                    drawText(ctx, [points[i], points[i + 1]], textStr);
                }
            } else if (text.type === "center" && part.vertices2D.length > 2) {
                const textStr = `${
                    text.customText && text.customText.length > 0 ? text.customText : part.text ? part.text : ""
                } ${text.unit ? text.unit : "m"}`;
                drawText(ctx, part.vertices2D, textStr);
            } else if (part.text && Array.isArray(part.text) && part.text.length > 0) {
                const drawTextsFromPart = (
                    points: ReadonlyVec2[],
                    indicesOnScreen: number[] | undefined,
                    textList: string[],
                ) => {
                    const indexer = (i: number) => (indicesOnScreen ? indicesOnScreen[i] : i);
                    for (let i = 0; i < points.length - 1; ++i) {
                        const currentTxtIdx = indexer(i);
                        const nextTxtIdx = indexer(i + 1);
                        if (nextTxtIdx === currentTxtIdx) {
                            continue;
                        }
                        if (!textList[currentTxtIdx] || textList[currentTxtIdx].length === 0) {
                            continue;
                        }
                        let textStr = textList[currentTxtIdx] + `${text.unit ? text.unit : "m"}`;
                        if (Array.isArray(part.elevation)) {
                            const currentElevation = part.elevation[currentTxtIdx];
                            if (currentElevation && currentElevation.slope) {
                                textStr += ` ${currentElevation.slope.toFixed(1)}%`;
                            }
                        }

                        drawText(ctx, [points[i], points[i + 1]], textStr);
                    }
                };
                drawTextsFromPart(part.vertices2D, part.indicesOnScreen, part.text[0]);
                if (part.voids) {
                    for (let j = 0; j < part.voids.length && j < part.text.length - 1; ++j) {
                        const voidVerts = part.voids[j].vertices2D;
                        if (voidVerts) {
                            drawTextsFromPart(voidVerts, part.voids[j].indicesOnScreen, part.text[j + 1]);
                        }
                    }
                }
            }
        }
        return true;
    }
    return false;
}

function getLineColor(lineColor: string | CanvasGradient | string[] | undefined, idx: number) {
    if (lineColor) {
        return Array.isArray(lineColor)
            ? idx < lineColor.length
                ? lineColor[idx]
                : lineColor[lineColor.length - 1]
            : lineColor;
    }
    return "black";
}

function getPointColor(
    pointColor: string | { start: string; middle: string; end: string },
    idx: number,
    length: number,
) {
    if (typeof pointColor === "string") {
        return pointColor;
    }
    if (idx === 0) {
        return pointColor.start;
    } else if (idx === length - 1) {
        return pointColor.end;
    }
    return pointColor.middle;
}

function drawPoints(ctx: CanvasRenderingContext2D, part: DrawPart, colorSettings: ColorSettings) {
    if (part.vertices2D) {
        for (let i = 0; i < part.vertices2D.length; ++i) {
            const color = colorSettings.pointColor
                ? getPointColor(colorSettings.pointColor, i, part.vertices2D.length)
                : (colorSettings.fillColor ?? "black");
            drawPoint(ctx, part.vertices2D[i], color);
        }
        return true;
    }
    return false;
}

export function drawTexts(ctx: CanvasRenderingContext2D, positions: ReadonlyVec2[], texts: string[], size?: number) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    ctx.font = `bold ${size ?? 16}px "Open Sans", sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";

    for (let i = 0; i < positions.length; ++i) {
        ctx.strokeText(texts[i], positions[i][0], positions[i][1]);
        ctx.fillText(texts[i], positions[i][0], positions[i][1]);
    }
}

export function drawLineStrip(
    ctx: CanvasRenderingContext2D,
    vertices2D: ReadonlyVec2[],
    color?: string,
    lineWidth?: number,
) {
    ctx.beginPath();
    ctx.moveTo(vertices2D[0][0], vertices2D[0][1]);

    for (let i = 1; i < vertices2D.length; ++i) {
        ctx.lineTo(vertices2D[i][0], vertices2D[i][1]);
    }
    const tmpLineWidth = ctx.lineWidth;
    ctx.lineWidth = lineWidth ?? 2;
    ctx.strokeStyle = color ?? "black";
    ctx.lineCap = "round";
    ctx.lineWidth = tmpLineWidth;

    ctx.stroke();
}

export function drawPoint(ctx: CanvasRenderingContext2D, point: ReadonlyVec2, color?: string | CanvasPattern) {
    ctx.fillStyle = color ?? "black";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.arc(point[0], point[1], 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}

function setupDrawText(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    ctx.font = `bold 16px "Open Sans", sans-serif`;
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
}

function drawText(ctx: CanvasRenderingContext2D, vertices2D: ReadonlyVec2[], text: string) {
    if (vertices2D.length === 1) {
        setupDrawText(ctx);
        ctx.strokeText(text, vertices2D[0][0], vertices2D[0][1]);
        ctx.fillText(text, vertices2D[0][0], vertices2D[0][1]);
    } else if (vertices2D.length === 2) {
        const dir =
            vertices2D[0][0] > vertices2D[1][0]
                ? vec2.sub(vec2.create(), vertices2D[0], vertices2D[1])
                : vec2.sub(vec2.create(), vertices2D[1], vertices2D[0]);
        const dirSqrLen = vec2.sqrLen(dir);
        let pixLen = 20;
        let isLongEnough = dirSqrLen > pixLen * pixLen;
        if (isLongEnough) {
            pixLen += ctx.measureText(text).width;
            isLongEnough = dirSqrLen > pixLen * pixLen;
        }
        if (isLongEnough) {
            const center = vec2.create();
            vec2.lerp(center, vertices2D[0], vertices2D[1], 0.5);
            const x = center[0];
            const y = center[1];
            vec2.normalize(dir, dir);
            const angle = Math.atan2(dir[1], dir[0]);
            ctx.translate(x, y);
            ctx.rotate(angle);
            setupDrawText(ctx);
            ctx.strokeText(text, 0, 0);
            ctx.fillText(text, 0, 0);
            ctx.resetTransform();
        }
    } else {
        const center = vec2.create();
        for (const p of vertices2D) {
            vec2.add(center, center, p);
        }
        setupDrawText(ctx);
        ctx.strokeText(text, center[0] / vertices2D.length, center[1] / vertices2D.length);
        ctx.fillText(text, center[0] / vertices2D.length, center[1] / vertices2D.length);
    }
    return true;
}

function drawArrow(ctx: CanvasRenderingContext2D, currentPos: ReadonlyVec2, dir: ReadonlyVec2, pixels: number) {
    const scaledDir = vec2.scale(vec2.create(), dir, pixels);
    ctx.beginPath();
    ctx.moveTo(currentPos[0], currentPos[1]);
    ctx.lineTo(currentPos[0] + scaledDir[1] / 2, currentPos[1] - scaledDir[0] / 2);
    ctx.lineTo(currentPos[0] + scaledDir[0], currentPos[1] + scaledDir[1]);
    ctx.lineTo(currentPos[0] - scaledDir[1] / 2, currentPos[1] + scaledDir[0] / 2);
    ctx.closePath();
    ctx.fill();
}

type InteractionPosition = vec2 | undefined;
export function getInteractionPositions({
    points,
    current,
    view,
}: {
    points: { points: vec3[] }[];
    current: number;
    view: View;
}): {
    remove: InteractionPosition[];
    info: InteractionPosition[];
    finalize: InteractionPosition[];
    undo: InteractionPosition[];
} {
    const initial = {
        remove: Array.from<vec2 | undefined>({ length: points.length }),
        info: Array.from<vec2 | undefined>({ length: points.length }),
        finalize: Array.from<vec2 | undefined>({ length: points.length }),
        undo: Array.from<vec2 | undefined>({ length: points.length }),
    };

    if (!points.length) {
        return initial;
    }

    return points.reduce((interactions, { points }, idx) => {
        if (!points.length) {
            return interactions;
        }

        const sum = vec3Sum(points);
        const pos3d = vec3.scale(vec3.create(), sum, 1 / points.length);
        if (vec3.dist(pos3d, view.renderState.camera.position) >= 150) {
            return interactions;
        }

        const sp = view.measure?.draw.toMarkerPoints([pos3d]);
        if (sp && sp[0]) {
            interactions.remove[idx] = vec2.fromValues(sp[0][0], sp[0][1] + 30);
            interactions.info[idx] = vec2.fromValues(sp[0][0] + 20, sp[0][1] + 30);
        }

        if (idx == current) {
            if (points.length >= 2) {
                interactions.undo[idx] = view.measure?.draw.toMarkerPoints([points[points.length - 1]])?.at(0);
            }

            if (points.length >= 3) {
                interactions.finalize[idx] = view.measure?.draw.toMarkerPoints([points[0]])?.at(0);
            }
        }

        return interactions;
    }, initial);
}

export function translateInteraction(el: Element | null, pos?: vec2, rot?: number) {
    el?.setAttribute(
        "transform",
        pos
            ? rot
                ? `translate(${pos[0] - 100} ${pos[1] - 98}), rotate(${rot}, 100, 100)`
                : `translate(${pos[0] - 100} ${pos[1] - 98})`
            : "translate(-1000 -1000)",
    );
}

export function getCameraState(camera: View["renderState"]["camera"]) {
    return {
        pos: camera.position,
        dir: getCameraDir(camera.rotation),
        type: camera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole,
    };
}

export function getCameraDir(rotation: quat): vec3 {
    return vec3.transformQuat(vec3.create(), vec3.fromValues(0, 0, -1), rotation);
}

export function vec3Sum(arr: vec3[]) {
    return arr.reduce((tot, vec) => {
        return vec3.add(tot, tot, vec);
    }, vec3.create());
}
