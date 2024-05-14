import { useMemo } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { selectCurrentSubprofileDeviationDistributions, selectSelectedSubprofile } from "../selectors";
import { ParamBoundsInput } from "./paramBoundsInput";

export function RootParamBounds() {
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const distributions = useAppSelector(selectCurrentSubprofileDeviationDistributions);
    const dispatch = useAppDispatch();

    const parameterBounds = useMemo(() => {
        return distributions?.parameterBounds ?? subprofile?.centerLine?.parameterBounds;
    }, [distributions, subprofile]);

    const handleChange = (bounds: [number, number]) => {
        dispatch(
            deviationsActions.setSubprofileDeviationDistributions({
                parameterBounds: [Math.floor(bounds[0]), Math.ceil(bounds[1])],
                points: { status: AsyncStatus.Initial },
            })
        );
    };

    if (!subprofile?.centerLine || !parameterBounds) {
        return;
    }

    const isLoading = distributions?.points.status === AsyncStatus.Loading;

    return (
        <>
            <ParamBoundsInput
                min={subprofile.centerLine.parameterBounds[0]}
                max={subprofile.centerLine.parameterBounds[1]}
                value={parameterBounds}
                onValueChange={handleChange}
                disabled={isLoading}
            />
        </>
    );
}
