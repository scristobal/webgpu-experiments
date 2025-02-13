#version 300 es

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
}

