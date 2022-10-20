import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";

export function Filters() {
    const theme = useTheme();
    const history = useHistory();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>
            <ScrollBox p={1}>Filters</ScrollBox>
        </>
    );
}
