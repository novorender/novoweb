import { Download, OpenInNew } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useGetOmega365DocumentLinksQuery, useIsOmega365ConfiguredForProjectQuery } from "apis/dataV2/dataV2Api";
import { Omega365Document } from "apis/dataV2/omega365Types";
import { Fragment, useMemo } from "react";

import { useAppSelector } from "app/store";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectMainObject } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

export default function Omega365() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.omega365.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.omega365.key);
    const projectId = useExplorerGlobals(true).state.scene.id;

    const { data, isError, isFetching } = useIsOmega365ConfiguredForProjectQuery({ projectId });

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.omega365} disableShadow />
                {minimized || menuOpen ? null : isFetching ? (
                    <Box>
                        <LinearProgress />
                    </Box>
                ) : isError ? (
                    <Box p={1} pt={2}>
                        An error occured while loading Omega365 configuration for the project.
                    </Box>
                ) : data?.configured === false ? (
                    <Box p={1} pt={2}>
                        Omega365 integration is not configured for this project.
                    </Box>
                ) : data?.configured === true ? (
                    <DcoumentLoader projectId={projectId} menuOpen={menuOpen} minimized={minimized} />
                ) : null}
                {menuOpen && <WidgetList widgetKey={featuresConfig.omega365.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function DcoumentLoader({
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

    const {
        data: documents,
        isError,
        isFetching,
    } = useGetOmega365DocumentLinksQuery({ projectId, objectId: mainObject! }, { skip: !isObjectSelected });

    const objectDetailsHref = useMemo(() => {
        if (!documents || documents.length === 0) {
            return;
        }

        const doc = documents[0];
        return doc.object_ID && `https://nyeveier.omega365.com/nt/objects/objectdetails?ID=${doc.object_ID}`;
    }, [documents]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="flex-end" m={0.5}>
                    {objectDetailsHref && mainObject && !isFetching ? (
                        <Button color="grey" href={objectDetailsHref} target="_blank">
                            Object details
                        </Button>
                    ) : (
                        <Button color="grey" disabled>
                            Object details
                        </Button>
                    )}
                </Box>
            </Box>

            {!isObjectSelected ? (
                <Box p={1} pt={2}>
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
                        <Box p={1} pt={2}>
                            Found no documents attached to the selected object.
                        </Box>
                    ) : (
                        <DocumentList documents={documents || []} />
                    )}
                </ScrollBox>
            )}
        </>
    );
}

function DocumentList({ documents }: { documents: Omega365Document[] }) {
    const organisedDocs = useMemo(
        () =>
            Object.values(
                documents.reduce((prev, doc) => {
                    if (
                        prev[doc.documentType] &&
                        !prev[doc.documentType].find((_doc) => _doc.document_ID === doc.document_ID)
                    ) {
                        prev[doc.documentType].push(doc);
                    } else {
                        prev[doc.documentType] = [doc];
                    }

                    return prev;
                }, {} as { [k: string]: Omega365Document[] })
            ),
        [documents]
    );

    return (
        <>
            {organisedDocs.map((docs) => (
                <Accordion defaultExpanded={organisedDocs.length === 1} key={docs[0].documentTitle}>
                    <AccordionSummary>{docs[0].documentType}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1}>
                            {docs.map((doc, idx, arr) => (
                                <Fragment key={doc.document_ID}>
                                    <Box>
                                        <Box display="flex" mb={0.5}>
                                            <Box sx={{ fontWeight: 600, mr: 1, minWidth: 48 }}>Title:</Box>
                                            <Box>{doc.documentTitle}</Box>
                                        </Box>
                                        <Box display="flex" mb={1}>
                                            <Box sx={{ fontWeight: 600, mr: 1, minWidth: 48 }}>ID:</Box>
                                            <Box>{doc.document_ID}</Box>
                                        </Box>
                                        <Box display="flex" mx={-1}>
                                            <Button color="grey" sx={{ mr: 2 }} href={doc.profileURL} target="_blank">
                                                <OpenInNew sx={{ mr: 1 }} /> Omega365
                                            </Button>
                                            <Button sx={{ mr: 1 }} href={doc.fileURL} target="_blank">
                                                <Download /> Download
                                            </Button>
                                        </Box>
                                    </Box>
                                    {arr.length > 1 && idx !== arr.length - 1 ? (
                                        <Divider sx={{ my: 2, borderColor: "grey.300" }} />
                                    ) : null}
                                </Fragment>
                            ))}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            ))}
        </>
    );
}
