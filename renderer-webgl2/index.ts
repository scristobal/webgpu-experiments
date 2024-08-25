import { m4 } from './mat4';

async function renderer(canvasElement: HTMLCanvasElement) {
    /**
     *
     * WebGL2 setup
     *
     */

    const gl = canvasElement.getContext('webgl2');

    if (!gl) throw new Error('WebGL2 not supported in this browser');

    /**
     *
     * Shaders creation and compilation
     *
     */

    // shaders - vertex

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);

    if (!vertexShader) throw new Error('Failed to create shader');

    gl.shaderSource(
        vertexShader,
        /* glsl */ `#version 300 es

        #pragma vscode_glsllint_stage: vert


        in vec3 a_position;
        in vec2 a_texCoord;

        uniform vec2 u_resolution;
        uniform mat4 u_camera;

        out vec2 v_texCoord;

        void main() {
            float ratio = u_resolution.x / u_resolution.y;

            gl_Position = u_camera * vec4( a_position.xyz, 1);
            v_texCoord = a_texCoord;
        }`
    );

    gl.compileShader(vertexShader);

    // shaders - fragment

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

    /**
     *
     * link both shaders into the program and use it
     *
     */

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

    gl.useProgram(program);

    /**
     *
     * Setup the vertex array object (vao)
     *
     */

    const verticesArrayObject = gl.createVertexArray();
    gl.bindVertexArray(verticesArrayObject);

    /**
     *
     * Load vertices data into the program (shaders)
     *
     */

    // vertices data - position coordinates

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

    // vertices data - texture coordinates

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
        2, 1, 0,
    ]);

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

    // enable culling of back facing (clock wise) triangles
    gl.enable(gl.CULL_FACE);

    // enable depth buffer
    gl.enable(gl.DEPTH_TEST);

    /**
     *
     * Load uniforms into the program
     *
     */

    // uniforms - resolution

    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

    const resolutionData = new Float32Array([canvasElement.width, canvasElement.height]);

    gl.uniform1fv(resolutionUniformLocation, resolutionData);

    // uniforms - camera transformation matrix

    const cameraUniformLocation = gl.getUniformLocation(program, 'u_camera');

    const cameraData = m4.identity;

    gl.uniformMatrix4fv(cameraUniformLocation, false, cameraData.data);

    // uniforms - texture

    const imageLocation = gl.getUniformLocation(program, 'u_image');

    const texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0 + 0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    async function loadImageBitmap(url: string) {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    }

    const source = await loadImageBitmap('/avatar-1x.png');

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.uniform1i(imageLocation, 0);

    /**
     *
     * Capture keyboard events
     *
     */

    const pressedKeys = {
        up: false,
        down: false,
        left: false,
        right: false
    };

    window.onkeydown = (e) => {
        switch (e.key) {
            case 'w':
            case 'ArrowUp':
                pressedKeys.up = true;
                break;
            case 'a':
            case 'ArrowLeft':
                pressedKeys.left = true;
                break;
            case 's':
            case 'ArrowDown':
                pressedKeys.down = true;
                break;
            case 'd':
            case 'ArrowRight':
                pressedKeys.right = true;
                break;
        }
    };

    window.onkeyup = (e) => {
        switch (e.key) {
            case 'w':
            case 'ArrowUp':
                pressedKeys.up = false;
                break;
            case 'a':
            case 'ArrowLeft':
                pressedKeys.left = false;
                break;
            case 's':
            case 'ArrowDown':
                pressedKeys.down = false;
                break;
            case 'd':
            case 'ArrowRight':
                pressedKeys.right = false;
                break;
        }
    };

    /**
     *
     * Resize canvas and contents correctly
     *
     */

    const maxTextureDimension = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const resizeCanvasToDisplaySize = ((maxTextureDimension: number) => {
        const canvasToSizeMap = new WeakMap<Element, { width: number; height: number }>();

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

        return (canvas: HTMLCanvasElement) => {
            let { width, height } = canvasToSizeMap.get(canvas) || canvas;

            width = Math.max(1, Math.min(width, maxTextureDimension));
            height = Math.max(1, Math.min(height, maxTextureDimension));

            const needResize = canvas.width !== width || canvas.height !== height;

            if (needResize) {
                canvas.width = width;
                canvas.height = height;
            }

            return needResize;
        };
    })(maxTextureDimension);

    /**
     *
     * Update loop
     *
     */

    let lastUpdate = performance.now();

    let needsResize = false;

    const center = { x: 0, y: 0 };
    const speed = { x: 0.002, y: 0.002 };

    const size = 0.2;
    const ratio = resolutionData[0] / resolutionData[1];

    let v = new Float32Array(new Float32Array([center.x, center.y, 0]));
    let s = new Float32Array([size / ratio, size, 1]);

    function update(now: number) {
        const delta = now - lastUpdate;

        needsResize = resizeCanvasToDisplaySize(canvasElement);

        if (needsResize) {
            resolutionData.set([canvasElement.width, canvasElement.height]);
            const ratio = resolutionData[0] / resolutionData[1];
            s = new Float32Array([size / ratio, size, 1]);
        }

        const keypress = pressedKeys.right || pressedKeys.left || pressedKeys.up || pressedKeys.down;

        if (keypress) {
            if (pressedKeys.right && center.x < 1) center.x += speed.x * delta;
            if (pressedKeys.left && center.x > -1) center.x -= speed.x * delta;
            if (pressedKeys.up && center.y < 1) center.y += speed.y * delta;
            if (pressedKeys.down && center.y > -1) center.y -= speed.y * delta;

            v = new Float32Array(new Float32Array([center.x, center.y, 0]));
        }

        if (keypress || needsResize) {
            const m = m4.identity.translate(v).scale(s);
            cameraData.data.set(m.data);
        }

        lastUpdate = now;
    }

    /**
     *
     * Render loop
     *
     */
    function render() {
        if (!gl) throw new Error('Canvas context lost');

        if (needsResize) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.uniform2fv(resolutionUniformLocation, resolutionData);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix4fv(cameraUniformLocation, false, cameraData.data);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /**
     *
     * Main loop (main function return as Promise)
     *
     */
    function mainLoop(now: number) {
        update(now);
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
