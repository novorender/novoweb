import { scaleLinear } from "@visx/scale";

import { vecRgbaToRgbaString } from "utils/color";

import { UiDeviationProfile } from "../deviationTypes";

export function getColorKnots(profile: UiDeviationProfile | undefined, scaleY: ReturnType<typeof scaleLinear<number>>) {
    if (!profile) {
        return [];
    }

    const range = scaleY.range();
    const height = Math.abs(range[1] - range[0]);
    const opacity = 0.8;

    const stops = profile.colors.colorStops
        .toSorted((a, b) => b.position - a.position)
        .map((cs, i) => {
            const color = vecRgbaToRgbaString(cs.color);
            const y = scaleY(cs.position);
            const offset = 100 - ((height - y) / height) * 100;
            return <stop key={i} offset={`${offset}%`} stopColor={color} stopOpacity={opacity}></stop>;
        });

    stops.push(
        <stop
            key="-1"
            offset="100%"
            stopColor={vecRgbaToRgbaString(profile.colors.colorStops.at(-1)!.color)}
            stopOpacity={opacity}
        ></stop>,
    );

    return stops;
}
