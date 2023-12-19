import { Fragment } from "react";

export function FormattedText({ str }: { str: string }) {
    return str
        .replace(/^[\\n]+/, "")
        .split("\n")
        .flatMap((text, idx, arr) =>
            arr.length === 1 && !text ? [] : [<Fragment key={idx}>{text}</Fragment>, <br key={idx} />]
        );
}
