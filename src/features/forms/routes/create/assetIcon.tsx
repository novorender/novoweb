import { SvgIcon } from "@mui/material";
import { useLayoutEffect, useRef } from "react";

export function AssetIcon({ icon }: { icon: string }) {
    const ref = useRef<SVGSVGElement | null>(null);

    useLayoutEffect(() => {
        if (!ref.current || !icon) {
            return;
        }

        ref.current.innerHTML = icon;
    }, [icon]);

    return <SvgIcon viewBox="0 0 24 24" ref={ref}></SvgIcon>;
}
