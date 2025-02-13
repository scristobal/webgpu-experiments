#version 300 es

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
}

