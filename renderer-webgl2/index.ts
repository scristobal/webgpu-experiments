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


        in vec4 a_position;

        // all shaders have a main function
        void main() {
            gl_Position = a_position;
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

        out vec4 outColor;

        void main() {
            outColor = vec4(1, 0, 0, 1);
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

    // attributes, vertex data

    const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');

    const vertexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    const vertex = new Float32Array([
        -1, -1,
        0, 1,
        1, -1
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, vertex, gl.STATIC_DRAW);

    const vertexArrayObject = gl.createVertexArray();

    gl.bindVertexArray(vertexArrayObject);

    gl.enableVertexAttribArray(positionAttributeLocation);

    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const indexBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    const indices = new Uint16Array([0, 1, 2]);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);






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
            // set the view port and clean the canvas
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // use the program and draw stuff
        gl.useProgram(program);

        // is it necessary to bind the vertex array again?
        // gl.bindVertexArray(vertexArrayObject);

        // execute the program
        // gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);
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
