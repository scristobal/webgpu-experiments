import { animation } from 'src/systems/animation';
import { inputHandler } from 'src/systems/input';
import { resizeHandler } from 'src/helpers/resize';
import { spriteSheet } from 'src/systems/sprites';
import { loadImageData } from 'src/helpers/image';
import { movement } from 'src/systems/movement';

async function renderer(canvasElement: HTMLCanvasElement) {
    /**
     *
     * WebGL2 setup
     *
     */

    const gl = canvasElement.getContext('webgl2');


    if (!gl) throw 'WebGL2 not supported in this browser';

    /**
     *
     * Shaders creation and compilation
     *
     */

    // shaders - vertex

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);

    if (!vertexShader) throw 'Failed to create shader';

    gl.shaderSource(
        vertexShader,
        /* glsl */ `#version 300 es

        #pragma vscode_glsllint_stage: vert


        layout (location = 0) in vec3 a_coord;
        layout (location = 1) in vec2 a_texCoord;

        uniform float u_scaling;
        uniform vec2 u_resolution;

        uniform vec2 u_modelSize;

        uniform mat4 u_modelTransform;
        uniform mat3 u_texTransform;

        out vec3 v_texCoord;

        void main() {
            vec4 position = u_modelTransform *  vec4(a_coord, 1);

            gl_Position = vec4( (position.xy * u_scaling * u_modelSize) / u_resolution.xy ,  position.z, 1);
            v_texCoord =  u_texTransform * vec3(a_texCoord.xy, 1) ;
        }`
    );

    gl.compileShader(vertexShader);

    // shaders - fragment

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vertexShader));
        gl.deleteShader(vertexShader);
        throw 'Failed to compile vertex shader';
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!fragmentShader) throw 'Failed to create fragment shader';

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
        throw 'Failed to compile fragment shader';
    }

    /**
     *
     * link both shaders into the program and use it
     *
     */

    const program = gl.createProgram();

    if (!program) throw 'Failed to create program';

    // const verticesAttributeLocation = 0;
    // gl.bindAttribLocation(program, verticesAttributeLocation, 'a_coords');

    // const verticesTextureLocation = 1;
    // gl.bindAttribLocation(program, verticesTextureLocation, 'a_texCoord');

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        throw 'Failed to link the program';
    }

    gl.useProgram(program);

    /**
     *
     * Vertex array object (vao)
     *
     */

    const verticesArrayObject = gl.createVertexArray();
    gl.bindVertexArray(verticesArrayObject);

    // vertices data - position coordinates

    const verticesPositionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesPositionBuffer);

    const verticesAttributeLocation = gl.getAttribLocation(program, 'a_coord');

    gl.enableVertexAttribArray(verticesAttributeLocation);

    gl.vertexAttribPointer(verticesAttributeLocation, 3, gl.FLOAT, false, 0, 0);

    // vertices data - texture coordinates

    const verticesTextureBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, verticesTextureBuffer);

    const verticesTextureLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(verticesTextureLocation);

    gl.vertexAttribPointer(verticesTextureLocation, 2, gl.FLOAT, false, 0, 0);

    // vertices data indexing

    const indicesBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    // enable culling of back facing (clock wise) triangles
    gl.enable(gl.CULL_FACE);

    // enable depth buffer
    gl.enable(gl.DEPTH_TEST);

    /**
     *
     * Uniforms
     *
     */

    // uniforms - resolution

    const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');

    // uniforms - scaling

    const scalingUniformLocation = gl.getUniformLocation(program, 'u_scaling');

    // uniforms - xyz vertex position transform

    const positionTransformUniformLocation = gl.getUniformLocation(program, 'u_modelTransform');

    // uniforms - texture

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const texture = gl.createTexture();

    gl.activeTexture(gl.TEXTURE0);

    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    const imageLocation = gl.getUniformLocation(program, 'u_texture');

    // uniforms - texture size

    const spriteSizeUniformLocation = gl.getUniformLocation(program, 'u_modelSize');

    // uniform - uv texture transform

    const texTransformUniformLocation = gl.getUniformLocation(program, 'u_texTransform');

    /**
     *
     * Load data
     *
     */

    async function load() {
        if (!gl) throw 'WebGL2 context lost';

        // load canvas scale value
        const scalingData = 4;
        gl.uniform1f(scalingUniformLocation, scalingData);

        // load model, vertices and texture coordinates and indexing
        gl.bindVertexArray(verticesArrayObject);

        // vertices coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesPositionBuffer);
        // prettier-ignore
        const verticesPositionData = new Float32Array([
        // 3--0
        // |  |
        // 2--1
        //   x,  y,  z,
             1,  1,  0, // 0
             1, -1,  0, // 1
            -1, -1,  0, // 2
            -1,  1,  0, // 3
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, verticesPositionData, gl.STATIC_DRAW);

        // texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, verticesTextureBuffer);
        // prettier-ignore
        const verticesTextureData = new Float32Array([
        // 3--0
        // |  |
        // 2--1
        //  u, v
            1, 0,  // 0
            1, 1,  // 1
            0, 1,  // 2
            0, 0   // 3
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, verticesTextureData, gl.STATIC_DRAW);

        // vertex indices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
        // prettier-ignore
        const indicesData = new Uint16Array([
        // 3 - - - 0
        // |     / |
        // |   /   |
        // | /     |
        // 2 - - - 1
            3, 2, 0,
            2, 1, 0,
        ]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

        // texture
        gl.activeTexture(gl.TEXTURE0);
        const imgData = await loadImageData('/sprite-sheet.png');
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imgData.width, imgData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData);
        gl.uniform1i(imageLocation, 0);
    }

    /**
     *
     * Update loop
     *
     */

    const resize = resizeHandler(gl.getParameter(gl.MAX_TEXTURE_SIZE), canvasElement);

    const spriteSystem = spriteSheet({
        get imgSize(): [number, number] {
            return [34, 34 * Object.keys(this.sprites).length];
        },
        sprites: {
            'look-right': { location: [0, 0], size: [34, 34] },
            'look-left': { location: [0, 34], size: [34, 34] },
            'open-mouth': { location: [0, 68], size: [34, 34] },
            'closed-eyes': { location: [0, 102], size: [34, 34] },
            'shoulders-down': { location: [0, 136], size: [34, 34] },
            'stretch-up': { location: [0, 170], size: [34, 34] },
            'stretch-down': { location: [0, 204], size: [34, 34] }
        }
    });

    const animationSystem = animation({
        'idle-0': { duration: 500, sprite: 'look-right', next: 'idle-1' },
        'idle-1': { duration: 500, sprite: 'look-left', next: 'idle-2' },
        'idle-2': { duration: 500, sprite: 'open-mouth', next: 'idle-3' },
        'idle-3': { duration: 500, sprite: 'closed-eyes', next: 'idle-4' },
        'idle-4': { duration: 500, sprite: 'stretch-up', next: 'idle-5' },
        'idle-5': { duration: 500, sprite: 'stretch-down', next: 'idle-6' },
        'idle-6': { duration: 500, sprite: 'look-right', next: 'idle-0' }
    });

    animationSystem.current = 'idle-0';
    spriteSystem.sprite = animationSystem.sprite;

    const movementSystem = movement();

    let lastUpdate = performance.now();

    const pressedKeys = inputHandler;

    function update(now: number) {
        const delta = now - lastUpdate;

        if (inputHandler.keypress) {
            if (pressedKeys.right) movementSystem.moveRight(delta);
            if (pressedKeys.left) movementSystem.moveLeft(delta);
            if (pressedKeys.up) movementSystem.moveUp(delta);
            if (pressedKeys.down) movementSystem.moveDown(delta);
            if (pressedKeys.turnRight) movementSystem.rotateClockWise(delta);
            if (pressedKeys.turnLeft) movementSystem.rotateCounterClockWise(delta);
        }

        spriteSystem.sprite = animationSystem.update(delta).sprite;
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
        if (!gl) throw 'Canvas context lost';

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        if (resize.needsResize) {
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.uniform2fv(resolutionUniformLocation, resize.resolution);
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.uniformMatrix3fv(texTransformUniformLocation, false, spriteSystem.transform);

        gl.uniform2fv(spriteSizeUniformLocation, spriteSystem.size);

        gl.uniformMatrix4fv(positionTransformUniformLocation, false, movementSystem.transform);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /**
     *
     * Game loop
     *
     */

    const frameTimes = new Float32Array(1024);
    let frameTimesInd = 0;

    function gameLoop(now: number) {
        update(now);
        render();
        requestAnimationFrame(gameLoop);

        frameTimes[++frameTimesInd] = performance.now() - now;

        if (frameTimesInd === frameTimes.length) {
            const average = frameTimes.reduce((acc, cur) => acc + cur, 0) / frameTimes.length;
            console.log(`Last ${frameTimes.length.toFixed(0)} frames draw average time was ${average.toFixed(3)}ms (roughly equivalent to ${(1000 / average).toFixed(3)} frames per second)`);
            frameTimesInd = 0;
        }

        lastUpdate = performance.now();
    }

    return async function () {
        await load();
        gameLoop(performance.now());
    };
}

export { renderer };
