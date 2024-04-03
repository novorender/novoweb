import { Box, css, IconButton, IconButtonProps, styled } from "@mui/material";
import { ReadonlyVec2, ReadonlyVec3 } from "gl-matrix";
import { forwardRef, MouseEvent, useImperativeHandle, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areArraysEqual } from "features/arcgis/utils";
import { CameraType, selectCameraType } from "features/render";
import { selectWidgets } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import { useFetchAssetList } from "./hooks/useFetchAssetList";
import { AssetIcon } from "./routes/create/assetIcon";
import {
    formsActions,
    selectCurrentFormsList,
    selectLocationForms,
    selectSelectedFormId,
    selectTemplates,
} from "./slice";
import { FormState, LocationTemplate } from "./types";

type RenderedForm = {
    templateId: string;
    id: string;
    marker: string;
    location: ReadonlyVec3;
    state: FormState;
};

function areRenderedFormsEqual(a: RenderedForm, b: RenderedForm) {
    return (
        a.templateId === b.templateId &&
        a.id === b.id &&
        a.marker === b.marker &&
        a.location === b.location &&
        a.state === b.state
    );
}

export const FormsTopDown = forwardRef(function FormsTopDown(_props, ref) {
    const {
        state: { view },
    } = useExplorerGlobals();
    const locationForms = useAppSelector(selectLocationForms);
    const templates = useAppSelector(selectTemplates);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const selectedTemplateId = useAppSelector(selectCurrentFormsList);
    const isFormsWidgetAdded = useAppSelector((state) => selectWidgets(state).includes("forms"));
    const active = useAppSelector(selectCameraType) === CameraType.Orthographic && isFormsWidgetAdded;
    const dispatch = useAppDispatch();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const assetList = useFetchAssetList();

    const iconMap = useMemo(() => {
        if (assetList.status !== AsyncStatus.Success) {
            return;
        }

        return new Map(assetList.data.map((a) => [a.name, a.icon]));
    }, [assetList]);

    const prevRenderedForms = useRef<RenderedForm[]>();
    const renderedForms = useMemo(() => {
        if (!active || templates.status !== AsyncStatus.Success || !iconMap) {
            return [];
        }

        const templateMap = new Map(templates.data.map((t) => [t.id, t]));

        const result = locationForms
            .filter((form) => form.location)
            .map((form) => {
                const template = templateMap.get(form.templateId)! as LocationTemplate;
                return {
                    templateId: template.id,
                    id: form.id,
                    marker: iconMap.get(template.marker)!,
                    location: form.location!,
                    state: form.state,
                } as RenderedForm;
            });

        if (areArraysEqual(result, prevRenderedForms.current, areRenderedFormsEqual)) {
            return prevRenderedForms.current!;
        } else {
            prevRenderedForms.current = result;
            return result;
        }
    }, [templates, locationForms, active, iconMap]);

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
                        pointMap.set(`${form.templateId}+${form.id}`, point);
                    }
                });

                containerRef.current.querySelectorAll("[data-id]").forEach((node) => {
                    const e = node as HTMLDivElement;
                    const id = e.dataset.id as string;
                    const templateId = e.dataset.templateId as string;
                    const point = pointMap.get(`${templateId}+${id}`);
                    if (point) {
                        e.style.left = `${point[0]}px`;
                        e.style.top = `${point[1]}px`;
                    }
                });
            },
        }),
        [renderedForms, view?.measure]
    );

    if (!view?.measure || locationForms.length === 0) {
        return null;
    }

    const points = view.measure.draw.toMarkerPoints(renderedForms.map((f) => f.location));

    const handleClick = (e: MouseEvent<HTMLElement>) => {
        const box = (e.target as HTMLElement).closest("[data-id]") as HTMLDivElement;
        const id = box.dataset.id;
        const templateId = box.dataset.templateId!;
        if (templateId === selectedTemplateId && id === selectedFormId) {
            dispatch(formsActions.setSelectedFormId(undefined));
        } else {
            dispatch(formsActions.setCurrentFormsList(templateId));
            dispatch(formsActions.setSelectedFormId(id));
        }
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
                        key={`${form.templateId}+${form.id}`}
                        position="absolute"
                        left={x}
                        top={y}
                        sx={{ translate: "-50% -100%" }}
                        data-id={form.id}
                        data-template-id={form.templateId}
                    >
                        <FormButton
                            active={form.templateId === selectedTemplateId && form.id === selectedFormId}
                            onClick={handleClick}
                        >
                            <AssetIcon icon={form.marker} />
                            <StateDot state={form.state} />
                        </FormButton>
                    </Box>
                );
            })}
        </div>
    );
});

const stateColors = new Map<FormState, string>();
stateColors.set("new", "red");
stateColors.set("ongoing", "orange");
stateColors.set("finished", "green");

const FormButton = styled(IconButton, { shouldForwardProp: (prop) => prop !== "active" })<
    IconButtonProps & { active?: boolean }
>(
    ({ active, theme }) => css`
        &,
        svg {
            color: ${theme.palette.common.white};
        }

        background-color: ${active ? theme.palette.primary.main : theme.palette.secondary.main};

        &:hover {
            background-color: ${active ? theme.palette.primary.dark : theme.palette.secondary.dark};
        }
    `
);

const StateDot = styled("div")<{ state: FormState }>(
    ({ state }) => css`
        position: absolute;
        top: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-radius: 12px;
        border: 2px solid white;
        background: ${stateColors.get(state)};
    `
);
