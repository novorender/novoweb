import { ArrowBack } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useAppDispatch, useAppSelector } from "app/store";

import { ScrollBox } from "components";
import { StorageKey } from "config/storage";
import { Link } from "react-router-dom";
import { deleteFromStorage } from "utils/storage";

import { useGetProjectsQuery } from "../bimCollabApi";
import { bimCollabActions, selectSpace } from "../bimCollabSlice";

export function Projects() {
    const theme = useTheme();
    const space = useAppSelector(selectSpace);
    const dispatch = useAppDispatch();
    const { data: projects = [] } = useGetProjectsQuery();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Button
                    onClick={() => {
                        deleteFromStorage(StorageKey.BimCollabRefreshToken);
                        dispatch(bimCollabActions.logOut());
                    }}
                    color="grey"
                >
                    <ArrowBack sx={{ mr: 1 }} />
                    Change space
                </Button>
            </Box>
            <ScrollBox p={1} height={1} position="relative">
                <Typography variant={"h5"} sx={{ mt: 1, mb: 2 }}>
                    {space} - Projects
                </Typography>
                {projects.map((project) => (
                    <Link key={project.project_id} to={`/project/${project.project_id}`}>
                        {project.name}
                    </Link>
                ))}
            </ScrollBox>
        </>
    );
}
