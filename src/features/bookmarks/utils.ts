export async function createBookmarkImg(canvas: HTMLCanvasElement): Promise<string> {
    const width = canvas.width;
    const height = canvas.height;
    let dx = 0;
    let dy = 0;

    if (height / width < 0.7) {
        dx = width - Math.round((height * 10) / 7);
    } else {
        dy = height - Math.round(width * 0.7);
    }

    const dist = document.createElement("canvas");
    dist.height = 70;
    dist.width = 100;
    const ctx = dist.getContext("2d", { alpha: true, desynchronized: false })!;

    ctx.drawImage(
        canvas,
        Math.round(dx / 2),
        Math.round(dy / 2),
        width - dx,
        height - dy,
        0,
        0,
        dist.width,
        dist.height
    );

    return dist.toDataURL("image/jpeg");
}
