import { identity, translate } from './mat4';

async function renderer(canvasElement: HTMLCanvasElement) {
    // setup

    const gl = canvasElement.getContext('webgl2');

    if (!gl) throw new Error('WebGL2 not supported in this browser');

    // shaders

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);

    if (!vertexShader) throw new Error('Failed to create shader');

    gl.shaderSource(
        vertexShader,
        /* glsl */ `#version 300 es

        #pragma vscode_glsllint_stage: vert


        in vec3 a_position;
        in vec2 a_texCoord;

        uniform vec2 u_resolution;

        out vec2 v_texCoord;

        // all shaders have a main function
        void main() {
            float ratio = u_resolution.x / u_resolution.y;
            gl_Position = vec4(0.2*a_position.x/ratio, 0.2 * a_position.y, a_position.z, 1);
            v_texCoord = a_texCoord;
        }`
    );

    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vertexShader));
        gl.deleteShader(vertexShader);
        throw new Error('Failed to compile vertex shader');
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!fragmentShader) throw new Error('Failed to create fragment shader');

    gl.shaderSource(
        fragmentShader,
        /* glsl */ `#version 300 es

        #pragma vscode_glsllint_stage: frag

        precision highp float;

        uniform sampler2D u_image;

        in vec2 v_texCoord;

        out vec4 outColor;

        void main() {
            outColor = texture(u_image, v_texCoord);
        }`
    );

    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fragmentShader));
        gl.deleteShader(fragmentShader);
        throw new Error('Failed to compile fragment shader');
    }

    // link both shaders into the program

    const program = gl.createProgram();

    if (!program) throw new Error('Failed to create program');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        throw new Error('Failed to link the program');
    }

    // use the program
    gl.useProgram(program);

    // vao

    const verticesArrayObject = gl.createVertexArray();
    gl.bindVertexArray(verticesArrayObject);

    // vertices data

    // prettier-ignore
    // 3--0
    // |  |
    // 2--1
    const verticesPositionData = new Float32Array([
        //   clip space
        //   x,  y,  z,
             1,  1,  0, // 0
             1, -1,  0, // 1
            -1, -1,  0, // 2
            -1,  1,  0, // 3
        ]);

    const verticesAttributeLocation = gl.getAttribLocation(program, 'a_position');

    const verticesPositionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesPositionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, verticesPositionData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(verticesAttributeLocation);

    gl.vertexAttribPointer(verticesAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    // prettier-ignore
    // 3--0
    // |  |
    // 2--1
    const verticesTextureData = new Float32Array([
        // texture
        //  u, v
            1, 0,  // 0
            1, 1,  // 1
            0, 1,  // 2
            0, 0   // 3
    ]);

    const verticesTextureLocation = gl.getAttribLocation(program, 'a_texCoord');

    const verticesTextureBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesTextureBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, verticesTextureData, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(verticesTextureLocation);

    gl.vertexAttribPointer(verticesTextureLocation, 2, gl.FLOAT, false, 0, 0);

    // vertices data indexing

    const indexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // prettier-ignore
    // 3 - - - 0
    // |     / |
    // |   /   |
    // | /     |
    // 2 - - - 1
    const indicesData = new Uint16Array([
        3, 2, 0,
        2,1,0,
    ]);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

    // uniforms - resolution

    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // uniforms - texture

    async function loadImageBitmap(url: string) {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    }

    const url = '/avatar-1x.png';
    const source = await loadImageBitmap(url);

    const imageLocation = gl.getUniformLocation(program, 'u_image');

    const texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0 + 0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.uniform1i(imageLocation, 0);

    // resize

    const canvasToSizeMap = new WeakMap<Element, { width: number; height: number }>();
    const maxTextureDimension = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
        // Get the canvas's current display size
        let { width, height } = canvasToSizeMap.get(canvas) || canvas;

        // Make sure it's valid for WebGPU
        width = Math.max(1, Math.min(width ?? maxTextureDimension, maxTextureDimension));
        height = Math.max(1, Math.min(height ?? maxTextureDimension, maxTextureDimension));

        // Only if the size is different, set the canvas size
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            canvas.width = width;
            canvas.height = height;
        }
        return needResize;
    }

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const contentBoxSize = entry.contentBoxSize[0];

            if (!contentBoxSize) continue;

            canvasToSizeMap.set(entry.target, {
                width: contentBoxSize.inlineSize,
                height: contentBoxSize.blockSize
            });
        }
    });

    observer.observe(canvasElement);

    let lastUpdate = performance.now();

    let needsResize = false;

    const resolutionData = new Float32Array([canvasElement.width, canvasElement.height]);
    const cameraData = identity();

    function update() {
        const now = performance.now();

        needsResize = resizeCanvasToDisplaySize(canvasElement);

        const delta = now - lastUpdate;

        const v = new Float32Array([0.8 * Math.cos(now / 500), 0.8 * Math.sin(now / 500), 0]);

        const m = translate(identity(), new Float32Array(v));

        cameraData.set(m);

        lastUpdate = now;
    }

    // render

    function render() {
        if (!gl) throw new Error('Canvas context lost');

        if (needsResize) {
            resolutionData.set([canvasElement.width, canvasElement.height]);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    function mainLoop() {
        update();
        render();
        requestAnimationFrame(mainLoop);
    }

    return mainLoop;
}

const version = import.meta.env.VITE_APP_VERSION;
console.log(`Using version ${version}`);

const canvasElement = document.querySelector('canvas') ?? document.createElement('canvas');

if (!document.contains(canvasElement)) document.body.append(canvasElement);

renderer(canvasElement)
    .then(requestAnimationFrame)
    .catch(console.error)
    .finally(() => console.log('done', new Date()));
