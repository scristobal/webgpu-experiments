export function getImageDataUsingOfflineCanvas(bitmap: ImageBitmap) {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);

    const ctx = canvas.getContext('2d');

    ctx?.drawImage(bitmap, 0, 0);

    // bitmaps do not get GC'd
    bitmap.close();

    return ctx?.getImageData(0, 0, canvas.width, canvas.height)!;
}

export function getImageDataUsingWebgl(bitmap: ImageBitmap, gl: WebGL2RenderingContext) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    const texture = gl.createTexture();

    // gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bitmap.width, bitmap.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const data = new Uint8ClampedArray(bitmap.width * bitmap.height * 4);

    gl.readPixels(0, 0, bitmap.width, bitmap.height, gl.RGBA, gl.UNSIGNED_BYTE, data);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return new ImageData(data, bitmap.width, bitmap.height);
}

export async function loadImageBitmap(url: string) {
    const response = await fetch(url);
    const blob = await response.blob();

    return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
}

export async function loadImageData(url: string) {
    const bitmap = await loadImageBitmap(url);

    return getImageDataUsingOfflineCanvas(bitmap);
}
