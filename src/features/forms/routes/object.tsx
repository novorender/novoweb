import { ArrowBack, Checklist, Circle } from "@mui/icons-material";
import {
    Box,
    Button,
    LinearProgress,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    useTheme,
} from "@mui/material";
import { skipToken } from "@reduxjs/toolkit/query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Redirect, useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { renderActions } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";

import { useGetSearchFormsQuery } from "../api";
import { selectCurrentFormsList } from "../slice";
import { type FormObjectGuid } from "../types";
import { idsToObjects } from "../utils";

export function Object() {
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const { id } = useParams<{ id: FormObjectGuid }>();
    const theme = useTheme();
    const history = useHistory();
    const sceneId = useSceneId();
    const currentFormsList = useAppSelector(selectCurrentFormsList);
    const [abortController] = useAbortController();
    const { idArr: highlighted } = useHighlighted();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();

    const [object, setObject] = useState<{
        id: number;
        guid: string;
        name: string;
    }>();

    const [isLoading, setLoadingObject] = useState(false);

    const abortSignal = abortController.current.signal;

    useEffect(() => {
        if (!id) {
            return;
        }

        const fetchData = async () => {
            setLoadingObject(true);
            const objects = await idsToObjects({
                ids: [+id],
                db,
                abortSignal,
            });

            const object = {
                id: objects[0]?.id ?? "",
                guid: objects[0]?.guid ?? "",
                name: objects[0]?.name ?? "",
            };

            setObject(object);
            setLoadingObject(false);
        };

        fetchData();
    }, [id, db, abortSignal]);

    useEffect(() => {
        if (!id || highlighted.includes(+id)) {
            return;
        }
        dispatchHighlighted(highlightActions.setIds([+id]));
    }, [dispatchHighlighted, id, highlighted]);

    const {
        data: forms,
        isLoading: formsLoading,
        isUninitialized,
    } = useGetSearchFormsQuery(
        object?.guid
            ? {
                  projectId: sceneId,
                  objectGuid: object?.guid,
              }
            : skipToken,
    );

    if (forms && (currentFormsList || forms?.length === 1) && object?.guid) {
        return (
            <Redirect
                push={false}
                to={{
                    pathname: `/search-instance/${object.guid}-${currentFormsList || forms[0].id}`,
                    state: { objectId: object.id },
                }}
            />
        );
    }

    const handleBackClick = () => {
        if (id) {
            dispatchHighlighted(highlightActions.remove([+id]));
        }
        dispatch(renderActions.setMainObject(undefined));
        history.goBack();
    };

    const handleHomeClick = () => {
        if (id) {
            dispatchHighlighted(highlightActions.remove([+id]));
        }
        dispatch(renderActions.setMainObject(undefined));
        history.push("/");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button color="grey" onClick={handleBackClick}>
                            <ArrowBack sx={{ mr: 1 }} />
                            {t("back")}
                        </Button>
                        <Button color="grey" onClick={handleHomeClick}>
                            <Checklist sx={{ mr: 1 }} />
                            {t("allForms")}
                        </Button>
                    </Box>
                </>
            </Box>
            {isLoading || formsLoading || isUninitialized ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : (
                <ScrollBox py={2}>
                    <Typography px={1} fontWeight={600} mb={1}>
                        {object?.name}
                    </Typography>
                    {forms?.length ? (
                        <List dense disablePadding>
                            {forms.map((form) => {
                                return (
                                    <ListItemButton
                                        key={form.id}
                                        sx={{ justifyContent: "space-between" }}
                                        onClick={() => {
                                            if (object?.guid) {
                                                history.push({
                                                    pathname: `/search-instance/${object.guid}-${form.id}`,
                                                    state: { objectId: object.id },
                                                });
                                            }
                                        }}
                                    >
                                        <ListItemIcon
                                            sx={{
                                                minWidth: 24,
                                                minHeight: 24,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 12,
                                                mr: 1,
                                            }}
                                        >
                                            <Circle
                                                htmlColor={
                                                    form.state === "new"
                                                        ? "red"
                                                        : form.state === "finished"
                                                          ? "green"
                                                          : "orange"
                                                }
                                                fontSize="inherit"
                                            />
                                        </ListItemIcon>
                                        <ListItemText>{form.title}</ListItemText>
                                    </ListItemButton>
                                );
                            })}
                        </List>
                    ) : (
                        <Typography px={1}>{t("noFormsAttachedToTheSelectedObject.")}</Typography>
                    )}
                </ScrollBox>
            )}
        </>
    );
}
