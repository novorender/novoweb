import type { ReadonlyVec3, vec3 } from "gl-matrix";

export type RGB = [r: number, g: number, b: number]; // 0 - 255
export type VecRGB = [r: number, g: number, b: number]; // 0 - 1
export type Hex = string;

export function hexToRgb(hex: Hex): RGB {
    // ignore alpha channel
    hex = hex.length === 4 ? hex.slice(1) : hex.length === 8 ? hex.slice(2) : hex;
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

export function vecToHex(color: VecRGB | ReadonlyVec3 | vec3): Hex {
    return rgbToHex(vecToRgb(color));
}

export function hexToVec(hex: Hex): VecRGB {
    return rgbToVec(hexToRgb(hex));
}

export function vecToRgb(color: VecRGB | ReadonlyVec3 | vec3): RGB {
    return color.map((num: number) => num * 255) as RGB;
}

export function rgbToVec(color: RGB): VecRGB {
    return color.map((num) => num / 255) as VecRGB;
}

export function rgbToHex(color: RGB): Hex {
    return (
        "#" +
        color
            .map((rgb) => {
                const _hex = rgb.toString(16);
                return _hex.length === 1 ? `0${_hex}` : _hex;
            })
            .join("")
    );
}
