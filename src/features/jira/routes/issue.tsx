import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { Divider, ScrollBox } from "components";
import { useHistory, useParams } from "react-router-dom";

export function Issue() {
    const theme = useTheme();
    const history = useHistory();
    const key = useParams<{ key: string }>().key;

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
            <ScrollBox p={1}>ISSUE - {key} </ScrollBox>
        </>
    );
}
