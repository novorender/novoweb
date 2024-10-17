import { RenderStateColorGradientKnot, RGBA } from "@novorender/api";
import { ReadonlyVec4, vec4 } from "gl-matrix";

export type RGB = { r: number; g: number; b: number; a?: number }; // rgb 0 - 255, a 0 - 1
export type VecRGB = [r: number, g: number, b: number]; // 0 - 1
export type VecRGBA = [r: number, g: number, b: number, a: number]; // 0 - 1
export type Hex = string;

export function hexToRgb(hex: Hex, argb = false): RGB {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = argb
        ? /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])$/i
        : /^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i;

    hex = hex.replace(shorthandRegex, (m, r, g, b, a) => {
        return r + r + g + g + b + b + (a ?? "F") + (a ?? "F");
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    if (!result) {
        return { r: 0, g: 0, b: 0, a: 1 };
    }

    return !argb
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
              a: parseInt(result[4], 16) / 255,
          }
        : {
              r: parseInt(result[2], 16),
              g: parseInt(result[3], 16),
              b: parseInt(result[4], 16),
              a: parseInt(result[1], 16) / 255,
          };
}

export function vecToHex(color: VecRGB | VecRGBA, argb = false): Hex {
    return rgbToHex(vecToRgb(color), argb);
}

export function hexToVec(hex: Hex, argb = false): VecRGBA {
    return rgbToVec(hexToRgb(hex, argb)) as VecRGBA;
}

export function vecToRgb(color: VecRGB | VecRGBA): RGB {
    return {
        r: color[0] * 255,
        g: color[1] * 255,
        b: color[2] * 255,
        a: color[3] ?? 1,
    };
}

export function rgbToVec(color: RGB): VecRGBA {
    return [color.r / 255, color.g / 255, color.b / 255, color.a ?? 1];
}

export function rgbToVecRGB(color: RGB): VecRGB {
    return [color.r / 255, color.g / 255, color.b / 255];
}

export function rgbToHex(color: RGB, argb = false): Hex {
    const toHex = (num: number): string => {
        const hex = Math.round(num).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    };

    return argb
        ? `#${toHex((color.a ?? 1) * 255)}${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
        : `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}${toHex((color.a ?? 1) * 255)}`;
}

/**
 * @param h 0-360
 * @param s 0-1
 * @param l 0-1
 * @returns RGB 0-1
 */
export function hslToVec(h: number, s: number, l: number): VecRGB {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return [f(0), f(8), f(4)];
}

export function vecRgbaToRgbaString(color: VecRGBA) {
    const [r, g, b, a] = color;
    return `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a ?? 1})`;
}

export function getRandomColorForObjectId(objectId: number) {
    const h = ((objectId % 360) * 10) % 360;
    const s = 0.5 + ((objectId % 30) / 30) * 0.3;
    const l = 0.5 + ((objectId % 10) / 10) * 0.5;
    return hslToVec(h, s, l);
}

function lerpKnotColor(
    knot1: RenderStateColorGradientKnot<RGBA>,
    knot2: RenderStateColorGradientKnot<RGBA>,
    position: number,
) {
    const t = (position - knot1.position) / (knot2.position - knot1.position);
    return vec4.lerp(vec4.create(), knot1.color as ReadonlyVec4, knot2.color as ReadonlyVec4, t);
}

export function clampColorGradientKnots(knots: RenderStateColorGradientKnot<RGBA>[], start: number, end: number) {
    const epsilon = 0.001;
    const transparent: RGBA = [0, 0, 0, 0];

    const result: RenderStateColorGradientKnot<RGBA>[] = [];
    for (let i = 0; i < knots.length; i++) {
        const knot = knots[i];

        // start
        if (i === 0 && start < knot.position - epsilon) {
            // start before first knot
            result.push({ position: start - epsilon, color: transparent });
            result.push({ position: start, color: knot.color });
        } else if (i === knots.length - 1 && start > knot.position + epsilon) {
            // start after last knot
            result.push({ position: start - epsilon, color: transparent });
            result.push({ position: start, color: knot.color });
        } else if (Math.abs(knot.position - start) < epsilon) {
            // knot at start
            result.push({ position: knot.position - epsilon, color: transparent });
            result.push(knot);
        } else if (knot.position < start) {
            const nextKnot = i < knots.length - 1 && knots[i + 1];
            if (nextKnot && nextKnot.position > start) {
                // start between knot and next knot
                result.push({ position: start - epsilon, color: transparent });
                const color = lerpKnotColor(knot, nextKnot, start);
                result.push({ position: start, color });
            }
        }

        if (knot.position >= start + epsilon && knot.position <= end - epsilon) {
            result.push(knot);
        }

        // end
        if (i === knots.length - 1 && end > knot.position + epsilon) {
            // end after last knot
            result.push({ position: end, color: knot.color });
            result.push({ position: end + epsilon, color: transparent });
        } else if (i === 0 && end < knot.position - epsilon) {
            // end before first knot
            result.push({ position: end, color: knot.color });
            result.push({ position: end + epsilon, color: transparent });
        } else if (Math.abs(knot.position - end) < epsilon) {
            // knot at end
            result.push(knot);
            result.push({ position: knot.position + epsilon, color: transparent });
        } else if (knot.position > end) {
            const prevKnot = i > 0 && knots[i - 1];
            if (prevKnot && prevKnot.position < end) {
                // end between knot and previous knot
                const color = lerpKnotColor(prevKnot, knot, end);
                result.push({ position: end, color });
                result.push({ position: end + epsilon, color: transparent });
            }
        }
    }

    return result;
}
