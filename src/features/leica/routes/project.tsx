import { Box, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { Redirect } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { selectProjectSettings } from "slices/renderSlice";

import { useSearchQuery } from "../leicaApi";
import { leicaActions, selectProjectId } from "../leicaSlice";
import { SearchProject } from "../types";

export function Project() {
    const theme = useTheme();
    const projectId = useAppSelector(selectProjectId);
    const { leicaProjectId: projectKey } = useAppSelector(selectProjectSettings);
    const dispatch = useAppDispatch();

    const [searchPage, setSearchPage] = useState(1);
    const [projectNotFound, setProjectNotFound] = useState(false);
    const { data: searchResults, isError: searchError } = useSearchQuery(
        { query: projectKey, page: searchPage },
        { skip: projectNotFound || !projectKey }
    );

    useEffect(() => {
        if (!projectKey || !searchResults) {
            return;
        }

        const project = searchResults.results.find(
            (res) => "type" in res && res.type === "PROJECT" && res.project.key === projectKey
        ) as SearchProject | undefined;

        if (project) {
            dispatch(leicaActions.setProjectId(project.uuid));
        } else if (searchResults?.next) {
            setSearchPage(searchResults.next);
        } else {
            setProjectNotFound(true);
        }
    }, [projectKey, searchResults, dispatch]);

    const isLoading = projectKey && !projectId && !projectNotFound;
    const isError = searchError;

    return isLoading ? (
        <LinearProgress />
    ) : (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} sx={{ height: 5, width: 1 }} position="absolute" />
            <ScrollBox p={1} pt={2}>
                {isError ? (
                    <Typography>Failed to load data from Leica.</Typography>
                ) : projectNotFound ? (
                    <Typography>
                        Project <em>{projectKey}</em> was not found.
                    </Typography>
                ) : !projectKey ? (
                    <Typography>
                        Leica project not set. <br /> Admins can set it in Advanced settings -{">"} Project.
                    </Typography>
                ) : (
                    <Redirect to="/units" />
                )}
            </ScrollBox>
        </>
    );
}
