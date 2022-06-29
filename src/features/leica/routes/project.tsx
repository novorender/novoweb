import { Box, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";

import { useSearchQuery } from "../leicaApi";
import { leicaActions, selectProjectId } from "../leicaSlice";
import { SearchProject } from "../types";
import { Redirect } from "react-router-dom";

const projectName = "200113Bussveien";

export function Project() {
    const theme = useTheme();
    const projectId = useAppSelector(selectProjectId);
    const dispatch = useAppDispatch();

    const [searchPage, setSearchPage] = useState(1);
    const [projectNotFound, setProjectNotFound] = useState(false);
    const { data: searchResults, isError: searchError } = useSearchQuery(
        { query: projectName, page: searchPage },
        { skip: projectNotFound || !projectName }
    );

    useEffect(() => {
        if (projectId || !searchResults) {
            return;
        }

        const project = searchResults.results.find(
            (res) => "type" in res && res.type === "PROJECT" && res.name === projectName
        ) as SearchProject | undefined;

        if (project) {
            dispatch(leicaActions.setProjectId(project.uuid));
        } else if (searchResults?.next) {
            setSearchPage(searchResults.next);
        } else {
            setProjectNotFound(true);
        }
    }, [projectId, searchResults, dispatch]);

    const isLoading = projectName && !projectId && !projectNotFound;
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
                        Project <em>{projectName}</em> was not found.
                    </Typography>
                ) : !projectName ? (
                    <Typography>Leica project not set. This can be set in Advanced settings -{">"} Project.</Typography>
                ) : (
                    <Redirect to="/equipment" />
                )}
            </ScrollBox>
        </>
    );
}
