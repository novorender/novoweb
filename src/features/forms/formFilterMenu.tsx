import { Search } from "@mui/icons-material";
import { Checkbox, InputAdornment, Menu, MenuItem, MenuProps, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { AppDispatch } from "app/store";
import { TextField } from "components";

import { FormFilters, formsActions, selectFormFilters } from "./slice";

const FormFilterMenuItem = ({
    filterKey,
    filterValue,
    dispatch,
}: {
    filterKey: Exclude<keyof FormFilters, "name">;
    filterValue: boolean;
    dispatch: AppDispatch;
}) => (
    <MenuItem
        onClick={() => dispatch(formsActions.toggleFormFilter(filterKey))}
        sx={{ display: "flex", justifyContent: "space-between" }}
    >
        <Typography>{filterKey.charAt(0).toUpperCase() + filterKey.slice(1)}</Typography>
        <Checkbox checked={filterValue} />
    </MenuItem>
);

export function FormFilterMenu({ ...MenuProps }: MenuProps) {
    const theme = useTheme();

    const formFilters = useAppSelector(selectFormFilters);
    const { name, new: isNew, ongoing, finished } = formFilters;
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
                    onChange={(e) => dispatch(formsActions.setFormFilters({ name: e.target.value }))}
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
            <FormFilterMenuItem filterKey="new" filterValue={isNew} dispatch={dispatch} />
            <FormFilterMenuItem filterKey="ongoing" filterValue={ongoing} dispatch={dispatch} />
            <FormFilterMenuItem filterKey="finished" filterValue={finished} dispatch={dispatch} />
        </Menu>
    );
}
