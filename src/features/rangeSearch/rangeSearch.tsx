import { Box, Button, FormControl, FormControlLabel } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { HierarcicalObjectReference, SearchPattern } from "@novorender/webgl-api";
import { format, isValid, parse } from "date-fns";
import { CSSProperties, FormEvent, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ListOnScrollProps } from "react-window";

import { useAppSelector } from "app/redux-store-interactions";
import { LinearProgress, LogoSpeedDial, ScrollBox, Switch, TextField, WidgetContainer, WidgetHeader } from "components";
import { rangeSearchDateFormat } from "config/app";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { NodeList } from "features/nodeList/nodeList";
import { CustomParentNode } from "features/search";
import WidgetList from "features/widgetList/widgetList";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { iterateAsync } from "utils/search";

enum Status {
    Initial,
    Loading,
    Error,
}

export default function RangeSearch() {
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.rangeSearch.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.rangeSearch.key);

    const [dates, toggleDates] = useToggle();
    const [property, setProperty] = useState("");
    const [min, setMin] = useState("");
    const [max, setMax] = useState("");
    const [allSelected, setAllSelected] = useState(false);
    const [allHidden, setAllHidden] = useState(false);
    const [status, setStatus] = useState(Status.Initial);
    const [searchResults, setSearchResults] = useState<{
        iterator: AsyncIterableIterator<HierarcicalObjectReference> | undefined;
        nodes: HierarcicalObjectReference[];
    }>();

    const [abortController, abort] = useAbortController();
    const listElRef = useRef<HTMLElement | null>(null);
    const previousSearchPattern = useRef<SearchPattern[] | string>();

    const search = useCallback(async (): Promise<HierarcicalObjectReference[] | undefined> => {
        const abortSignal = abortController.current.signal;
        const searchPattern: SearchPattern[] = [{ property, range: { min, max } }];

        previousSearchPattern.current = searchPattern;

        try {
            const iterator = db.search({ searchPattern }, abortSignal);

            const [nodes, done] = await iterateAsync({ iterator, abortSignal, count: 50 });

            setSearchResults({ nodes, iterator: !done ? iterator : undefined });
            return nodes;
        } catch (e) {
            if (!abortSignal.aborted) {
                throw e;
            }
        }
    }, [abortController, setSearchResults, db, property, min, max]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        setStatus(Status.Loading);

        try {
            await search();
            setAllHidden(false);
            setAllSelected(false);
            setStatus(Status.Initial);
        } catch {
            setStatus(Status.Error);
        }
    };

    const handleCancel = () => {
        abort();
        setStatus(Status.Initial);
    };

    const loadMore = async () => {
        if (!searchResults?.iterator || status === Status.Loading) {
            return;
        }

        try {
            setStatus(Status.Loading);
            const [nodesToAdd, done] = await iterateAsync({ iterator: searchResults.iterator, count: 25 });

            setSearchResults((state) => (state ? { ...state, nodes: [...state.nodes, ...nodesToAdd] } : undefined));

            if (done) {
                setSearchResults((state) => (state ? { ...state, iterator: undefined } : undefined));
            }
        } catch {
            // nada
        } finally {
            setStatus(Status.Initial);
        }
    };

    const handleScroll = (event: ListOnScrollProps) => {
        const list = listElRef.current;

        if (!list || event.scrollDirection !== "forward") {
            return;
        }

        const isCloseToBottom = list.scrollHeight - event.scrollOffset - list.clientHeight < list.clientHeight / 5;
        if (isCloseToBottom) {
            loadMore();
        }
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.rangeSearch}
                    disableShadow={menuOpen}
                >
                    {!menuOpen && !minimized ? (
                        <Box component="form" mt={1} onSubmit={handleSubmit}>
                            <TextField
                                sx={{ mb: 2 }}
                                fullWidth
                                autoComplete="novorender-property-name"
                                label="Property name"
                                value={property}
                                onChange={(e) => setProperty(e.target.value)}
                                required
                            />
                            <Box display="flex" sx={{ mb: 2 }}>
                                {dates ? (
                                    <>
                                        <FormControl size="small" sx={{ width: 1, mr: 1 }}>
                                            <DatePicker
                                                label="Min"
                                                value={
                                                    min ? parse(String(min), rangeSearchDateFormat, new Date()) : null
                                                }
                                                onChange={(newDate: Date | null) =>
                                                    setMin(
                                                        newDate && isValid(newDate)
                                                            ? format(newDate, rangeSearchDateFormat)
                                                            : "",
                                                    )
                                                }
                                                format={rangeSearchDateFormat}
                                                slotProps={{
                                                    textField: {
                                                        size: "small",
                                                        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setMin(e.target.value),
                                                    },
                                                }}
                                            />
                                        </FormControl>
                                        <FormControl size="small" sx={{ width: 1 }}>
                                            <DatePicker
                                                label="Max"
                                                value={
                                                    max ? parse(String(max), rangeSearchDateFormat, new Date()) : null
                                                }
                                                onChange={(newDate: Date | null) =>
                                                    setMax(
                                                        newDate && isValid(newDate)
                                                            ? format(newDate, rangeSearchDateFormat)
                                                            : "",
                                                    )
                                                }
                                                format={rangeSearchDateFormat}
                                                slotProps={{
                                                    textField: {
                                                        size: "small",
                                                        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                                                            setMax(e.target.value),
                                                    },
                                                }}
                                            />
                                        </FormControl>
                                    </>
                                ) : (
                                    <>
                                        <TextField
                                            fullWidth
                                            sx={{ mr: 1 }}
                                            value={min}
                                            onChange={(e) => setMin(e.target.value)}
                                            label="Min"
                                        />
                                        <TextField
                                            fullWidth
                                            value={max}
                                            onChange={(e) => setMax(e.target.value)}
                                            label="Max"
                                        />
                                    </>
                                )}
                            </Box>

                            <FormControlLabel
                                sx={{ ml: 0, mr: 3, mb: 2, minHeight: 24 }}
                                control={<Switch checked={dates} onChange={() => toggleDates()} />}
                                label={
                                    <Box ml={0.5} fontSize={14}>
                                        {t("dates")}
                                    </Box>
                                }
                            />

                            <Box display="flex" mb={1}>
                                <Button
                                    color="grey"
                                    type="button"
                                    variant="outlined"
                                    onClick={handleCancel}
                                    disabled={status !== Status.Loading}
                                    fullWidth
                                    sx={{ marginRight: 1 }}
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    type="submit"
                                    fullWidth
                                    disabled={status === Status.Loading}
                                    color="primary"
                                    variant="contained"
                                >
                                    {t("search")}
                                </Button>
                            </Box>
                        </Box>
                    ) : null}
                </WidgetHeader>
                <Box display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" height={1}>
                    {status === Status.Loading ? (
                        <Box position="relative">
                            <LinearProgress />
                        </Box>
                    ) : null}
                    <ScrollBox flex={"1 1 100%"}>
                        {status === Status.Error ? (
                            <Box px={1} pt={1}>
                                {t("searchError")}
                            </Box>
                        ) : searchResults ? (
                            <>
                                <NodeList
                                    CustomParent={({ style }: { style: CSSProperties }) => (
                                        <CustomParentNode
                                            style={style}
                                            abortController={abortController}
                                            searchPatterns={previousSearchPattern.current}
                                            loading={status === Status.Loading}
                                            setLoading={(loading: boolean) =>
                                                setStatus(loading ? Status.Loading : Status.Initial)
                                            }
                                            allSelected={allSelected}
                                            setAllSelected={setAllSelected}
                                            allHidden={allHidden}
                                            setAllHidden={setAllHidden}
                                        />
                                    )}
                                    nodes={searchResults.nodes}
                                    onScroll={handleScroll}
                                    outerRef={listElRef}
                                    loading={status === Status.Loading}
                                    setLoading={(loading: boolean) =>
                                        setStatus(loading ? Status.Loading : Status.Initial)
                                    }
                                    abortController={abortController}
                                />
                            </>
                        ) : null}
                    </ScrollBox>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.rangeSearch.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
