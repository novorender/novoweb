import { Box, Divider, LinearProgress, Tab, Tabs, useTheme } from "@mui/material";
import { skipToken } from "@reduxjs/toolkit/query";

import { useGetOmega365ViewDocumentLinksQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ScrollBox } from "components";
import { selectMainObject } from "features/render";

import DocumentList from "../components/documentList";
import { selectOmega365Config, selectSelectedView, selectSelectedViewId } from "../selectors";
import { omega365Actions } from "../slice";

export default function OmegaRoot({
    projectId,
    menuOpen,
    minimized,
}: {
    projectId: string;
    menuOpen: boolean;
    minimized: boolean;
}) {
    const theme = useTheme();
    const mainObject = useAppSelector(selectMainObject);
    const isObjectSelected = typeof mainObject === "number";
    const selectedViewId = useAppSelector(selectSelectedViewId);
    const view = useAppSelector(selectSelectedView);

    const {
        data: documents,
        isError,
        isFetching,
    } = useGetOmega365ViewDocumentLinksQuery(
        projectId && mainObject && selectedViewId
            ? { projectId, objectId: mainObject, viewId: selectedViewId }
            : skipToken
    );

    return (
        <>
            {/* Header */}
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
            </Box>

            {!view ? (
                <Box color="grey" m={4} textAlign="center">
                    No configured views
                </Box>
            ) : (
                <>
                    <ViewTabs />
                    {/* Content */}
                    {!isObjectSelected ? (
                        <Box m={4} color="grey" textAlign="center">
                            Select an object to see associated documents.
                        </Box>
                    ) : isFetching ? (
                        <Box>
                            <LinearProgress />
                        </Box>
                    ) : (
                        <ScrollBox
                            display={menuOpen || minimized ? "none" : "flex"}
                            flexDirection={"column"}
                            height={1}
                            pt={1}
                            pb={3}
                        >
                            {isError ? (
                                <Box p={1} pt={2}>
                                    An error occured while loading Omega365 configuration for the project.
                                </Box>
                            ) : documents?.length === 0 ? (
                                <Box m={4} color="grey" textAlign="center">
                                    Found no documents attached to the selected object.
                                </Box>
                            ) : (
                                <DocumentList documents={documents || []} view={view} />
                            )}
                        </ScrollBox>
                    )}{" "}
                </>
            )}
        </>
    );
}

function ViewTabs() {
    const views = useAppSelector(selectOmega365Config)?.views;
    const selectedViewId = useAppSelector(selectSelectedViewId);
    const dispatch = useAppDispatch();

    if (!views || views.length <= 1) {
        return null;
    }

    return (
        <Tabs
            value={selectedViewId}
            variant="fullWidth"
            onChange={(_e, newValue) => {
                dispatch(omega365Actions.setSelectedViewId(newValue));
            }}
            aria-label="basic tabs example"
        >
            {views.map((view) => {
                return <Tab key={view.id} label={view.title} value={view.id} />;
            })}
        </Tabs>
    );
}
