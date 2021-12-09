import { Box, Typography, useTheme } from "@mui/material";
import { useAppSelector } from "app/store";

import { ScrollBox } from "components";
import { Link } from "react-router-dom";

import { useGetProjectsQuery } from "../bimCollabApi";
import { selectSpace } from "../bimCollabSlice";

export function Projects() {
    const theme = useTheme();
    const space = useAppSelector(selectSpace);
    const { data: projects = [] } = useGetProjectsQuery();

    return (
        <>
            <ScrollBox p={1} height={1} position="relative">
                <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
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
