import { Box, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import { Redirect, useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { LinearProgress, ScrollBox } from "components";
import { selectProjectSettings } from "slices/renderSlice";

import { useActiveAccountQuery, useProjectsQuery, useSearchQuery } from "../leicaApi";
import { leicaActions, selectProjectId } from "../leicaSlice";
import { Project as ProjectType, SearchProject } from "../types";

export function Project() {
    const theme = useTheme();
    const history = useHistory();
    const { id: accountId = "" } = useParams<{ id?: string }>();
    const projectId = useAppSelector(selectProjectId);
    const { leicaProjectId: projectKey } = useAppSelector(selectProjectSettings);
    const dispatch = useAppDispatch();
    const { data: account, isError: accountError } = useActiveAccountQuery(undefined, { skip: Boolean(accountId) });

    const [searchPage, setSearchPage] = useState(1);
    const [notInSearch, setNotInSearch] = useState(false);
    const { data: searchResults, isError: searchError } = useSearchQuery(
        { query: projectKey, page: searchPage },
        { skip: notInSearch || !projectKey }
    );

    const [projectsPage, setProjectsPage] = useState(1);
    const [projectNotFound, setProjectNotFound] = useState(false);
    const { data: projectsResults, isError: projectError } = useProjectsQuery(
        { accountId, page: projectsPage },
        { skip: !notInSearch || !projectKey || projectNotFound || !accountId }
    );

    useEffect(() => {
        if (account && !accountId) {
            history.replace(`/project/${account.profile.account_uuid}`);
        }
    });

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
            setNotInSearch(true);
        }
    }, [projectKey, searchResults, dispatch]);

    useEffect(() => {
        if (!projectKey || (!notInSearch && !searchError) || !projectsResults) {
            return;
        }

        const project = projectsResults.projects.find(
            (res) => "type" in res && res.type === "PROJECT" && res.project.key === projectKey
        ) as ProjectType | undefined;

        if (project) {
            dispatch(leicaActions.setProjectId(project.uuid));
        } else if (projectsResults?.next) {
            setProjectsPage(projectsResults.next);
        } else {
            setProjectNotFound(true);
        }
    }, [projectKey, notInSearch, projectsResults, searchError, dispatch]);

    const isLoading = projectKey && !projectId && !projectNotFound && !accountError;
    const isError = accountError || (searchError && projectError);

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
