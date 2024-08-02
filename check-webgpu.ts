/**
 * Quick check for WebGPU capabilities
 */

const isCapable = async () => {
    if (!navigator.gpu) {
        return false;
    }

    const adapter = await navigator.gpu.requestAdapter(),
        context = document.createElement('canvas').getContext('webgpu');

    return adapter && context;
};

isCapable().then((capable) => document.dispatchEvent(new CustomEvent('capable', { detail: capable })));
