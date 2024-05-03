/**
 * Quick check for WebGPU capabilities
 */

async function capable() {
    if (!navigator.gpu) return false;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return false;

    const context = document.createElement('canvas').getContext('webgpu');
    if (!context) return false;

    return true;
}

capable().then((capable) => document.dispatchEvent(new CustomEvent('capable', { detail: capable })));
