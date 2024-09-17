import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { Divider } from "components";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { FormItem, TemplateType } from "../../types";
import { AddFormItem } from "./addFormItem";
import { AddObjects } from "./addObjects";
import { CreateForm } from "./createForm";
import { SelectMarker } from "./selectMarker";

const ADD_ITEM_ROUTE = "/add-item";
const ADD_OBJECTS_ROUTE = "/add-objects";
const SELECT_MARKER_ROUTE = "/select-marker";

export function Create() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
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
                <Route path={match.path} exact>
                    <CreateForm
                        type={type}
                        setType={setType}
                        title={title}
                        setTitle={handleSetTitle}
                        items={items}
                        setItems={handleSetItems}
                        objects={objects}
                        marker={marker}
                    />
                </Route>
            </Switch>
        </>
    );
}
