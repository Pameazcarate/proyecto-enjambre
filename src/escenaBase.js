import * as THREE from 'three';

export class EscenaBase {
    // Código de la escena base
}

export function crearEntornoAcuatico(scene) {
    // Color de fondo azul
    scene.background = new THREE.Color(0x011a3a);
    scene.fog = new THREE.FogExp2(0x011a3a, 0.02); // Neblina

    // 1. Iluminación ambiental
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x012411, 1.0); 
    scene.add(hemiLight);

    // 2. Luz direccional principal con sombras
    const dirLight = new THREE.DirectionalLight(0x00ffff, 1.5); // Turquesa
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 3. Luz de apoyo frontal)
    const luzFrontal = new THREE.DirectionalLight(0xffffff, 1.0);
    luzFrontal.position.set(0, 0, 15);
    scene.add(luzFrontal);

    // Elemento visual de límites del acuario
    const limitesGeo = new THREE.BoxGeometry(20, 10, 20);
    const limitesMat = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        wireframe: true,
        transparent: true,
        opacity: 0.3
    });
    const contenedor = new THREE.Mesh(limitesGeo, limitesMat);
    scene.add(contenedor);
}