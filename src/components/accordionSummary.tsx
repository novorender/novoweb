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
        min-height: 0;
        font-weight: 600;
        position: relative;

        &::after {
            content: "";
            height: 1px;
            position: absolute;
            bottom: 0;
            left: 8px;
            right: 16px;
            min-width: 1px;
            border-bottom: 1px solid ${theme.palette.grey[(100 * (level ?? 1)) as keyof Color]};
        }

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

        &.${accordionSummaryClasses.expanded}, &.${accordionSummaryClasses.disabled} {
            &::after {
                border-bottom: 1px solid ${theme.palette.secondary.main};
                opacity: 0.2;
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
