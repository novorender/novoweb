import { Search } from "@mui/icons-material";
import { Checkbox, InputAdornment, Menu, MenuItem, MenuProps, Typography, useTheme } from "@mui/material";

import { AppDispatch, useAppDispatch, useAppSelector } from "app/store";
import { TextField } from "components";

import { Filters, formsActions, selectFilters } from "./slice";

const FilterMenuItem = ({
    filterKey,
    filterValue,
    dispatch,
}: {
    filterKey: Exclude<keyof Filters, "name">;
    filterValue: boolean;
    dispatch: AppDispatch;
}) => (
    <MenuItem
        onClick={() => dispatch(formsActions.toggleFilter(filterKey))}
        sx={{ display: "flex", justifyContent: "space-between" }}
    >
        <Typography>{filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}</Typography>
        <Checkbox checked={filterValue} />
    </MenuItem>
);

export function FilterMenu({ ...MenuProps }: MenuProps) {
    const theme = useTheme();

    const filters = useAppSelector(selectFilters);
    const { name, new: isNew, ongoing, finished } = filters;
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
                    onChange={(e) => dispatch(formsActions.setFilters({ name: e.target.value }))}
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
            <FilterMenuItem filterKey="new" filterValue={isNew} dispatch={dispatch} />
            <FilterMenuItem filterKey="ongoing" filterValue={ongoing} dispatch={dispatch} />
            <FilterMenuItem filterKey="finished" filterValue={finished} dispatch={dispatch} />
        </Menu>
    );
}
