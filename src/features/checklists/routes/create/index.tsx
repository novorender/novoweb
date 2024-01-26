import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { useCallback, useMemo, useState } from "react";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { Divider } from "components";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { ChecklistItem } from "../../types";
import { AddChecklistItem } from "./addChecklistItem";
import { AddObjects } from "./addObjects";
import { CreateChecklist } from "./createChecklist";

const ADD_ITEM_ROUTE = "/add-item";
const ADD_OBJECTS_ROUTE = "/add-objects";

export function Create() {
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const dispatchHighlighted = useDispatchHighlighted();

    const [title, setTitle] = useState("");
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [objects, setObjects] = useState<
        | {
              searchPattern: string | SearchPattern[];
              ids: ObjectId[];
          }
        | undefined
    >();

    const handleBackClick = useCallback(() => {
        dispatchHighlighted(highlightActions.setIds([]));
        history.goBack();
    }, [history, dispatchHighlighted]);

    const handleAddItem = useCallback((item: ChecklistItem) => {
        setItems((items) => [...items, item]);
    }, []);

    const handleSaveObjects = useCallback((objects: { searchPattern: string | SearchPattern[]; ids: ObjectId[] }) => {
        setObjects(objects);
    }, []);

    const handleSetTitle = useCallback((title: string) => {
        setTitle(title);
    }, []);

    const handleSetItems = useCallback((items: ChecklistItem[]) => {
        setItems(items);
    }, []);

    const addItemRoute = useMemo(() => `${match.path}${ADD_ITEM_ROUTE}`, [match.path]);
    const addObjectsRoute = useMemo(() => `${match.path}${ADD_OBJECTS_ROUTE}`, [match.path]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={handleBackClick}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            <Switch>
                <Route path={addItemRoute}>
                    <AddChecklistItem onSave={handleAddItem} />
                </Route>
                <Route path={addObjectsRoute}>
                    <AddObjects onSave={handleSaveObjects} objects={objects} />
                </Route>
                <Route path={match.path} exact>
                    <CreateChecklist
                        title={title}
                        setTitle={handleSetTitle}
                        items={items}
                        setItems={handleSetItems}
                        objects={objects}
                    />
                </Route>
            </Switch>
        </>
    );
}
