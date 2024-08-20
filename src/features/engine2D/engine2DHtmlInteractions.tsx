import { forwardRef, useImperativeHandle, useRef } from "react";

import { ClippingPlaneInteractions } from "features/clippingPlanes/clippingPlaneInteractions";
import { FollowHtmlInteractions } from "features/followPath/followHtmlInteractions";
import { FormsTopDown } from "features/forms/formsTopDown";

export const Engine2DHtmlInteractions = forwardRef(function Engine2DHtmlInteractions(_, ref) {
    const childRefs = useRef([] as { update: () => void }[]);

    useImperativeHandle(
        ref,
        () => ({
            update() {
                for (const childRef of childRefs.current) {
                    childRef?.update();
                }
            },
        }),
        []
    );

    return (
        <div>
            <FormsTopDown ref={(e) => (childRefs.current[0] = e as { update: () => void })} />
            <FollowHtmlInteractions ref={(e) => (childRefs.current[1] = e as { update: () => void })} />
            <ClippingPlaneInteractions ref={(e) => (childRefs.current[2] = e as { update: () => void })} />
        </div>
    );
});
