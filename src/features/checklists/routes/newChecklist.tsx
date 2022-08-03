import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";

export function NewChecklist() {
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
                        <Button color="grey" onClick={() => history.goBack()}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            <ScrollBox p={1} pt={2} pb={2}>
                New
            </ScrollBox>
        </>
    );
}
