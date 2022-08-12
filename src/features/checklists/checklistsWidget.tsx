import { PropsWithChildren, useRef, useEffect } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { customGroupsActions, InternalGroup, useCustomGroups, useLazyCustomGroups } from "contexts/customGroups";
import { VecRGBA } from "utils/color";

import { checklistsActions, selectLastViewedPath } from "./checklistsSlice";
import { Checklists } from "./routes/checklists";
import { Create } from "./routes/create";
import { Checklist } from "./routes/checklist";
import { Instance } from "./routes/instance";

const checklistGroups = [
    {
        id: InternalGroup.Checklist + "_CUSTOM_HIGHLIGHT",
        name: "Custom highlight",
        grouping: InternalGroup.Checklist,
        selected: true,
        hidden: false,
        color: [1, 0.4, 0.7, 1] as VecRGBA,
        ids: [],
    },
    {
        id: InternalGroup.Checklist + "_RED",
        name: "Red",
        grouping: InternalGroup.Checklist,
        selected: true,
        hidden: false,
        color: [0.5, 0, 0, 1] as VecRGBA,
        ids: [],
    },
    {
        id: InternalGroup.Checklist + "_ORANGE",
        name: "Orange",
        grouping: InternalGroup.Checklist,
        selected: true,
        hidden: false,
        color: [1, 0.75, 0, 1] as VecRGBA,
        ids: [],
    },
    {
        id: InternalGroup.Checklist + "_GREEN",
        name: "Green",
        grouping: InternalGroup.Checklist,
        selected: true,
        hidden: false,
        color: [0, 0.5, 0, 1] as VecRGBA,
        ids: [],
    },
];

export function ChecklistsWidget() {
    const customGroups = useLazyCustomGroups();
    const { dispatch: dispatchCustomGroups } = useCustomGroups();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.checklists.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.checklists.key;
    const lastViewedPath = useAppSelector(selectLastViewedPath);

    useEffect(
        function initChecklistGroups() {
            if (customGroups.current.find((group) => group.id === checklistGroups[0].id)) {
                return;
            }

            dispatchCustomGroups(customGroupsActions.add(checklistGroups));
        },
        [customGroups, dispatchCustomGroups]
    );

    (window as any).groups = customGroups;

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.checklists} disableShadow={!menuOpen} />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <MemoryRouter initialEntries={["/", lastViewedPath]} initialIndex={1}>
                        <CustomSwitch>
                            <Route path="/" exact>
                                <Checklists />
                            </Route>
                            <Route path="/checklist/:id">
                                <Checklist />
                            </Route>
                            <Route path="/instance/:id">
                                <Instance />
                            </Route>
                            <Route path="/create">
                                <Create />
                            </Route>
                        </CustomSwitch>
                    </MemoryRouter>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.checklists.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.checklists.key}-widget-menu-fab`}
            />
        </>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const location = useLocation();
    const willUnmount = useRef(false);
    const dispatch = useAppDispatch();

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                dispatch(checklistsActions.setLastViewedPath(location.pathname));
            }
        };
    }, [location, dispatch]);

    return <Switch {...props} />;
}
