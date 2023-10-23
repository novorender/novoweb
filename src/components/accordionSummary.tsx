import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    AccordionSummary as MuiAccordionSummary,
    accordionSummaryClasses,
    AccordionSummaryProps,
    Color,
    styled,
} from "@mui/material";
import { css } from "@mui/styled-engine";

export const AccordionSummary = styled(
    (props: AccordionSummaryProps) => <MuiAccordionSummary expandIcon={<ExpandMoreIcon />} {...props} />,
    { shouldForwardProp: (prop) => prop !== "level" }
)<AccordionSummaryProps & { level?: number }>(
    ({ theme, level }) => css`
        padding: ${theme.spacing(1)};
        border-bottom: 1px solid ${theme.palette.grey[(100 * (level ?? 1)) as keyof Color]};
        min-height: 0;
        font-weight: 600;

        &:hover {
            background: ${theme.palette.grey[(100 * (level ?? 1)) as keyof Color]};
        }

        &.${accordionSummaryClasses.expanded} {
            min-height: 0;
            border-bottom: 0;

            &:hover {
                background: ${theme.palette.grey[(100 + 100 * (level ?? 1)) as keyof Color]};
            }
        }

        & .${accordionSummaryClasses.content} {
            min-height: 0;
            margin: 0;
            display: flex;
            align-items: center;
            overflow: hidden;

            &.${accordionSummaryClasses.expanded} {
                margin: 0;
            }
        }
    `
);
