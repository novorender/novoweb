import { DrawPart, DrawProduct } from "@novorender/measure-api";
import { ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { inversePixelRatio } from "../render/utils";

export interface ColorSettings {
    lineColor?: string | CanvasGradient;
    fillColor?: string;
    pointColor?: string | { start: string; middle: string; end: string };
    complexCylinder?: boolean;
}

export interface TextSettings {
    type: "distance" | "center";
    unit?: string;
    customText?: string[];
}

export function drawProduct(
    ctx: CanvasRenderingContext2D,
    cameraPos: ReadonlyVec3,
    product: DrawProduct,
    colorSettings: ColorSettings,
    pixelWidth: number
) {
    for (const obj of product.objects) {
        if (colorSettings.complexCylinder && obj.kind === "cylinder" && obj.parts.length === 3) {
            let startCol = "red";
            let endCol = "green";
            const cylinderLine = obj.parts[0];
            if (cylinderLine.elevation && cylinderLine.vertices2D) {
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
                drawPart(ctx, cameraPos, cylinderLine, { lineColor: gradient }, pixelWidth);
            }

            for (let i = 1; i < 3; ++i) {
                const col = i === 1 ? startCol : endCol;
                drawPart(ctx, cameraPos, obj.parts[i], { lineColor: col }, pixelWidth);
            }
        } else {
            obj.parts.forEach((part) => {
                drawPart(ctx, cameraPos, part, colorSettings, pixelWidth);
            });
        }
    }
}

export function drawPart(
    ctx: CanvasRenderingContext2D,
    cameraPos: ReadonlyVec3,
    part: DrawPart,
    colorSettings: ColorSettings,
    pixelWidth: number,
    textSettings?: TextSettings
) {
    if (part.vertices2D) {
        inversePixelRatio(part.vertices2D as vec2[]);
        ctx.lineWidth = pixelWidth;
        ctx.strokeStyle = colorSettings.lineColor ?? "black";
        ctx.fillStyle = colorSettings.fillColor ?? "transparent";
        if (part.drawType === "angle" && part.vertices2D.length === 3 && part.text) {
            drawAngle(ctx, cameraPos, part);
        } else if (part.drawType === "lines" || part.drawType === "filled") {
            drawLinesOrPolygon(ctx, part, colorSettings, textSettings);
        } else if (part.drawType === "vertex") {
            drawPoints(ctx, part, colorSettings);
        }
    }
}

function drawAngle(ctx: CanvasRenderingContext2D, cameraPos: ReadonlyVec3, part: DrawPart) {
    if (part.vertices2D) {
        ctx.fillStyle = "transparent";
        const anglePoint = part.vertices2D[0];
        const fromP = part.vertices2D[1];
        const toP = part.vertices2D[2];
        const d0 = vec2.sub(vec2.create(), fromP, anglePoint);
        const d1 = vec2.sub(vec2.create(), toP, anglePoint);
        const l0 = vec2.len(d0);
        const l1 = vec2.len(d1);
        const camDist = vec3.distance(cameraPos, part.vertices3D[0]);
        console.log(part.text);

        if (camDist > (l0 + l1) / 10) {
            return;
        }
        if (l0 < 40 || l1 < 40) {
            return;
        }
        vec2.scale(d0, d0, 1 / l0);
        vec2.scale(d1, d1, 1 / l1);
        const dir = vec2.add(vec2.create(), d1, d0);
        const dirLen = vec2.len(dir);
        if (dirLen < 0.001) {
            vec2.set(dir, 0, 1);
        } else {
            vec2.scale(dir, dir, 1 / dirLen);
        }
        const angle = Math.atan2(dir[1], dir[0]);
        let angleA = Math.atan2(d0[1], d0[0]);
        let angleB = Math.atan2(d1[1], d1[0]);

        // if (d0[0] < 0) {
        //     if (angleB < 0 && angleA > 0) {
        //         angleB = angleB + Math.PI * 2;
        //     } else if (angleA < 0 && angleB > 0) {
        //         angleA = angleA + Math.PI * 2;
        //     }
        // }

        // let startAngle = angleA < angleB ? angleA : angleB;
        // let endAngle = angleB > angleA ? angleB : angleA;
        const sw = d0[0] * d1[1] - d0[1] * d1[0];

        if (sw < 0) {
            const tmp = angleA;
            angleA = angleB;
            angleB = tmp;
        }

        ctx.beginPath();
        // ctx.moveTo(anglePoint[0] + d0[0] * 30, anglePoint[1] + d0[1] * 30);
        // ctx.arcTo(anglePoint[0] + dir[0] * 60, anglePoint[1] + dir[1] * 60, anglePoint[0] + d1[0] * 30, anglePoint[1] + d1[1] * 30, 30);
        ctx.arc(anglePoint[0], anglePoint[1], 50, angleA, angleB);
        ctx.stroke();

        // ctx.fillStyle = "red";
        // ctx.beginPath();
        // ctx.arc(anglePoint[0] + d0[0] * 30, anglePoint[1] + d0[1] * 30, 5, 0, 2 * Math.PI);
        // ctx.fill();
        // ctx.fillStyle = "green";
        // ctx.beginPath();
        // ctx.arc(anglePoint[0] + dir[0] * 30, anglePoint[1] + dir[1] * 30, 5, 0, 2 * Math.PI);
        // ctx.fill();
        // ctx.fillStyle = "yellow";
        // ctx.beginPath();
        // ctx.arc(anglePoint[0] + d1[0] * 30, anglePoint[1] + d1[1] * 30, 5, 0, 2 * Math.PI);
        // ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 16px Open-Sans, sans-serif";

        if (part.text) {
            const textX = anglePoint[0] + dir[0] * 25;
            const textY = anglePoint[1] + dir[1] * 25;
            ctx.translate(textX, textY);
            ctx.rotate(dir[0] < 0 ? -angle : angle);
            ctx.fillText(part.text, 0, 0);
            ctx.resetTransform();
        }
    }
}

function drawLinesOrPolygon(
    ctx: CanvasRenderingContext2D,
    part: DrawPart,
    colorSettings: ColorSettings,
    text?: TextSettings
) {
    if (part.vertices2D) {
        ctx.beginPath();
        ctx.moveTo(part.vertices2D[0][0], part.vertices2D[0][1]);
        for (let i = 1; i < part.vertices2D.length; ++i) {
            ctx.lineTo(part.vertices2D[i][0], part.vertices2D[i][1]);
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
        ctx.stroke();

        if (colorSettings.pointColor) {
            for (let i = 0; i < part.vertices2D.length; ++i) {
                if (typeof colorSettings.pointColor == "string") {
                    ctx.fillStyle = colorSettings.pointColor;
                } else if (i === 0) {
                    ctx.fillStyle = colorSettings.pointColor.start;
                } else if (i === part.vertices2D.length - 1) {
                    ctx.fillStyle = colorSettings.pointColor.end;
                } else {
                    ctx.fillStyle = colorSettings.pointColor.middle;
                }

                ctx.lineWidth = 1;
                ctx.strokeStyle = "black";
                ctx.beginPath();
                ctx.arc(part.vertices2D[i][0], part.vertices2D[i][1], 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            }
        }

        if (text) {
            ctx.fillStyle = "white";
            ctx.font = "bold 16px Open-Sans, sans-serif";
            ctx.textBaseline = "middle";
            ctx.textAlign = "center";

            if (text.type === "distance") {
                const points = part.vertices2D;
                for (let i = 0; i < points.length - 1; ++i) {
                    const textStr = `${
                        text.customText && i < text.customText.length ? text.customText[i] : part.text
                    } ${text.unit ? text.unit : "m"}`;
                    let dir =
                        points[i][0] > points[i + 1][0]
                            ? vec2.sub(vec2.create(), points[i], points[i + 1])
                            : vec2.sub(vec2.create(), points[i + 1], points[i]);
                    const pixLen = textStr.length * 12 + 20;
                    if (vec2.sqrLen(dir) > pixLen * pixLen) {
                        const off = vec3.fromValues(0, 0, -1);
                        vec3.scale(
                            off,
                            vec3.normalize(off, vec3.cross(off, off, vec3.fromValues(dir[0], dir[1], 0))),
                            5
                        );
                        const center = vec2.create();
                        vec2.lerp(center, points[i], points[i + 1], 0.5);
                        const x = center[0] + off[0];
                        const y = center[1] + off[1];
                        vec2.normalize(dir, dir);
                        const angle = Math.atan2(dir[1], dir[0]);
                        ctx.translate(x, y);
                        ctx.rotate(angle);
                        ctx.fillText(textStr, 0, 0);
                        ctx.resetTransform();
                    }
                }
            } else if (text.type === "center" && part.vertices2D.length > 2) {
                const center = vec2.create();
                for (const p of part.vertices2D) {
                    vec2.add(center, center, p);
                }
                const textStr = `${
                    text.customText && text.customText.length > 0 ? text.customText : part.text ? part.text : ""
                } ${text.unit ? text.unit : "m"}`;
                ctx.fillText(textStr, center[0] / part.vertices2D.length, center[1] / part.vertices2D.length);
            }
        }
    }
}

function drawPoints(ctx: CanvasRenderingContext2D, part: DrawPart, colorSettings: ColorSettings) {
    if (part.vertices2D) {
        for (let i = 0; i < part.vertices2D.length; ++i) {
            ctx.fillStyle =
                colorSettings.pointColor && typeof colorSettings.pointColor === "string"
                    ? colorSettings.pointColor
                    : colorSettings.fillColor ?? "black";
            ctx.lineWidth = 1;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            ctx.arc(part.vertices2D[i][0], part.vertices2D[i][1], 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
}
