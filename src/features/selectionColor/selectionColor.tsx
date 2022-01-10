import { useRef } from "react";
import type { ColorResult } from "react-color";
import type { SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { rgbToVec } from "utils/color";
import { ColorPicker } from "features/colorPicker";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";

type Props = SpeedDialActionProps;

export function SelectionColor(props: Props) {
    const { name, Icon } = featuresConfig["selectionColor"];
    const [open, toggle] = useToggle();
    const { color } = useHighlighted();
    const dispatch = useDispatchHighlighted();

    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const handleChangeComplete = ({ rgb }: ColorResult) =>
        dispatch(highlightActions.setColor(rgbToVec({ ...rgb, a: rgb.a ?? 1 })));

    return (
        <>
            <SpeedDialAction
                {...props}
                data-test="selection-color"
                active={open}
                FabProps={{
                    ref: (el) => {
                        if (typeof props.FabProps?.ref === "function") {
                            props.FabProps.ref(el);
                        }

                        buttonRef.current = el;
                    },
                }}
                onClick={toggle}
                title={name}
                icon={<Icon />}
            />
            {open ? (
                <ColorPicker
                    testId="selection-color-picker"
                    position={getPickerPosition(buttonRef.current)}
                    color={color}
                    onChangeComplete={handleChangeComplete}
                    onOutsideClick={toggle}
                />
            ) : null}
        </>
    );
}

function getPickerPosition(el: HTMLElement | null) {
    if (!el) {
        return;
    }

    const { top, height, left, width } = el.getBoundingClientRect();
    return { top: top + height / 3, left: left + width + 16 };
}
