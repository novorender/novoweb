import { FileDownload } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { matchPath, MemoryRouter, Route, Switch, useHistory, useLocation } from "react-router-dom";

import { useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useSelectionBasket } from "contexts/selectionBasket";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";

import { CsvExport } from "./routes/csvExport";
import { List } from "./routes/list";
import { Root } from "./routes/root";

export default function SelectionBasketRouter() {
    return (
        <MemoryRouter>
            <SelectionBasket />
        </MemoryRouter>
    );
}

function SelectionBasket() {
    const history = useHistory();
    const location = useLocation();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.selectionBasket.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.selectionBasket.key);
    const basket = useSelectionBasket().idArr;

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    widget={{ ...featuresConfig.selectionBasket, name: "Selection basket" as any }}
                    WidgetMenu={(props) => (
                        <Menu {...props}>
                            <div>
                                <MenuItem
                                    onClick={() => {
                                        history.push("/csvexport");

                                        if (props.onClose) {
                                            props.onClose({}, "backdropClick");
                                        }
                                    }}
                                    disabled={
                                        !basket.length ||
                                        matchPath(location.pathname, {
                                            path: "/csvexport",
                                            exact: false,
                                            strict: false,
                                        }) !== null
                                    }
                                >
                                    <>
                                        <ListItemIcon>
                                            <FileDownload fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText>Export as CSV</ListItemText>
                                    </>
                                </MenuItem>
                            </div>
                        </Menu>
                    )}
                    disableShadow
                />

                <Box
                    display={!menuOpen && !minimized ? "flex" : "none"}
                    flexDirection="column"
                    overflow="hidden"
                    height={1}
                >
                    <Switch>
                        <Route path="/" exact>
                            <Root />
                        </Route>
                        <Route path="/list">
                            <List />
                        </Route>
                        <Route path="/csvexport">
                            <CsvExport />
                        </Route>
                    </Switch>
                </Box>

                {menuOpen && <WidgetList widgetKey={featuresConfig.selectionBasket.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
        </>
    );
}
