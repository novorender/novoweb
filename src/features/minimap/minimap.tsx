import { styled } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { downloadMinimap, downloadPdfPreview, getElevation, MinimapHelper, PDFPreview } from "utils/minimap";
import { mat2, quat, quat2, ReadonlyVec2, ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { SceneData } from "@novorender/data-js-api";
import { dataApi } from "app";
import { useMeasureObjects } from "features/measure";
import { PixOutlined } from "@mui/icons-material";

const Canvas = styled("canvas")`
    background-color: rgba(255, 255, 255, 0.8);
    position: absolute;
    top: 0;
    left: 0;
`;

export function Minimap() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const {
        state: { size, scene, view },
    } = useExplorerGlobals(true);

    let width = size.width / 2;
    let height = size.height;
    const [pdfPreview, setPdfPreview] = useState<PDFPreview | undefined>(undefined);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);

    const measureObjects = useMeasureObjects();

    let pdfPosA: vec2 | undefined = undefined;
    let pdfPosB: vec2 | undefined = undefined;
    let imgHeight = useRef<number>(0);
    let imgWidth = useRef<number>(0);
    let selectingA = true;

    useEffect(() => {
        const loadPdfScene = async () => {
            const pdfScene = (await dataApi.loadScene("40d1cd32c6bd42daab915b4a948f29c4")) as SceneData;
            //setPdfScene(pdfScene);
            const preview = await downloadPdfPreview(pdfScene);
            setPdfPreview(preview);
            setCtx(canvas?.getContext("2d"));
        };
        loadPdfScene();
    }, [canvas]);

    useEffect(() => {
        setCtx(canvas?.getContext("2d"));
    }, [scene, canvas]);

    useEffect(() => {
        if (pdfPreview && ctx) {
            const img = new Image();
            img.onload = function () {
                if (ctx && pdfPreview) {
                    //ctx.drawImage(img, 450, 200, img.width * 0.7, img.height * 0.7, 0, 0, width, height);
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
                    imgHeight.current = img.height;
                    imgWidth.current = img.width;
                }
                //minimap.pixelHeight = height; //Set canvas height in minimap helper
                //minimap.pixelWidth = width; //Set canvas width in minimap helper
            };

            img.src = pdfPreview.image;
        }
    }, [canvas, width, height, ctx, pdfPreview]);

    useEffect(() => {
        if (pdfPreview && ctx) {
            const img = new Image();
            img.onload = function () {
                if (ctx && pdfPreview) {
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
                }
            };

            img.src = pdfPreview.image;
        }
    }, [canvas, width, height, ctx, pdfPreview]);

    useEffect(() => {
        if (pdfPosA && pdfPosB && measureObjects) {
            const modelPos: vec2[] = [];
            measureObjects.forEach((mobj) => {
                if (mobj.drawKind === "vertex") {
                    modelPos.push(vec2.fromValues(mobj.parameter[0], mobj.parameter[2]));
                }
                if (modelPos.length === 2) {
                    //calulations
                }
            });
        }
    }, [pdfPosA, pdfPosB, measureObjects]);

    const clickPdf = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (canvas && pdfPreview && ctx) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            // view.camera.controller.moveTo(
            //     minimap.toWorld(vec2.fromValues(x * (1 / 0.7) + 300, y * (1 / 0.7) + 200)),
            //     view.camera.rotation
            // );
            if (selectingA) {
                pdfPosA = vec2.fromValues(x, y);
            } else {
                pdfPosB = vec2.fromValues(x, y);
            }
            selectingA = !selectingA;
            if (pdfPreview && ctx) {
                const img = new Image();
                img.onload = function () {
                    if (ctx && pdfPreview) {
                        //Redraw the image for te minimap
                        ctx.clearRect(0, 0, width, height);

                        //ctx.drawImage(img, 450, 200, img.width * 0.7, img.height * 0.7, 0, 0, width, height);
                        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
                        imgHeight.current = img.height;
                        imgWidth.current = img.width;
                        if (pdfPosA) {
                            ctx.fillStyle = "green";
                            ctx.beginPath();
                            ctx.ellipse(pdfPosA[0], pdfPosA[1], 5, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        if (pdfPosB) {
                            ctx.fillStyle = "blue";
                            ctx.beginPath();
                            ctx.ellipse(pdfPosB[0], pdfPosB[1], 5, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                };
                img.src = pdfPreview.image;
            }
            if (pdfPosA && pdfPosB && measureObjects) {
                const modelPos: vec2[] = [];
                measureObjects.forEach((mobj) => {
                    if (mobj.drawKind === "vertex") {
                        modelPos.push(vec2.fromValues(mobj.parameter[0], mobj.parameter[2] * -1));
                    }
                });
                if (modelPos.length === 2) {
                    const pixelPosA = vec2.fromValues(pdfPosA[0], imgHeight.current - pdfPosA[1]);
                    const pixelPosB = vec2.fromValues(pdfPosB[0], imgHeight.current - pdfPosB[1]);
                    const pixelLength = vec2.dist(pixelPosA, pixelPosB);
                    const modelLength = vec2.dist(modelPos[0], modelPos[1]);
                    const modelDir = vec2.sub(vec2.create(), modelPos[1], modelPos[0]);
                    vec2.normalize(modelDir, modelDir);
                    const pixDir = vec2.sub(vec2.create(), pixelPosB, pixelPosA);
                    vec2.normalize(pixDir, pixDir);
                    const scale = modelLength / pixelLength;
                    const angleAroundZRad = Math.acos(vec2.dot(modelDir, pixDir)) * -1;
                    const angleAroundZ = (angleAroundZRad / Math.PI) * 180;

                    const pdfScale = imgHeight.current * scale;
                    const zeroWorld = vec2.sub(
                        vec2.create(),
                        modelPos[0],
                        vec2.fromValues(
                            pixelPosA[0] * scale * Math.cos(angleAroundZRad),
                            pixelPosA[1] * scale * Math.sin(angleAroundZRad)
                        )
                    );

                    const q = quat.fromValues(0.70710677, 0, 0, 0.70710677);
                    quat.rotateZ(q, q, angleAroundZRad);
                    const posB = vec3.fromValues(pixelPosB[0] * scale, 0, pixelPosB[1] * scale);
                    vec3.transformQuat(posB, posB, q);
                    vec3.add(posB, posB, vec3.fromValues(zeroWorld[0], 0, zeroWorld[1]));

                    console.log("angleAroundZ");
                    console.log(angleAroundZ);
                    console.log("pdfScale");
                    console.log(pdfScale);
                    console.log("zeroWorld");
                    console.log(zeroWorld);
                    //calulations
                }
            }
        }
    };

    //return <Canvas ref={setCanvas} width={width} height={height} />;
    return <Canvas id="pdfcanvas" ref={setCanvas} width={width} height={height} onClick={(e) => clickPdf(e)} />;
}
