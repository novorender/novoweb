import { useState } from "react";
import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useHistory, Switch, Route, useRouteMatch } from "react-router-dom";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";

import { Divider } from "components";

import { ChecklistItem } from "../../types";
import { AddChecklistItem } from "./addChecklistItem";
import { AddObjects } from "./addObjects";
import { CreateChecklist } from "./createChecklist";

export function Create() {
    const theme = useTheme();
    const history = useHistory();
    const match = useRouteMatch();

    const [title, setTitle] = useState("");
    const [items, setItems] = useState([] as ChecklistItem[]);
    const [objects, setObjects] = useState<{ searchPattern: SearchPattern[]; ids: ObjectId[] }>();

    const handleAddItem = (item: ChecklistItem) => {
        setItems((state) => state.concat(item));
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button color="grey" onClick={() => history.goBack()}>
                            <ArrowBack sx={{ mr: 1 }} />
                            Back
                        </Button>
                    </Box>
                </>
            </Box>
            <Switch>
                <Route path={match.path + "/add-item"}>
                    <AddChecklistItem onSave={handleAddItem} />
                </Route>
                <Route path={match.path + "/add-objects"}>
                    <AddObjects onSave={setObjects} />
                </Route>
                <Route path={match.path} exact>
                    <CreateChecklist
                        title={title}
                        setTitle={setTitle}
                        items={items}
                        setItems={setItems}
                        objects={objects}
                    />
                </Route>
            </Switch>
        </>
    );
}
