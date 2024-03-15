import { Place } from "@mui/icons-material";
import { Box, IconButton, styled } from "@mui/material";
import { ReadonlyVec2, ReadonlyVec3 } from "gl-matrix";
import { forwardRef, MouseEvent, useImperativeHandle, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { CameraType, selectCameraType } from "features/render";
import { AsyncStatus } from "types/misc";

import { formsActions, selectLocationForms, selectSelectedFormId, selectTemplates } from "./slice";

type RenderedForm = {
    id: string;
    symbol: string;
    location: ReadonlyVec3;
};

function areRenderedFormsEqual(a: RenderedForm, b: RenderedForm) {
    return a.id === b.id && a.symbol === b.symbol && a.location === b.location;
}

export const FormsTopDown = forwardRef(function FormsTopDown(_props, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();
    const locationForms = useAppSelector(selectLocationForms);
    const templates = useAppSelector(selectTemplates);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const active = useAppSelector(selectCameraType) === CameraType.Orthographic;
    const dispatch = useAppDispatch();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const prevRenderedForms = useRef<RenderedForm[]>();
    const renderedForms = useMemo(() => {
        if (!active || templates.status !== AsyncStatus.Success) {
            return [];
        }

        const templateMap = new Map(templates.data.map((t) => [t.id, t]));

        const result = locationForms
            .filter(({ form }) => form.location)
            .map(({ templateId, form }) => {
                const template = templateMap.get(templateId)!;
                return { id: form.id!, symbol: template.symbol!, location: form.location! };
            });

        if (areArraysEqual(result, prevRenderedForms.current, areRenderedFormsEqual)) {
            return prevRenderedForms.current!;
        } else {
            prevRenderedForms.current = result;
            return result;
        }
    }, [templates, locationForms, active]);

    useImperativeHandle(
        ref,
        () => ({
            update: () => {
                if (!view?.measure || !containerRef.current) {
                    return;
                }

                const points = view.measure.draw.toMarkerPoints(renderedForms.map((f) => f.location));
                const pointMap = new Map<string, ReadonlyVec2>();
                renderedForms.forEach((form, i) => {
                    const point = points[i];
                    if (point) {
                        pointMap.set(form.id, point);
                    }
                });

                containerRef.current.querySelectorAll("[data-id]").forEach((node) => {
                    const e = node as HTMLDivElement;
                    const id = e.dataset.id as string;
                    const point = pointMap.get(id);
                    if (point) {
                        e.style.left = `${point[0]}px`;
                        e.style.top = `${point[1]}px`;
                    }
                });

                // setToggle();
            },
        }),
        [renderedForms, view?.measure]
    );

    if (!view?.measure || locationForms.length === 0) {
        return null;
    }

    const points = view.measure.draw.toMarkerPoints(renderedForms.map((f) => f.location));

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
        const box = (e.target as HTMLElement).closest("[data-id]") as HTMLDivElement;
        const id = box.dataset.id;
        dispatch(formsActions.setSelectedFormId(id === selectedFormId ? undefined : id));
    };

    return (
        <div ref={containerRef}>
            {renderedForms.map((form, i) => {
                const point = points[i];
                if (!point) {
                    return null;
                }
                const [x, y] = point;

                return (
                    <Box
                        key={form.id}
                        position="absolute"
                        left={x}
                        top={y}
                        sx={{ translate: "-50% -100%" }}
                        data-id={form.id}
                    >
                        <IconButton color={form.id === selectedFormId ? "primary" : "default"} onClick={handleClick}>
                            <Place />
                        </IconButton>
                    </Box>
                );
            })}
        </div>
    );
});
