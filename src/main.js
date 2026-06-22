import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { crearEntornoAcuatico } from './escenaBase.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let scene, camera, renderer, controls, stats;
let instancedCuerpo, instancedOjos, instancedAletas, superficieMar;
let cardumenLogico = [];

const totalAgentes = 100; 
const limitesEntorno = { x: 10, y: 5, z: 10 };
const clock = new THREE.Clock();

// Dummies para calcular transformaciones espaciales en GPU
const dummyCuerpo = new THREE.Object3D();
const dummyParte = new THREE.Object3D();

init();
animate();

function init() {
    scene = new THREE.Scene();
    const canvasElement = document.getElementById('canvas3d');

    renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 25);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    crearEntornoAcuatico(scene);

    // --- Monitor de FPS ---
    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    stats.dom.style.top = '20px';
    stats.dom.style.left = 'auto';
    stats.dom.style.right = '20px';

    // --- MATERIALES ORIGINALES (ENTREGA 1) ---
    const matCuerpo = new THREE.MeshPhongMaterial({ color: 0x00ffcc, shininess: 100, specular: 0xffffff });
    const matAletas = new THREE.MeshPhongMaterial({ color: 0xff0055, shininess: 80, side: THREE.DoubleSide });
    const matOjos = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

    // --- GEOMETRÍAS ORIGINALES (ENTREGA 1) ---
    // Cuerpo
    const geoCuerpo = new THREE.SphereGeometry(0.5, 16, 16);
    geoCuerpo.scale(0.8, 1.2, 2.5); // Escala original de su clase PezAgente

    // Ojos
    const geoOjo = new THREE.SphereGeometry(0.12, 8, 8);

    // Aleta dorsal (Cono)
    const geoAleta = new THREE.ConeGeometry(0.1, 0.8, 4);
    geoAleta.rotateX(Math.PI / 4);

    // --- INYECCIÓN DE SHADER VERTEX WOBBLE EN LOS MATERIALES ---
    const instanciarShaderWobble = (material, deformaAletas = false) => {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            material.userData.shader = shader;
            shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                // Mayor frecuencia en aletas para nado dinámico
                float freq = ${deformaAletas ? '6.0' : '4.0'};
                float amp = ${deformaAletas ? '0.25' : '0.18'};
                float deforma = sin(transformed.z * freq - uTime * 12.0) * amp;
                
                if(transformed.z > -0.2) {
                    transformed.x += deforma * (transformed.z + 0.2);
                }
                `
            );
        };
    };

    instanciarShaderWobble(matCuerpo, false);
    instanciarShaderWobble(matAletas, true); // Las aletas ondulan con un poco más de intensidad

    // --- INICIALIZACIÓN DE INSTANCED MESHES ---
    instancedCuerpo = new THREE.InstancedMesh(geoCuerpo, matCuerpo, totalAgentes);
    instancedOjos = new THREE.InstancedMesh(geoOjo, matOjos, totalAgentes * 2); // 2 ojos por pez
    instancedAletas = new THREE.InstancedMesh(geoAleta, matAletas, totalAgentes); // 1 aleta dorsal instanciada

    instancedCuerpo.castShadow = true;
    instancedAletas.castShadow = true;

    scene.add(instancedCuerpo);
    scene.add(instancedOjos);
    scene.add(instancedAletas);

    // --- SIMULACIÓN DE AGUA (SUPERFICIE MARINA) ---
    const geometriaMar = new THREE.PlaneGeometry(30, 30, 64, 64);
    geometriaMar.rotateX(-Math.PI / 2);

    const materialMar = new THREE.MeshPhongMaterial({
        color: 0x005588,
        shininess: 120,
        specular: 0x00ffff,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    materialMar.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 };
        materialMar.userData.shader = shader;
        shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            float ola1 = sin(transformed.x * 0.6 + uTime * 2.0) * 0.20;
            float ola2 = cos(transformed.z * 0.5 + uTime * 1.5) * 0.15;
            transformed.y += ola1 + ola2;
            `
        );
    };

    superficieMar = new THREE.Mesh(geometriaMar, materialMar);
    superficieMar.position.y = limitesEntorno.y; 
    scene.add(superficieMar);

    // --- CREACIÓN DEL CARDUMEN LÓGICO ---
    for (let i = 0; i < totalAgentes; i++) {
        cardumenLogico.push({
            posicion: new THREE.Vector3(
                (Math.random() - 0.5) * (limitesEntorno.x * 1.5),
                (Math.random() - 0.5) * (limitesEntorno.y * 1.5),
                (Math.random() - 0.5) * (limitesEntorno.z * 1.5)
            ),
            velocidad: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 3
            ).normalize().multiplyScalar(2.0 + Math.random() * 2.0),
            escala: 0.7 + Math.random() * 0.4
        });
    }

    window.addEventListener('resize', onWindowResize);
}

function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Sincronizar el tiempo global en los Shaders inyectados
    if (instancedCuerpo.material.userData.shader) instancedCuerpo.material.userData.shader.uniforms.uTime.value = elapsedTime;
    if (instancedAletas.material.userData.shader) instancedAletas.material.userData.shader.uniforms.uTime.value = elapsedTime;
    if (superficieMar.material.userData.shader) superficieMar.material.userData.shader.uniforms.uTime.value = elapsedTime;

    cardumenLogico.forEach((pez, i) => {
        // Movimiento autónomo y colisión perimetral
        pez.posicion.addScaledVector(pez.velocidad, delta);

        const hX = limitesEntorno.x, hY = limitesEntorno.y, hZ = limitesEntorno.z;
        if (Math.abs(pez.posicion.x) > hX) { pez.velocidad.x *= -1; pez.posicion.x = Math.sign(pez.posicion.x) * hX; }
        if (Math.abs(pez.posicion.y) > hY) { pez.velocidad.y *= -1; pez.posicion.y = Math.sign(pez.posicion.y) * hY; }
        if (Math.abs(pez.posicion.z) > hZ) { pez.velocidad.z *= -1; pez.posicion.z = Math.sign(pez.posicion.z) * hZ; }

        // 1. Posicionar Cuerpo Principal
        dummyCuerpo.position.copy(pez.posicion);
        const anguloOrientacion = Math.atan2(-pez.velocidad.z, pez.velocidad.x);
        dummyCuerpo.rotation.set(0, anguloOrientacion, 0);
        dummyCuerpo.scale.set(pez.escala, pez.escala, pez.escala);
        dummyCuerpo.updateMatrix();
        instancedCuerpo.setMatrixAt(i, dummyCuerpo.matrix);

        // 2. Posicionar Ojo Izquierdo (Mismos offsets relativos del primer avance)
        dummyParte.position.set(0.35, 0.2, -0.8);
        dummyParte.rotation.set(0, 0, 0);
        dummyParte.scale.set(1, 1, 1);
        dummyParte.updateMatrix();
        // Multiplicar por la matriz del cuerpo para heredar traslación y rotación global
        dummyParte.matrix.premultiply(dummyCuerpo.matrix);
        instancedOjos.setMatrixAt(i * 2, dummyParte.matrix);

        // 3. Posicionar Ojo Derecho
        dummyParte.position.set(-0.35, 0.2, -0.8);
        dummyParte.updateMatrix();
        dummyParte.matrix.premultiply(dummyCuerpo.matrix);
        instancedOjos.setMatrixAt(i * 2 + 1, dummyParte.matrix);

        // 4. Posicionar Aleta Dorsal Superior
        dummyParte.position.set(0, 0.8, -0.2);
        dummyParte.updateMatrix();
        dummyParte.matrix.premultiply(dummyCuerpo.matrix);
        instancedAletas.setMatrixAt(i, dummyParte.matrix);
    });

    // Notificar actualizaciones de buffers a la GPU
    instancedCuerpo.instanceMatrix.needsUpdate = true;
    instancedOjos.instanceMatrix.needsUpdate = true;
    instancedAletas.instanceMatrix.needsUpdate = true;

    controls.update(); 
    renderer.render(scene, camera);
    stats.end();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}