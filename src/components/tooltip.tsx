import { Tooltip as MuiTooltip, TooltipProps } from "@material-ui/core";

export function Tooltip(props: TooltipProps) {
    return (
        <MuiTooltip
            interactive
            placement="bottom-start"
            enterDelay={800}
            enterNextDelay={500}
            {...props}
            PopperProps={{ onClick: (e) => e.stopPropagation(), ...props.PopperProps }}
        />
    );
}
