import { Tab, TabProps, Tooltip, TooltipProps } from "@mui/material";

export function TabWithTooltip({
    tooltipProps,
    ...props
}: TabProps & { tooltipProps: Omit<TooltipProps, "children"> }) {
    return (
        <Tooltip {...tooltipProps}>
            <div>
                <Tab {...props} />
            </div>
        </Tooltip>
    );
}
