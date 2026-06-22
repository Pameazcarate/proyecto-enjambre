import * as THREE from 'three/webgpu';

export function obtenerMaterialPezTSL() {
    const material = new THREE.NodeMaterial();
    
    const inputs = {
        colorCuerpo: new THREE.Color(0x00ffcc), // Turquesa neón
        amplitud: 0.12,
        frecuencia: 6.0
    };

    // REQUISITO 2 (T4): Deformación de vértices pura mediante nodos estables
    material.vertexNode = new THREE.FunctionNode(() => {
        const posLocal = THREE.positionLocal;
        const normLocal = THREE.normalLocal;
        
        // Operación matemática nativa: sin(x * freq + time * 5.0) * amp
        const factorTiempo = THREE.time.mul(5.0);
        const factorPosicion = posLocal.x.mul(inputs.frecuencia);
        const desfasamiento = THREE.sin(factorPosicion.add(factorTiempo)).mul(inputs.amplitud);
        
        return posLocal.add(normLocal.mul(desfasamiento));
    });

    // Fragment Shader: Sombreado Lambert difuso básico para WebGL2
    material.fragmentNode = new THREE.FunctionNode(() => {
        const N = THREE.normalLocal.normalize();
        const direccionLuz = THREE.vec3(0.5, 0.7, 1.0).normalize();
        const iluminacionLambert = N.dot(direccionLuz).max(0.2);
        
        return THREE.uniform(inputs.colorCuerpo).mul(iluminacionLambert);
    });

    return material;
}