import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { useCallback, useMemo, useState } from "react";
import { Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { Divider } from "components";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";

import { FormItem, FormType } from "../../types";
import { AddFormItem } from "./addFormItem";
import { AddObjects } from "./addObjects";
import { CreateForm } from "./createForm";
import { SelectSymbol } from "./selectSymbol";

const ADD_ITEM_ROUTE = "/add-item";
const ADD_OBJECTS_ROUTE = "/add-objects";
const SELECT_SYMBOL_ROUTE = "/select-symbol";

export function Create() {
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();
    const dispatchHighlighted = useDispatchHighlighted();

    const [formType, setFormType] = useState(FormType.SearchBased);
    const [title, setTitle] = useState("");
    const [items, setItems] = useState<FormItem[]>([]);
    const [objects, setObjects] = useState<
        | {
              searchPattern: string | SearchPattern[];
              ids: ObjectId[];
          }
        | undefined
    >();
    const [symbol, setSymbol] = useState<string>();

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

    const handleSelectSymbol = useCallback((symbol: string) => {
        setSymbol(symbol);
    }, []);

    const addItemRoute = useMemo(() => `${match.path}${ADD_ITEM_ROUTE}`, [match.path]);
    const addObjectsRoute = useMemo(() => `${match.path}${ADD_OBJECTS_ROUTE}`, [match.path]);
    const selectSymbolRoute = useMemo(() => `${match.path}${SELECT_SYMBOL_ROUTE}`, [match.path]);

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
                    <AddFormItem onSave={handleAddItem} />
                </Route>
                <Route path={addObjectsRoute}>
                    <AddObjects onSave={handleSaveObjects} objects={objects} />
                </Route>
                <Route path={selectSymbolRoute}>
                    <SelectSymbol symbol={symbol} onChange={handleSelectSymbol} />
                </Route>
                <Route path={match.path} exact>
                    <CreateForm
                        formType={formType}
                        setFormType={setFormType}
                        title={title}
                        setTitle={handleSetTitle}
                        items={items}
                        setItems={handleSetItems}
                        objects={objects}
                        symbol={symbol}
                    />
                </Route>
            </Switch>
        </>
    );
}
