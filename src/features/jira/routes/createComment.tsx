import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { FormEvent, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { Divider, LinearProgress, ScrollBox, TextField } from "components";

import { useCreateCommentMutation } from "../jiraApi";
import { AdfNode } from "../types";

export function CreateComment() {
    const theme = useTheme();
    const history = useHistory();

    const issueKey = useParams<{ key: string }>().key;
    const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();

    const [comment, setComment] = useState("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        await createComment({
            issueKey,
            body: {
                body: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: comment
                                .split("\n")
                                .map((node: string, idx: number, arr: unknown[]): AdfNode[] => {
                                    let res: AdfNode[] = node
                                        ? [
                                              {
                                                  type: "text",
                                                  text: node,
                                              },
                                          ]
                                        : [];

                                    if (idx !== arr.length - 1) {
                                        res = res.concat({
                                            type: "hardBreak",
                                        });
                                    }

                                    return res;
                                })
                                .flat(),
                        },
                    ],
                },
            },
        });

        history.goBack();
    };

    const loading = creatingComment;

    return (
        <>
            <Box px={1}>
                <Divider />
            </Box>
            <Box display="flex" alignItems="center" boxShadow={theme.customShadows.widgetHeader}>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>

            {loading && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}

            <ScrollBox py={1} height={1}>
                <Box sx={{ px: 1, my: 1 }}>
                    <form onSubmit={handleSubmit}>
                        <TextField
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            sx={{ mt: 1, mb: 2 }}
                            id={"jira-comment"}
                            label={"Add comment"}
                            fullWidth
                            multiline
                            rows={4}
                        />

                        <Box display="flex" justifyContent="space-between" mb={2}>
                            <Button
                                variant="outlined"
                                color="grey"
                                type="button"
                                fullWidth
                                disabled={loading}
                                onClick={() => history.goBack()}
                            >
                                Cancel
                            </Button>
                            <Button
                                sx={{ ml: 2 }}
                                fullWidth
                                variant="contained"
                                type="submit"
                                disabled={loading || !comment}
                            >
                                Add comment
                            </Button>
                        </Box>
                    </form>
                </Box>
            </ScrollBox>
        </>
    );
}
