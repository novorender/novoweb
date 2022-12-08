import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import { Link } from "react-router-dom";
import { ReactEventHandler, useState } from "react";

import { useAppSelector } from "app/store";
import { ImgModal, ImgTooltip, LinearProgress, ScrollBox } from "components";
import { useToggle } from "hooks/useToggle";
import { Project } from "types/bcf";

import { useGetProjectsQuery } from "../bimCollabApi";
import { selectSpace } from "../bimCollabSlice";

import fallbackImage from "media/img/bimcollab_fallback.png";

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
    const space = useAppSelector(selectSpace);

    const imgUrl = getImgUrl(space, project.project_id);

    const [modalOpen, toggleModal] = useToggle();
    const [src, setSrc] = useState(imgUrl);

    const onImgError: ReactEventHandler<HTMLImageElement> = () => {
        setSrc(fallbackImage);
    };

    return (
        <>
            <ListItem sx={{ py: 0.5, px: 0 }} button component={Link} to={`/project/${project.project_id}`}>
                <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                    <Box bgcolor={theme.palette.grey[200]} height={70} width={100} flexShrink={0} flexGrow={0}>
                        <ImgTooltip
                            onTooltipClick={(e) => {
                                e.stopPropagation();

                                if (src === fallbackImage) {
                                    return;
                                }

                                toggleModal();
                            }}
                            imgProps={{ onError: onImgError }}
                            src={src}
                        />
                    </Box>
                    <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                        <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                            {project.name}
                        </Typography>
                    </Box>
                </Box>
            </ListItem>
            <ImgModal
                open={modalOpen}
                onClose={toggleModal}
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                src={src}
            />
        </>
    );
}

function getImgUrl(space: string, id: string): string {
    return `https://${space}.bimcollab.com/WebApp/Handlers/Public/DisplayProjectImage.ashx?guid=${id}`;
}
