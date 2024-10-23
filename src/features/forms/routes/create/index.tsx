import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { skipToken } from "@reduxjs/toolkit/query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useHistory, useParams, useRouteMatch } from "react-router-dom";

import { Divider } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useGetTemplateQuery } from "features/forms/api";
import { toFormItems } from "features/forms/utils";
import { useSceneId } from "hooks/useSceneId";
import { searchDeepByPatterns } from "utils/search";

import { type FormItem, type SearchTemplate, type TemplateId, TemplateType } from "../../types";
import { AddFormItem } from "./addFormItem";
import { AddObjects } from "./addObjects";
import { CreateForm } from "./createForm";
import { SelectMarker } from "./selectMarker";

const ADD_ITEM_ROUTE = "/add-item";
const ADD_OBJECTS_ROUTE = "/add-objects";
const SELECT_MARKER_ROUTE = "/select-marker";

export function Create({ derived }: { derived?: boolean }) {
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const { templateId } = useParams<{ templateId?: TemplateId }>();
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const projectId = useSceneId();
    const dispatchHighlighted = useDispatchHighlighted();

    const [type, setType] = useState(TemplateType.Search);
    const [title, setTitle] = useState("");
    const [items, setItems] = useState<FormItem[]>([]);
    const [objects, setObjects] = useState<
        | {
              searchPattern: string | SearchPattern[];
              ids: ObjectId[];
          }
        | undefined
    >();
    const [marker, setMarker] = useState<string>();

    const { data: template } = useGetTemplateQuery(templateId ? { projectId, templateId } : skipToken);

    useEffect(() => {
        if (template) {
            setType(template.type!);
            setTitle(template.title ?? "");
            setItems(template.fields ? toFormItems(template.fields) : []);
            if (template.type === TemplateType.Search) {
                // FIXME: Future update should allow to edit object selection query.
                // There are quirks, so we don't allow it for now.
                if (derived) {
                    const searchPattern = (template as SearchTemplate).searchPattern
                        ? JSON.parse((template as SearchTemplate).searchPattern)
                        : [];
                    if (searchPattern.length > 0) {
                        searchDeepByPatterns({
                            abortSignal: new AbortController().signal,
                            db,
                            searchPatterns: searchPattern,
                            callback: (ids) => {
                                setObjects((objects) => ({
                                    searchPattern,
                                    ids: Array.from(new Set([...(objects?.ids ?? []), ...ids])),
                                }));
                            },
                        });
                    }
                }
            } else {
                setMarker(template.marker);
            }
        }
    }, [db, derived, template]);

    const handleBackClick = useCallback(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        history.goBack();
    }, [history, dispatchHighlighted]);

    const handleAddItem = useCallback((item: FormItem) => {
        setItems((items) => [...items, item]);
    }, []);

    const handleSaveObjects = useCallback((objects: { searchPattern: string | SearchPattern[]; ids: ObjectId[] }) => {
        setObjects(objects);
    }, []);

    const handleSetTitle = useCallback((title: string) => {
        setTitle(title);
    }, []);

    const handleSetItems = useCallback((items: FormItem[]) => {
        setItems(items);
    }, []);

    const handleSelectMarker = useCallback((marker: string) => {
        setMarker(marker);
    }, []);

    const addItemRoute = useMemo(() => `${match.path}${ADD_ITEM_ROUTE}`, [match.path]);
    const addObjectsRoute = useMemo(() => `${match.path}${ADD_OBJECTS_ROUTE}`, [match.path]);
    const selectMarkerRoute = useMemo(() => `${match.path}${SELECT_MARKER_ROUTE}`, [match.path]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box m={1} display="flex" justifyContent="space-between">
                    <Button color="grey" onClick={handleBackClick}>
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                </Box>
            </Box>
            <Switch>
                <Route path={addItemRoute}>
                    <AddFormItem onSave={handleAddItem} />
                </Route>
                <Route path={addObjectsRoute}>
                    <AddObjects onSave={handleSaveObjects} objects={objects} />
                </Route>
                <Route path={selectMarkerRoute}>
                    <SelectMarker marker={marker} onChange={handleSelectMarker} />
                </Route>
                <Route path={match.url} exact>
                    <CreateForm
                        type={type}
                        setType={setType}
                        title={title}
                        setTitle={handleSetTitle}
                        items={items}
                        setItems={handleSetItems}
                        objects={objects}
                        marker={marker}
                        templateId={derived ? undefined : templateId}
                    />
                </Route>
            </Switch>
        </>
    );
}
