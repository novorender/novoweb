import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { GroupStatus } from "contexts/objectGroups";
import { resetView, selectBookmark } from "features/render";
import { AsyncStatus } from "types/misc";
import { VecRGBA } from "utils/color";

export type PropertyTreeGroup = {
    propertyValue: string;
    ids: { [objectId: number]: number };
    color: VecRGBA;
    status: GroupStatus;
};

const initialState = {
    groups: { property: "", groups: [] } as { property: string; groups: PropertyTreeGroup[] },
    expanded: [] as string[],
    searchStatus: AsyncStatus.Initial,
    groupsCreationStatus: AsyncStatus.Initial,
};

type State = typeof initialState;

export const propertyTreeSlice = createSlice({
    name: "propertyTree",
    initialState: initialState,
    reducers: {
        upsertGroup: (
            state,
            {
                payload: { group, property, value },
            }: PayloadAction<{ group: PropertyTreeGroup; property: string; value: string }>
        ) => {
            if (state.groups?.property !== property) {
                state.groups = {
                    property,
                    groups: [],
                };
            }

            const idx = state.groups.groups.findIndex((group) => group.propertyValue === value);

            if (idx === -1) {
                state.groups.groups.push(group);
            } else {
                state.groups.groups[idx] = group;
            }
        },
        resetAllGroupsStatus: (state) => {
            state.groups.groups.forEach((group) => (group.status = GroupStatus.None));
        },
        expand: (state, action: PayloadAction<string>) => {
            state.expanded.push(action.payload);
        },
        close: (state, action: PayloadAction<string>) => {
            state.expanded = state.expanded.filter((expanded) => expanded !== action.payload);
        },
        setSearchStatus: (state, action: PayloadAction<State["searchStatus"]>) => {
            state.searchStatus = action.payload;
        },
        setGroupsCreationStatus: (state, action: PayloadAction<State["groupsCreationStatus"]>) => {
            state.groupsCreationStatus = action.payload;
        },
    },
    extraReducers(builder) {
        builder.addCase(resetView, (state) => {
            state.groups = initialState.groups;
        });
        builder.addCase(selectBookmark, (state, action) => {
            const { propertyTree } = action.payload;

            if (!propertyTree) {
                return state;
            }

            state.groups.property = propertyTree.property;
            state.groups.groups = propertyTree.groups.map((group) => ({
                ...group,
                ids: Object.fromEntries(group.ids.map((id) => [id, id])),
                status: group.status as GroupStatus,
            }));
        });
    },
});

const selectExpanded = (state: RootState) => state.propertyTree.expanded;
export const selectPropertyTreeGroups = (state: RootState) => state.propertyTree.groups;
export const selectIsPropertyTreeLoading = (state: RootState) =>
    state.propertyTree.searchStatus === AsyncStatus.Loading ||
    state.propertyTree.groupsCreationStatus === AsyncStatus.Loading;

export const selectPropertyTreeBookmarkState = createSelector(selectPropertyTreeGroups, (groups) => {
    const activeGroups = groups.groups.filter(
        (group) => group.status === GroupStatus.Selected || group.status === GroupStatus.Hidden
    ) as (Omit<PropertyTreeGroup, "status"> & { status: GroupStatus.Selected | GroupStatus.Hidden })[];

    if (!groups.property || !activeGroups.length) {
        return;
    }

    return {
        property: groups.property,
        groups: activeGroups.map((grp) => ({ ...grp, ids: Object.values(grp.ids) })),
    };
});

export const selectIsExpanded = createSelector(
    [selectExpanded, (_state, property: string) => property],
    (expanded, property) => expanded.includes(property)
);

export const selectGroup = createSelector(
    [
        selectPropertyTreeGroups,
        (_state, property: string) => property,
        (_state, _property: string, value: string) => value,
    ],
    (groups, property, value) => {
        return groups.property === property ? groups.groups.find((group) => group.propertyValue === value) : undefined;
    }
);

export const selectGroupsAtProperty = createSelector(
    [selectPropertyTreeGroups, (_state, property: string) => property],
    (groups, property) => {
        if (groups.property !== property) {
            return {
                groups: [],
                count: {
                    total: 0,
                    selected: 0,
                    hidden: 0,
                },
            };
        }

        return {
            groups: groups.groups,
            count: {
                total: groups.groups.length,
                selected: groups.groups.filter((grp) => grp.status === GroupStatus.Selected).length,
                hidden: groups.groups.filter((grp) => grp.status === GroupStatus.Hidden).length,
            },
        };
    }
);

const { actions, reducer } = propertyTreeSlice;
export { reducer as propertyTreeReducer, actions as propertyTreeActions };
