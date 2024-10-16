import { ArrowBack } from "@mui/icons-material";
import { Box, Button, FormControlLabel, useTheme } from "@mui/material";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox, Switch as SwitchInput } from "components";

import { initialFilters, jiraActions, JiraFilterType, selectJiraFilters } from "../jiraSlice";

export function Filters() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const currentFilters = useAppSelector(selectJiraFilters);
    const [filters, setFilters] = useState(currentFilters);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        dispatch(jiraActions.setFilters(filters));
        history.goBack();
    };

    const handleReset = (e: FormEvent) => {
        e.preventDefault();
        setFilters(initialFilters);
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    {t("back")}
                </Button>
            </Box>
            <ScrollBox
                p={1}
                pb={5}
                height={1}
                position="relative"
                sx={{ mt: 1, form: { width: 1 } }}
                component="form"
                onSubmit={handleSubmit}
                onReset={handleReset}
            >
                <Box display="flex" flexDirection="column">
                    <FormControlLabel
                        sx={{ ml: 0, mb: 1 }}
                        control={
                            <SwitchInput
                                checked={filters[JiraFilterType.AssignedToMe]}
                                onChange={(_e, checked) => {
                                    setFilters((state) => ({ ...state, [JiraFilterType.AssignedToMe]: checked }));
                                }}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("assignedToMe")}
                            </Box>
                        }
                    />
                    <FormControlLabel
                        sx={{ ml: 0, my: 1 }}
                        control={
                            <SwitchInput
                                checked={filters[JiraFilterType.ReportedByMe]}
                                onChange={(_e, checked) => {
                                    setFilters((state) => ({ ...state, [JiraFilterType.ReportedByMe]: checked }));
                                }}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("reportedByMe")}
                            </Box>
                        }
                    />
                    <FormControlLabel
                        sx={{ ml: 0, my: 1 }}
                        control={
                            <SwitchInput
                                checked={filters[JiraFilterType.Unresolved]}
                                onChange={(_e, checked) => {
                                    setFilters((state) => ({ ...state, [JiraFilterType.Unresolved]: checked }));
                                }}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("onlyShowUnresolved")}
                            </Box>
                        }
                    />
                    <FormControlLabel
                        sx={{ ml: 0, my: 1 }}
                        control={
                            <SwitchInput
                                checked={filters[JiraFilterType.Linked]}
                                onChange={(_e, checked) => {
                                    setFilters((state) => ({ ...state, [JiraFilterType.Linked]: checked }));
                                }}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("onlyShowUnlinked/Linked")}
                            </Box>
                        }
                    />
                </Box>

                <Box display="flex" justifyContent="space-between" mb={2} mt={1}>
                    <Button
                        disabled={!Object.values(filters).some((value) => value === false)}
                        variant="outlined"
                        color="grey"
                        type="reset"
                        fullWidth
                    >
                        {t("defaultFilters")}
                    </Button>
                    <Button sx={{ ml: 2 }} fullWidth variant="contained" type="submit">
                        {t("save")}
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
