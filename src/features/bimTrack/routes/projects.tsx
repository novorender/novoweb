import { Box, css, List, ListItem, styled, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";

import { LinearProgress, ScrollBox } from "components";
import fallbackImage from "media/img/bimtrack.png";
import { Project } from "types/bcf";

import { useGetProjectsQuery } from "../bimTrackApi";

export function Projects() {
    const theme = useTheme();
    const { data: projects = [], isLoading } = useGetProjectsQuery();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} sx={{ height: 5, width: 1 }} position="absolute" />
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} height={1} position="relative">
                <List>
                    {projects.map((project) => (
                        <ProjectListItem project={project} key={project.project_id} />
                    ))}
                </List>
            </ScrollBox>
        </>
    );
}

function ProjectListItem({ project }: { project: Project }) {
    const theme = useTheme();

    return (
        <>
            <ListItem sx={{ py: 0.5, px: 0 }} button component={Link} to={`/project/${project.project_id}`}>
                <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                    <Box bgcolor={theme.palette.grey[200]} height={70} width={100} flexShrink={0} flexGrow={0}>
                        <Img alt="" height="32px" width="32px" src={fallbackImage} />
                    </Box>
                    <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                        <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                            {project.name}
                        </Typography>
                    </Box>
                </Box>
            </ListItem>
        </>
    );
}

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: fill;
        display: block;
    `
);
