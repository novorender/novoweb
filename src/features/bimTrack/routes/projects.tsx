import { Box, css, List, ListItem, styled, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";

import { ScrollBox } from "components";
import { Project } from "types/bcf";

import { useGetProjectsQuery } from "../bimTrackApi";

import fallbackImage from "media/img/bimtrack.png";

export function Projects() {
    const theme = useTheme();
    const { data: projects = [] } = useGetProjectsQuery();

    return (
        <>
            <ScrollBox p={1} height={1} position="relative">
                <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
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
