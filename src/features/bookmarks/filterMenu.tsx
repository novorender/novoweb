import { Search } from "@mui/icons-material";
import { Checkbox, InputAdornment, Menu, MenuItem, MenuProps, Typography, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app";
import { TextField } from "components";
import { selectUser } from "slices/authSlice";

import { bookmarksActions, selectBookmarkFilters } from "./bookmarksSlice";

export function FilterMenu({ ...MenuProps }: MenuProps) {
    const theme = useTheme();

    const filters = useAppSelector(selectBookmarkFilters);
    const user = useAppSelector(selectUser);
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
                    value={filters.title}
                    onChange={(e) => dispatch(bookmarksActions.setFilters({ title: e.target.value }))}
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
            <MenuItem
                onClick={() => dispatch(bookmarksActions.toggleFilter("measurements"))}
                sx={{ display: "flex", justifyContent: "space-between" }}
            >
                <Typography>Measure</Typography>
                <Checkbox checked={filters.measurements} />
            </MenuItem>
            <MenuItem
                onClick={() => dispatch(bookmarksActions.toggleFilter("clipping"))}
                sx={{ display: "flex", justifyContent: "space-between" }}
            >
                <Typography>Clipping</Typography>
                <Checkbox checked={filters.clipping} />
            </MenuItem>
            <MenuItem
                onClick={() => dispatch(bookmarksActions.toggleFilter("groups"))}
                sx={{ display: "flex", justifyContent: "space-between" }}
            >
                <Typography>Groups</Typography>
                <Checkbox checked={filters.groups} />
            </MenuItem>
            {user
                ? [
                      <MenuItem
                          key="personal"
                          onClick={() =>
                              dispatch(
                                  bookmarksActions.setFilters({
                                      personal: !filters.personal,
                                      public: !filters.personal ? false : filters.public,
                                  })
                              )
                          }
                          sx={{ display: "flex", justifyContent: "space-between" }}
                      >
                          <Typography>Personal</Typography>
                          <Checkbox checked={filters.personal} />
                      </MenuItem>,
                      <MenuItem
                          key="public"
                          onClick={() =>
                              dispatch(
                                  bookmarksActions.setFilters({
                                      public: !filters.public,
                                      personal: !filters.public ? false : filters.personal,
                                  })
                              )
                          }
                          sx={{ display: "flex", justifyContent: "space-between" }}
                      >
                          <Typography>Public</Typography>
                          <Checkbox checked={filters.public} />
                      </MenuItem>,
                  ]
                : null}
        </Menu>
    );
}
