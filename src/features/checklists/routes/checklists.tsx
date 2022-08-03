import { AddCircle } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";

export function Checklists() {
    const theme = useTheme();
    const history = useHistory();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} sx={{ minHeight: 5, flexShrink: 0 }}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={() => history.push("/new")}>
                            <AddCircle sx={{ mr: 1 }} />
                            Add checklist
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox p={1} pt={2} pb={2}>
                Checklist LIST
            </ScrollBox>
        </>
    );
}
