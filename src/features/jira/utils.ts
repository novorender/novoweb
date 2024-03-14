import { AdfNode } from "./types";

export function createLinkNode(bmId: string): AdfNode {
    return {
        type: "heading",
        attrs: {
            level: 3,
        },
        content: [
            {
                type: "text",
                text: "Novorender link",
                marks: [
                    {
                        type: "link",
                        attrs: {
                            href: `${window.location.origin}${window.location.pathname}?bookmarkId=${bmId}`,
                        },
                    },
                ],
            },
        ],
    };
}

export function getLinkNode(description: AdfNode): AdfNode | undefined {
    return description.content
        ?.find(
            (c) =>
                c?.type === "heading" && c?.content?.find((hc) => hc?.type === "text" && hc?.text === "Novorender link")
        )
        ?.content?.find((hc) => hc?.type === "text" && hc?.text === "Novorender link");
}

export function createIssueSnapshotAttachment(snapshot: string): FormData {
    // https://stackoverflow.com/a/61321728
    function DataURIToBlob(dataURI: string) {
        const splitDataURI = dataURI.split(",");
        const byteString = splitDataURI[0].indexOf("base64") >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1]);
        const mimeString = splitDataURI[0].split(":")[1].split(";")[0];

        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ia], { type: mimeString });
    }

    const formData = new FormData();
    formData.append("file", DataURIToBlob(snapshot), "Novorender model image");
    return formData;
}
