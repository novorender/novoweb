import { Box } from "@mui/material";
import { PropsWithChildren, useEffect, useRef } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { selectMainObject } from "features/render/renderSlice";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";

import { useRenderLocationFormAssets } from "./hooks/useRenderLocationFormAssets";
import { Create, FormsList, LocationInstance, Object, SearchInstance, Templates } from "./routes";
import { formsActions } from "./slice";

export default function Forms() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.forms.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.forms.key);

    useRenderLocationFormAssets();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.forms} disableShadow={!menuOpen} />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <MemoryRouter>
                        <CustomSwitch>
                            <Route path="/" exact>
                                <Templates />
                            </Route>
                            <Route path="/forms/:templateId">
                                <FormsList />
                            </Route>
                            <Route path="/search-instance/:objectGuid-:formId">
                                <SearchInstance />
                            </Route>
                            <Route path="/location-instance/:templateId-:formId">
                                <LocationInstance />
                            </Route>
                            <Route path="/object/:id">
                                <Object />
                            </Route>
                            <Route path="/create">
                                <Create />
                            </Route>
                        </CustomSwitch>
                    </MemoryRouter>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.forms.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const history = useHistory();
    const willUnmount = useRef(false);
    const dispatch = useAppDispatch();
    const mainObject = useAppSelector(selectMainObject);

    useEffect(() => {
        if (mainObject !== undefined && !history.location.pathname.startsWith("/create")) {
            history.push(`/object/${mainObject}`);
        }
    }, [history, mainObject]);

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(
        () => () => {
            if (willUnmount.current) {
                dispatch(formsActions.resetTemplatesFilters());
                dispatch(formsActions.setLastViewedPath(history.location.pathname));
            }
        },
        [dispatch, history.location.pathname]
    );

    return <Switch {...props} />;
}
