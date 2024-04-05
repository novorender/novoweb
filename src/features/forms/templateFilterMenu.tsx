import { Search } from "@mui/icons-material";
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
        <Typography>{filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}</Typography>
        <Checkbox checked={filterValue} />
    </MenuItem>
);

export function TemplateFilterMenu({ ...MenuProps }: MenuProps) {
    const theme = useTheme();

    const templatesFilters = useAppSelector(selectTemplatesFilters);
    const { name, search, location } = templatesFilters;
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
                    placeholder="Search"
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
            <TemplateFilterMenuItem filterKey="search" filterValue={search} dispatch={dispatch} />
            <TemplateFilterMenuItem filterKey="location" filterValue={location} dispatch={dispatch} />
        </Menu>
    );
}
