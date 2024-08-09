import { Download, OpenInNew } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useGetOmega365DocumentLinksQuery, useIsOmega365ConfiguredForProjectQuery } from "apis/dataV2/dataV2Api";
import { Omega365Document } from "apis/dataV2/omega365Types";
import { useAppSelector } from "app/redux-store-interactions";
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
    const { t } = useTranslation();
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
                        {t("omega365ConfigError")}
                    </Box>
                ) : data?.configured === false ? (
                    <Box p={1} pt={2}>
                        {t("omega365NoIntegration")}
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
    const { t } = useTranslation();
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
                            {t("objectDetails")}
                        </Button>
                    ) : (
                        <Button color="grey" disabled>
                            {t("objectDetails")}
                        </Button>
                    )}
                </Box>
            </Box>

            {!isObjectSelected ? (
                <Box p={1} pt={2}>
                    {t("selectObject")}
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
                            {t("omega365ConfigError")}
                        </Box>
                    ) : documents?.length === 0 ? (
                        <Box p={1} pt={2}>
                            {t("noDocsForObject")}
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
    const { t } = useTranslation();
    const organisedDocs = useMemo(
        () =>
            Object.values(
                documents.reduce(
                    (prev, doc) => {
                        if (
                            prev[doc.documentType] &&
                            !prev[doc.documentType].find((_doc) => _doc.document_ID === doc.document_ID)
                        ) {
                            prev[doc.documentType].push(doc);
                        } else {
                            prev[doc.documentType] = [doc];
                        }

                        return prev;
                    },
                    {} as { [k: string]: Omega365Document[] },
                ),
            ),
        [documents],
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
                                            <Box sx={{ fontWeight: 600, mr: 1, minWidth: 48 }}>{t("title")}</Box>
                                            <Box>{doc.documentTitle}</Box>
                                        </Box>
                                        <Box display="flex" mb={1}>
                                            <Box sx={{ fontWeight: 600, mr: 1, minWidth: 48 }}>{t("id:")}</Box>
                                            <Box>{doc.document_ID}</Box>
                                        </Box>
                                        <Box display="flex" mx={-1}>
                                            <Button color="grey" sx={{ mr: 2 }} href={doc.profileURL} target="_blank">
                                                <OpenInNew sx={{ mr: 1 }} />
                                                {t("omega365")}
                                            </Button>
                                            <Button sx={{ mr: 1 }} href={doc.fileURL} target="_blank">
                                                <Download /> {t("download")}
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
