import { ArrowBack, Circle, Create, History } from "@mui/icons-material";
import {
    Box,
    Button,
    Divider,
    LinearProgress,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    useTheme,
} from "@mui/material";
import { type ObjectId } from "@novorender/webgl-api";
import { CSSProperties, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { Permission } from "apis/dataV2/permissions";
import { ScrollBox } from "components";
import { useGetFormHistoryQuery } from "features/forms/api";
import { type Form as FormType, type FormId, type FormObjectGuid, TemplateType } from "features/forms/types";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useSceneId } from "hooks/useSceneId";

import { FORM_REVISION_ROUTE, REVERT_FORM_ROUTE } from "./constants";
import { RevertConfirmation } from "./dialogs";
import { Form } from "./form";

interface FormHistoryProps {
    objectId?: ObjectId;
    objectGuid?: FormObjectGuid;
    templateId: string;
    formId: FormId;
    title?: string;
    isFinal?: boolean;
}

export function FormHistory({ objectId, objectGuid, templateId, formId, title, isFinal }: FormHistoryProps) {
    const { t } = useTranslation();
    const theme = useTheme();
    const projectId = useSceneId();
    const history = useHistory();
    const match = useRouteMatch();
    const checkPermission = useCheckProjectPermission();
    const canEdit = checkPermission(Permission.FormsFill);

    const templateType = useMemo(() => (objectGuid ? TemplateType.Object : TemplateType.Geo), [objectGuid]);
    const id = (objectGuid || templateId)!;

    const { data: formHistory, isLoading: isFormHistoryLoading } = useGetFormHistoryQuery({
        projectId,
        templateType,
        id,
        formId,
    });

    const formHistoryEntries = useMemo(() => Object.entries(formHistory ?? {}).reverse(), [formHistory]);

    const revisionRoute = useMemo(() => `${match.path}/${FORM_REVISION_ROUTE}`, [match.path]);
    const revertRoute = useMemo(() => `${match.path}${REVERT_FORM_ROUTE}`, [match.path]);

    const [selectedRevision, setSelectedRevision] = useState<Partial<FormType> | null>(null);
    const version = useMemo(() => selectedRevision?.version, [selectedRevision]);

    const handleRevisionClick = useCallback(
        (revision: Partial<FormType>) => {
            setSelectedRevision(revision);
            history.push({
                pathname: revisionRoute,
                search: `?objectId=${objectId}&objectGuid=${objectGuid}&templateId=${templateId}&formId=${formId}`,
            });
        },
        [formId, history, objectGuid, objectId, revisionRoute, templateId],
    );

    const handleRevertClick = useCallback(() => {
        history.push({
            pathname: revertRoute,
            search: `?objectId=${objectId}&objectGuid=${objectGuid}&templateId=${templateId}&formId=${formId}`,
        });
    }, [formId, history, objectGuid, objectId, revertRoute, templateId]);

    return (
        <Switch>
            <Route exact path={match.path}>
                <Box boxShadow={theme.customShadows.widgetHeader}>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box m={1} display="flex" justifyContent="space-between">
                        <Button color="grey" onClick={history.goBack}>
                            <ArrowBack sx={{ mr: 1 }} />
                            {t("back")}
                        </Button>
                    </Box>
                </Box>
                {isFormHistoryLoading && (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                )}
                <Typography px={1} py={2} pb={0} variant="h6" fontWeight={600}>
                    {t("formHistory", { title })}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <ScrollBox height="100%">
                    {!isFormHistoryLoading && formHistoryEntries.length === 0 ? (
                        <Typography px={1}>{t("noFormHistoryAvailable", { title })}</Typography>
                    ) : (
                        <AutoSizer disableWidth>
                            {({ height }) => (
                                <List
                                    height={height}
                                    itemCount={formHistoryEntries.length}
                                    itemSize={52}
                                    width="100%"
                                    itemData={{ formHistoryEntries, handleRevisionClick }}
                                    overscanCount={3}
                                >
                                    {FormHistoryEntry}
                                </List>
                            )}
                        </AutoSizer>
                    )}
                </ScrollBox>
            </Route>
            <Route path={revisionRoute}>
                <>
                    <Box boxShadow={theme.customShadows.widgetHeader}>
                        <Box px={1}>
                            <Divider />
                        </Box>
                        <Box m={1} display="flex" justifyContent="space-between">
                            <Button color="grey" onClick={() => history.goBack()}>
                                <ArrowBack sx={{ mr: 1 }} />
                                {t("back")}
                            </Button>
                            <Button color="grey" onClick={handleRevertClick} disabled={!canEdit || isFinal}>
                                <History sx={{ mr: 1 }} />
                                {t("revertToThisVersion")}
                            </Button>
                        </Box>
                    </Box>
                    <Typography px={1} py={2} pb={0} variant="h6" fontWeight={600}>
                        {t("formHistory", { title })}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Form form={selectedRevision!} title={selectedRevision?.title || formId} populateEditor disabled />
                </>
            </Route>
            <Route path={revertRoute}>
                <RevertConfirmation
                    version={version}
                    objectId={objectId}
                    objectGuid={objectGuid}
                    templateId={templateId}
                    formId={formId}
                    title={title}
                />
            </Route>
        </Switch>
    );
}

interface FormHistoryEntryProps {
    index: number;
    style: CSSProperties;
    data: {
        formHistoryEntries: [string, Partial<FormType>][];
        handleRevisionClick: (revision: Partial<FormType>) => void;
    };
}

function FormHistoryEntry({ index, style, data: { handleRevisionClick, formHistoryEntries } }: FormHistoryEntryProps) {
    const { t } = useTranslation();

    const [timestamp, revision] = formHistoryEntries[index];
    const color = useMemo(
        () =>
            revision.isFinal
                ? undefined
                : revision.state === "new"
                  ? "red"
                  : revision.state === "finished"
                    ? "green"
                    : "orange",
        [revision.isFinal, revision.state],
    );
    const dateTime = useMemo(
        () => new Date(Number.parseInt(timestamp) * 1000).toLocaleString() || t("n/a"),
        [timestamp, t],
    );
    const author = useMemo(() => `${revision.createdBy?.userName} (${revision.createdBy?.userLogin})`, [revision]);
    const text = useMemo(() => `${dateTime} ${author}`, [dateTime, author]);
    const handleRowClick = useCallback(() => {
        handleRevisionClick(revision);
    }, [handleRevisionClick, revision]);

    return (
        <div style={style}>
            <ListItemButton key={timestamp} sx={{ height: "52px" }} onClick={handleRowClick}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                    {revision.signatures ? (
                        <Create htmlColor={color} color={revision.isFinal ? "primary" : "inherit"} />
                    ) : (
                        <Circle htmlColor={color} fontSize="small" />
                    )}
                </ListItemIcon>
                <ListItemText title={author}>{text}</ListItemText>
            </ListItemButton>
        </div>
    );
}
