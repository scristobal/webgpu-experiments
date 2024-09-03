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


        layout (location = 0) in vec3 a_position;
        layout (location = 1) in vec2 a_texCoord;

        uniform float u_scaling;
        uniform vec2 u_texSize;
        uniform vec2 u_resolution;
        uniform mat4 u_camera;

        out vec2 v_texCoord;

        void main() {
            vec4 position = u_camera *  vec4(a_position, 1);

            float ratio = u_resolution.y / u_resolution.x;

            gl_Position =vec4( position.xy * u_scaling * u_texSize / u_resolution.xy ,  position.z, 1);
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

    const verticesAttributeLocation = 0;
    gl.bindAttribLocation(program, verticesAttributeLocation, 'a_position');

    const verticesTextureLocation = 1;
    gl.bindAttribLocation(program, verticesTextureLocation, 'a_texCoord');

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
        //   x,  y,  z,
             1,  1,  0, // 0
             1, -1,  0, // 1
            -1, -1,  0, // 2
            -1,  1,  0, // 3
    ]);

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

    gl.uniform2fv(resolutionUniformLocation, resolutionData);

    // uniforms - scaling

    const scalingUniformLocation = gl.getUniformLocation(program, 'u_scaling');

    const scalingData = 4;

    gl.uniform1f(scalingUniformLocation, scalingData);

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

    // uniforms - texture size

    const textureSizeUniformLocation = gl.getUniformLocation(program, 'u_texSize');

    const textureSizeData = new Float32Array([source.height, source.height]);

    gl.uniform2fv(textureSizeUniformLocation, textureSizeData);

    /**
     *
     * Capture keyboard events
     *
     */

    const pressedKeys = {
        up: false,
        down: false,
        left: false,
        right: false,
        turnLeft: false,
        turnRight: false
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
            case 'q':
                pressedKeys.turnLeft = true;
                break;
            case 'e':
                pressedKeys.turnRight = true;
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
            case 'q':
                pressedKeys.turnLeft = false;
                break;
            case 'e':
                pressedKeys.turnRight = false;
                break;
        }
    };

    /**
     *
     * Resize canvas and contents correctly
     *
     */

    const maxTextureDimension = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    const canvasDisplaySize = { width: 0, height: 0 };

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const contentBoxSize = entry.contentBoxSize[0];

            if (!contentBoxSize) continue;

            canvasDisplaySize.width = Math.max(1, Math.min(contentBoxSize.inlineSize, maxTextureDimension));
            canvasDisplaySize.height = Math.max(1, Math.min(contentBoxSize.blockSize, maxTextureDimension));
        }
    });

    observer.observe(canvasElement);

    const resizeCanvasToDisplaySize = () => {
        const needResize =
            canvasElement.width !== canvasDisplaySize.width || canvasElement.height !== canvasDisplaySize.height;

        if (needResize) {
            canvasElement.width = canvasDisplaySize.width;
            canvasElement.height = canvasDisplaySize.height;
        }

        return needResize;
    };

    /**
     *
     * Update loop
     *
     */

    let needsResize = true;

    // sprite initial state
    const center = { x: 0, y: 0 };
    const speed = { x: 0.02, y: 0.02 };

    let angle = 0;
    const rotationSpeed = 0.01;

    let lastUpdate = performance.now();

    function update(now: number) {
        const delta = now - lastUpdate;

        needsResize = resizeCanvasToDisplaySize();

        if (needsResize) {
            resolutionData.set([canvasElement.width, canvasElement.height]);
        }

        const keypress =
            pressedKeys.right ||
            pressedKeys.left ||
            pressedKeys.up ||
            pressedKeys.down ||
            pressedKeys.turnLeft ||
            pressedKeys.turnRight;

        if (keypress) {
            if (pressedKeys.right) center.x += speed.x * delta;
            if (pressedKeys.left) center.x -= speed.x * delta;
            if (pressedKeys.up) center.y += speed.y * delta;
            if (pressedKeys.down) center.y -= speed.y * delta;
            if (pressedKeys.turnRight) angle += rotationSpeed * delta;
            if (pressedKeys.turnLeft) angle -= rotationSpeed * delta;
        }

        if (keypress || needsResize) {
            m4.identity.translate(center.x, center.y, 0).rotate(0, 0, 1, angle);

            cameraData.data.set(m4.data);
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
     * Main loop
     *
     */
    function main(now: number) {
        update(now);
        render();
        requestAnimationFrame(main);
    }

    return main;
}

const version = import.meta.env.VITE_APP_VERSION;
console.log(`Using version ${version}`);

const canvasElement = document.querySelector('canvas') ?? document.createElement('canvas');

if (!document.contains(canvasElement)) document.body.append(canvasElement);

renderer(canvasElement)
    .then(requestAnimationFrame)
    .catch(console.error)
    .finally(() => console.log('done', new Date()));
