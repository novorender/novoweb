import { Tooltip as MuiTooltip, TooltipProps } from "@mui/material";

export function Tooltip(props: TooltipProps) {
    return (
        <MuiTooltip
            placement="bottom-start"
            enterDelay={800}
            enterNextDelay={500}
            {...props}
            PopperProps={{ onClick: (e) => e.stopPropagation(), ...props.PopperProps }}
        />
    );
}
