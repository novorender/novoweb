import { AddCircle, Save } from "@mui/icons-material";
import { ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { selectHasAdminCapabilities } from "slices/explorer";

export function WidgetMenu(props: MenuProps) {
    const { t } = useTranslation();
    const history = useHistory();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    if (!isAdmin) {
        return null;
    }

    const goTo = (url: string) => {
        history.push(url);

        if (props.onClose) {
            props.onClose({}, "backdropClick");
        }
    };

    return (
        <Menu {...props}>
            <MenuItem onClick={() => goTo("/edit")}>
                <ListItemIcon>
                    <AddCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("addFeatureServer")}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => goTo("/save")}>
                <ListItemIcon>
                    <Save fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("save")}</ListItemText>
            </MenuItem>
        </Menu>
    );
}
