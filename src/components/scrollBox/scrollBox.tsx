import { Box, Theme } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { BoxTypeMap } from "@mui/system";

import { withCustomScrollbar } from "./withCustomScrollbar";

export const ScrollBox = withCustomScrollbar(Box) as OverridableComponent<
    BoxTypeMap<{ horizontal?: boolean }, "div", Theme>
>;
