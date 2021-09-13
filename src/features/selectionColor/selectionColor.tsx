import { useRef } from "react";
import type { ColorResult } from "react-color";
import type { SpeedDialActionProps } from "@material-ui/lab";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToggle } from "hooks/useToggle";
import { selectSelectionColor, renderActions } from "slices/renderSlice";
import { rgbToVec } from "utils/color";
import { ColorPicker } from "features/colorPicker";

type Props = SpeedDialActionProps;

export function SelectionColor(props: Props) {
    const { name, Icon } = featuresConfig["selectionColor"];
    const [open, toggle] = useToggle();
    const color = useAppSelector(selectSelectionColor);

    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const dispatch = useAppDispatch();

    const handleChangeComplete = ({ rgb }: ColorResult) =>
        dispatch(renderActions.setDefaultSelectionColor(rgbToVec([rgb.r, rgb.g, rgb.b])));

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
