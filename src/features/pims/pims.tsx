import { AccountCircle, Download, Lock, OpenInNew, Visibility, VisibilityOff } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import {
    Box,
    Button,
    CircularProgress,
    FormControl,
    IconButton,
    InputAdornment,
    OutlinedInput,
    Typography,
    useTheme,
} from "@mui/material";
import { FormEventHandler, Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
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
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { AsyncState, AsyncStatus, hasFinished } from "types/misc";
import { getObjectData } from "utils/search";

import { pimsActions, selectPimsApiKey, selectPimsStatus } from "./pimsSlice";

type PimsDocument = {
    Orgstruktur_ID: number;
    OrgstrukturKortnavn: string;
    OrgstrukturNavn: string;
    Merke_ID: number;
    Merke: string;
    Dokument_ID: number;
    Dokumentnr: string;
    DokumentTittel: string;
    Dokumenttype: string;
    DokumenttypeBeskrivelse: string;
    FilUrl: string;
    ProfilUrl: string;
};

// NOTE(OLA):
// POC! Enable only for nye veier to test.

const coClassVariants = ["CoClass/CoClass code", "CoClass/CoClass", "CoClass/coClassCode"];
export default function Pims() {
    const { t } = useTranslation();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.omegaPims365.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.omegaPims365.key);
    const mainObject = useAppSelector(selectMainObject);
    const apiKey = useAppSelector(selectPimsApiKey);
    const status = useAppSelector(selectPimsStatus);
    const dispatch = useAppDispatch();

    const {
        state: { db, view },
    } = useExplorerGlobals(true);

    const [abortController, abort] = useAbortController();
    const [documents, setDocuments] = useState<AsyncState<PimsDocument[]>>({ status: AsyncStatus.Initial });

    useEffect(() => {
        abort();
        setDocuments({ status: AsyncStatus.Initial });
    }, [mainObject, abort]);

    useEffect(() => {
        verifyAuth();

        async function verifyAuth() {
            if (status !== AsyncStatus.Initial) {
                return;
            }

            dispatch(pimsActions.setStatus(AsyncStatus.Loading));
            const test = await fetch(
                `/omega365/api/rest/Novorender/EksportObjektDokumentLink?q={'Merke':'NOVORENDER_LOGIN_TEST'}`,
            );

            if (test.ok) {
                dispatch(pimsActions.setApiKey("cookies"));
            }

            dispatch(pimsActions.setStatus(AsyncStatus.Success));
        }
    }, [status, dispatch]);

    useEffect(() => {
        loadDocs();

        async function loadDocs() {
            if (mainObject === undefined || documents?.status !== AsyncStatus.Initial || !apiKey) {
                return;
            }

            const abortSignal = abortController.current.signal;

            setDocuments({ status: AsyncStatus.Loading });
            const obj = await getObjectData({ db, id: mainObject, view });

            if (!obj) {
                setDocuments({ status: AsyncStatus.Error, msg: "Failed to load object properties." });
                return;
            }

            const omegaId = (obj?.properties.find((prop) => coClassVariants.includes(prop[0])) ?? [])[1];

            if (!omegaId) {
                setDocuments({ status: AsyncStatus.Success, data: [] });
                return;
            }

            try {
                const docs = await fetch(
                    `/omega365/api/rest/Novorender/EksportObjektDokumentLink?q={'Merke':'${encodeURIComponent(
                        omegaId.replaceAll("#", ""),
                    )}'}`,
                    {
                        headers: { authorization: `Basic ${apiKey}` },
                        signal: abortSignal,
                    },
                )
                    .then((r) => r.json())
                    .then((r) => r._items);

                setDocuments({ status: AsyncStatus.Success, data: docs });
            } catch (e) {
                console.warn(e);
                if (abortSignal.aborted) {
                    setDocuments({ status: AsyncStatus.Initial });
                } else {
                    setDocuments({
                        status: AsyncStatus.Error,
                        msg: "An error occured while loading documents from Omega365.",
                    });
                }
            }
        }
    }, [mainObject, documents, db, abortController, apiKey, view]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.omegaPims365} />
                {!apiKey && !minimized && !menuOpen ? (
                    status !== AsyncStatus.Success ? (
                        <Box>
                            <LinearProgress />
                        </Box>
                    ) : (
                        <Login />
                    )
                ) : null}
                {apiKey && (
                    <>
                        {documents.status === AsyncStatus.Loading ? (
                            <Box>
                                <LinearProgress />
                            </Box>
                        ) : null}
                        <ScrollBox
                            display={menuOpen || minimized ? "none" : "flex"}
                            flexDirection={"column"}
                            height={1}
                            pt={1}
                            pb={3}
                        >
                            {hasFinished(documents) ? (
                                <>
                                    {documents.status === AsyncStatus.Error ? (
                                        <Box p={1} pt={2}>
                                            {documents.msg}
                                        </Box>
                                    ) : !documents.data.length ? (
                                        <Box p={1} pt={2}>
                                            {t("noDocsForObject")}
                                        </Box>
                                    ) : (
                                        <DocumentList documents={documents.data} />
                                    )}
                                </>
                            ) : null}
                        </ScrollBox>
                    </>
                )}
                {menuOpen && <WidgetList widgetKey={featuresConfig.omegaPims365.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function DocumentList({ documents }: { documents: PimsDocument[] }) {
    const { t } = useTranslation();
    const [organisedDocs] = useState(() =>
        Object.values(
            documents.reduce(
                (prev, doc) => {
                    if (
                        prev[doc.Dokumenttype] &&
                        !prev[doc.Dokumenttype].find((_doc) => _doc.Dokument_ID === doc.Dokument_ID)
                    ) {
                        prev[doc.Dokumenttype].push(doc);
                    } else {
                        prev[doc.Dokumenttype] = [doc];
                    }

                    return prev;
                },
                {} as { [k: string]: PimsDocument[] },
            ),
        ),
    );

    return (
        <>
            {organisedDocs.map((docs) => (
                <Accordion defaultExpanded={organisedDocs.length === 1} key={docs[0].DokumentTittel}>
                    <AccordionSummary>{docs[0].Dokumenttype}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1}>
                            {docs.map((doc, idx, arr) => (
                                <Fragment key={doc.Dokument_ID}>
                                    <Box>
                                        <Box display="flex" mb={0.5}>
                                            <Box sx={{ fontWeight: 600, mr: 1, minWidth: 48 }}>{t("title")}</Box>
                                            <Box>{doc.DokumentTittel}</Box>
                                        </Box>
                                        <Box display="flex" mb={1}>
                                            <Box sx={{ fontWeight: 600, mr: 1, minWidth: 48 }}>{t("idName")}</Box>
                                            <Box>{doc.Dokument_ID}</Box>
                                        </Box>
                                        <Box display="flex" mx={-1}>
                                            <Button color="grey" sx={{ mr: 2 }} href={doc.ProfilUrl} target="_blank">
                                                <OpenInNew sx={{ mr: 1 }} /> {t("omega365")}
                                            </Button>
                                            <Button sx={{ mr: 1 }} href={doc.FilUrl} target="_blank">
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

function Login() {
    const { t } = useTranslation();
    const theme = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, toggleShowPassword] = useToggle(false);
    const [status, setStatus] = useState(AsyncStatus.Initial);
    const dispatch = useAppDispatch();

    const handleSubmit: FormEventHandler = async (evt) => {
        evt.preventDefault();
        if (![AsyncStatus.Initial, AsyncStatus.Error].includes(status) || !username.trim() || !password) {
            return;
        }

        setStatus(AsyncStatus.Loading);

        const key = btoa(`${username}:${password}`);
        const test = await fetch(
            `/omega365/api/rest/Novorender/EksportObjektDokumentLink?q={'Merke':'NOVORENDER_LOGIN_TEST'}`,
            {
                headers: { authorization: `Basic ${key}` },
            },
        );

        if (test.ok) {
            dispatch(pimsActions.setApiKey(key));
        } else {
            setStatus(AsyncStatus.Error);
        }
    };

    return (
        <>
            <Box
                boxShadow={(theme) => theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1 }}
                position="absolute"
            />
            <ScrollBox component="form" onSubmit={handleSubmit} p={1} pt={2}>
                <FormControl fullWidth sx={{ mb: 1 }}>
                    <label htmlFor="omega365-username">{t("username")}</label>
                    <OutlinedInput
                        id="omega365-username"
                        required
                        value={username}
                        onChange={(evt) => setUsername(evt.target.value)}
                        type="text"
                        size="small"
                        autoFocus
                        startAdornment={
                            <InputAdornment position="start">
                                <AccountCircle htmlColor={theme.palette.grey[600]} />
                            </InputAdornment>
                        }
                    />
                </FormControl>

                <FormControl fullWidth>
                    <label htmlFor="omega365-password">{t("password")}</label>
                    <OutlinedInput
                        id="omega365-password"
                        required
                        value={password}
                        onChange={(evt) => setPassword(evt.target.value)}
                        type={showPassword ? "text" : "password"}
                        size="small"
                        startAdornment={
                            <InputAdornment position="start">
                                <Lock htmlColor={theme.palette.grey[600]} />
                            </InputAdornment>
                        }
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label="toggle password visibility"
                                    size="large"
                                    onClick={() => toggleShowPassword()}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        }
                    />
                </FormControl>

                <Typography color={"red"} mt={2} visibility={status === AsyncStatus.Error ? "visible" : "hidden"}>
                    {t("invalidLoginCredentials")}
                </Typography>

                <Box mt={2}>
                    <LoadingButton
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="large"
                        loading={status === AsyncStatus.Loading}
                        loadingIndicator={
                            <Box display="flex" alignItems="center">
                                {t("loggingIn")}
                                <CircularProgress sx={{ ml: 1 }} color="inherit" size={16} />
                            </Box>
                        }
                    >
                        {t("logInToOmega365")}
                    </LoadingButton>
                </Box>
            </ScrollBox>
        </>
    );
}
