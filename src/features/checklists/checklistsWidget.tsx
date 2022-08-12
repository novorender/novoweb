import { PropsWithChildren, useRef, useEffect } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import {
    customGroupsActions,
    InternalGroup,
    useDispatchCustomGroups,
    useLazyCustomGroups,
} from "contexts/customGroups";
import { VecRGBA } from "utils/color";
import { selectMainObject } from "slices/renderSlice";

import { selectLastViewedPaths } from "./checklistsSlice";
import { Checklists } from "./routes/checklists";
import { Create } from "./routes/create";
import { Checklist } from "./routes/checklist";
import { Instance } from "./routes/instance";
import { Object } from "./routes/object";

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
    const dispatchCustomGroups = useDispatchCustomGroups();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.checklists.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.checklists.key;
    // const lastViewedPaths = useAppSelector(selectLastViewedPaths);

    useEffect(
        function initChecklistGroups() {
            if (customGroups.current.find((group) => group.id === checklistGroups[0].id)) {
                return;
            }

            dispatchCustomGroups(customGroupsActions.add(checklistGroups));
        },
        [customGroups, dispatchCustomGroups]
    );

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
                    <MemoryRouter>
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
                            <Route path="/object/:id">
                                <Object />
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

// todo fix mess
function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    // eslint-disable-next-line
    const location = useLocation();
    const history = useHistory();
    // eslint-disable-next-line
    const willUnmount = useRef(false);
    // eslint-disable-next-line
    const dispatch = useAppDispatch();
    const mainObject = useAppSelector(selectMainObject);
    const lastViewedPaths = useAppSelector(selectLastViewedPaths);
    // eslint-disable-next-line
    const prevPaths = useRef(lastViewedPaths);

    useEffect(() => {
        if (mainObject !== undefined) {
            history.push(`/object/${mainObject}`);
            // console.log(history);
            // if (history.location.pathname.includes("/object")) {
            //     history.replace(`/object/${mainObject}`);
            // } else {
            //     history.push(`/object/${mainObject}`);
            // }
        }
    }, [mainObject, history]);

    // useEffect(() => {
    //     if (history.action === "PUSH") {
    //         prevPaths.current = prevPaths.current.concat(history.location.pathname);
    //     } else if (["POP", "REPLACE"].includes(history.action) && history.location.pathname !== location.pathname) {
    //         prevPaths.current = prevPaths.current.slice(0, -1);
    //     }
    // }, [history, location.pathname]);

    // useEffect(() => {
    //     return () => {
    //         willUnmount.current = true;
    //     };
    // }, []);

    // useEffect(() => {
    //     return () => {
    //         if (willUnmount.current) {
    //             dispatch(checklistsActions.setLastViewedPaths(prevPaths.current));
    //         }
    //     };
    // }, [location, dispatch]);

    return <Switch {...props} />;
}
