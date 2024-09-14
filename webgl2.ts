import { inputHandler } from './input';
import { m4 } from './matrix';
import { resizeHandler } from './resize';
import { spriteSheet } from './sprites';
import { loadImageData } from './utils';

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


        layout (location = 0) in vec3 a_coords;
        layout (location = 1) in vec2 a_texCoord;

        uniform float u_scaling;
        uniform vec2 u_resolution;

        uniform vec2 u_modelSize;

        uniform mat4 u_modelTransform;
        uniform mat3 u_texTransform;

        out vec3 v_texCoord;

        void main() {
            vec4 position = u_modelTransform *  vec4(a_coords, 1);

            gl_Position = vec4( (position.xy * u_scaling * u_modelSize) / u_resolution.xy ,  position.z, 1);
            v_texCoord =  u_texTransform * vec3(a_texCoord.xy, 1) ;
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

        #ifndef GL_FRAGMENT_PRECISION_HIGH
            precision mediump float;
        #else
            precision highp float;
        #endif

        uniform sampler2D u_texture;

        in vec3 v_texCoord;

        out vec4 outColor;

        void main() {
            outColor = texture(u_texture, v_texCoord.xy);
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
    gl.bindAttribLocation(program, verticesAttributeLocation, 'a_coords');

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

    // uniforms - scaling

    const scalingUniformLocation = gl.getUniformLocation(program, 'u_scaling');

    const scalingData = 4;

    gl.uniform1f(scalingUniformLocation, scalingData);

    // uniforms - xyz vertex position transform

    const positionTransformUniformLocation = gl.getUniformLocation(program, 'u_modelTransform');

    // uniforms - texture

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const imgData = await loadImageData('/sprite-sheet.png');

    const texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imgData.width, imgData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData);

    const imageLocation = gl.getUniformLocation(program, 'u_texture');

    gl.uniform1i(imageLocation, 0);

    // uniforms - texture size

    const spriteSizeUniformLocation = gl.getUniformLocation(program, 'u_modelSize');

    // uniform - uv texture transform

    const texTransformUniformLocation = gl.getUniformLocation(program, 'u_texTransform');

    // required to handle canvas resizing

    const maxTexDimension = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    /**
     *
     * Update loop
     *
     */

    const resize = resizeHandler(maxTexDimension, canvasElement);

    const sprites = spriteSheet({
        imgSize: [imgData.width, imgData.height],
        animations: [
            {
                name: 'idle',
                frames: [
                    { location: [0, 0], size: [34, 34] },
                    { location: [0, 34], size: [34, 34] },
                    { location: [0, 68], size: [34, 34] },
                    { location: [0, 102], size: [34, 34] },
                    { location: [0, 136], size: [34, 34] },
                    { location: [0, 170], size: [34, 34] },
                    { location: [0, 204], size: [34, 34] }
                ]
            }
        ]
    });

    sprites.animation = 'idle';

    const positionTransformData = m4().identity;

    // sprite initial state TODO: parametrize
    const center = { x: 0, y: 0, z: 0 };
    const speed = { x: 0.02, y: 0.02, z: 0 };

    let angle = 0;
    const rotationSpeed = 0.01;

    let lastUpdate = performance.now();

    const pressedKeys = inputHandler;

    function update(now: number) {
        const delta = now - lastUpdate;

        if (inputHandler.keypress) {
            if (pressedKeys.right) center.x += speed.x * delta;
            if (pressedKeys.left) center.x -= speed.x * delta;
            if (pressedKeys.up) center.y += speed.y * delta;
            if (pressedKeys.down) center.y -= speed.y * delta;
            if (pressedKeys.turnRight) angle += rotationSpeed * delta;
            if (pressedKeys.turnLeft) angle -= rotationSpeed * delta;

            positionTransformData.identity.translate(center.x, center.y, center.z).rotate(0, 0, 1, angle);
        }

        sprites.update(delta);
    }

    // const fb = gl.createFramebuffer();
    // gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    // const fbTexture = gl.createTexture();
    // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fbTexture, 0);

    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvasElement.width, canvasElement.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    /**
     *
     * Render loop
     *
     */
    function render() {
        if (!gl) throw new Error('Canvas context lost');

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (resize.needsResize) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.uniform2fv(resolutionUniformLocation, resize.resolution);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix3fv(texTransformUniformLocation, false, sprites.transform);

        gl.uniform2fv(spriteSizeUniformLocation, sprites.size);

        gl.uniformMatrix4fv(positionTransformUniformLocation, false, positionTransformData.data);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /**
     *
     * Main loop
     *
     */

    const frameTimes = new Float32Array(1024);
    let frameTimesInd = 0;

    function main(now: number) {
        update(now);
        render();
        requestAnimationFrame(main);

        frameTimes[++frameTimesInd] = performance.now() - now;

        if (frameTimesInd === frameTimes.length) {
            const average = frameTimes.reduce((acc, cur) => acc + cur, 0) / frameTimes.length;
            console.log(`Last ${frameTimes.length.toFixed(0)} frames draw average time was ${average.toFixed(3)}ms (roughly equivalent to ${(1000 / average).toFixed(3)} frames per second)`);
            frameTimesInd = 0;
        }

        lastUpdate = performance.now();
    }

    return main;
}

export { renderer };
