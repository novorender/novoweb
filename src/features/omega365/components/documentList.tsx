import { Download, OpenInNew } from "@mui/icons-material";
import { Box, Button, Divider, Table, TableBody, TableCell, TableRow } from "@mui/material";
import { useMemo } from "react";

import {
    Omega365DynamicDocument,
    Omega365View,
    Omega365ViewField,
    Omega365ViewFieldType,
} from "apis/dataV2/omega365Types";
import { Accordion, AccordionDetails, AccordionSummary } from "components";

export default function DocumentList({
    documents,
    view,
}: {
    documents: Omega365DynamicDocument[];
    view: Omega365View;
}) {
    return view.groupBy ? (
        <GroupedDynamicDocumentList documents={documents || []} view={view} />
    ) : (
        <DynamicDocumentList documents={documents || []} view={view} />
    );
}

function DynamicDocumentList({ documents, view }: { documents: Omega365DynamicDocument[]; view: Omega365View }) {
    return (
        <Box p={1}>
            {documents.map((doc, idx) => (
                <DynamicDocument key={idx} fields={view.fields} doc={doc} isLast={idx === documents.length - 1} />
            ))}
        </Box>
    );
}

function GroupedDynamicDocumentList({ documents, view }: { documents: Omega365DynamicDocument[]; view: Omega365View }) {
    const groupedDocs = useMemo(() => {
        let result: { name?: string; items: Omega365DynamicDocument[] }[] = [];
        for (const doc of documents) {
            const groupName = (doc[view.groupBy!] as string) || "";
            let group = result.find((g) => g.name === groupName);
            if (!group) {
                group = { name: groupName, items: [] };
                result.push(group);
            }
            group!.items.push(doc);
        }

        const emptyGroup = result.find((g) => !g.name);
        if (emptyGroup) {
            result = [...result.filter((g) => g !== emptyGroup), { ...emptyGroup, name: "[no title]" }];
        }

        return result;
    }, [documents, view.groupBy]);

    if (!view) {
        return null;
    }

    const fields = view.fields.filter((f) => f.name !== view.groupBy);

    return (
        <>
            {groupedDocs.map(({ name, items: docs }) => (
                <Accordion defaultExpanded={groupedDocs.length === 1} key={name}>
                    <AccordionSummary>{name}</AccordionSummary>
                    <AccordionDetails>
                        <Box p={1}>
                            {docs.map((doc, idx) => (
                                <DynamicDocument key={idx} fields={fields} doc={doc} isLast={idx === docs.length - 1} />
                            ))}
                        </Box>
                    </AccordionDetails>
                </Accordion>
            ))}
        </>
    );
}

function DynamicDocument({
    fields,
    doc,
    isLast,
}: {
    fields: Omega365ViewField[];
    doc: Omega365DynamicDocument;
    isLast?: boolean;
}) {
    const textFields = fields.filter((f) => f.type === Omega365ViewFieldType.Text);
    const linkFields = fields.filter((f) => f.type === Omega365ViewFieldType.Link);
    const fileFields = fields.filter((f) => f.type === Omega365ViewFieldType.File);

    return (
        <>
            <Table size="small">
                <TableBody>
                    {textFields.map((field) => {
                        return (
                            <TableRow key={field.name} sx={{ border: 0 }}>
                                <TableCell sx={{ fontWeight: 600, border: 0, whiteSpace: "nowrap" }}>
                                    {field.title}:
                                </TableCell>
                                <TableCell sx={{ border: 0, fontWeight: "normal" }}>{doc[field.name]}</TableCell>
                            </TableRow>
                        );
                    })}
                    {linkFields.length === 0 && fileFields.length === 0 ? null : (
                        <TableRow>
                            <TableCell colSpan={2} sx={{ border: 0 }}>
                                <Box display="flex" gap={1}>
                                    {linkFields.map((field) => {
                                        return (
                                            <Button
                                                key={field.name}
                                                color="grey"
                                                sx={{ mr: 2 }}
                                                href={doc[field.name] as string}
                                                target="_blank"
                                            >
                                                <OpenInNew sx={{ mr: 1 }} /> {field.title}
                                            </Button>
                                        );
                                    })}
                                    {fileFields.map((field) => {
                                        return (
                                            <Button
                                                key={field.name}
                                                href={doc[field.name] as string}
                                                target="_blank"
                                                download
                                            >
                                                <Download /> {field.title}
                                            </Button>
                                        );
                                    })}
                                </Box>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            {isLast ? null : <Divider sx={{ my: 2, borderColor: "grey.300" }} />}
        </>
    );
}
