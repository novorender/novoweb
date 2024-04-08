import { Place, Search } from "@mui/icons-material";
import { Checkbox, InputAdornment, Menu, MenuItem, MenuProps, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AppDispatch } from "app/store";
import { TextField } from "components";

import { formsActions, selectTemplatesFilters, type TemplatesFilters } from "./slice";

const TemplateFilterMenuItem = ({
    filterKey,
    filterValue,
    dispatch,
}: {
    filterKey: Exclude<keyof TemplatesFilters, "name">;
    filterValue: boolean;
    dispatch: AppDispatch;
}) => (
    <MenuItem
        onClick={() => dispatch(formsActions.toggleTemplatesFilter(filterKey))}
        sx={{ display: "flex", justifyContent: "space-between" }}
    >
        {filterKey === "object" ? <Search /> : <Place />}
        <Typography flex={1} pl={1}>
            {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}
        </Typography>
        <Checkbox checked={filterValue} />
    </MenuItem>
);

export function TemplateFilterMenu({ ...MenuProps }: MenuProps) {
    const theme = useTheme();

    const templatesFilters = useAppSelector(selectTemplatesFilters);
    const { name, object, geo } = templatesFilters;
    const dispatch = useAppDispatch();

    return (
        <Menu
            onClick={(e) => e.stopPropagation()}
            {...MenuProps}
            MenuListProps={{ sx: { maxWidth: "100%", width: 360, pt: 0 } }}
        >
            <MenuItem sx={{ background: theme.palette.grey[100] }}>
                <TextField
                    autoFocus
                    fullWidth
                    variant="standard"
                    placeholder="Search by name"
                    value={name}
                    onChange={(e) => dispatch(formsActions.setTemplatesFilters({ name: e.target.value }))}
                    InputProps={{
                        disableUnderline: true,
                        onKeyDown: (e) => e.stopPropagation(),
                        endAdornment: (
                            <InputAdornment position="end" sx={{ mr: 1.2 }}>
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                />
            </MenuItem>
            <TemplateFilterMenuItem filterKey="object" filterValue={object} dispatch={dispatch} />
            <TemplateFilterMenuItem filterKey="geo" filterValue={geo} dispatch={dispatch} />
        </Menu>
    );
}
