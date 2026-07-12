import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { crearEntornoAcuatico } from './escenaBase.js';
import { BoidsSimulator, crearPanelControles } from './boidsSim.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let scene, camera, renderer, controls, stats, boidsEngine;
let instancedCuerpo, instancedOjos, instancedAletas, superficieMar;

// Requisito Final: Mínimo 200 agentes simultáneos
const totalAgentes = 200; 
const limitesEntorno = { x: 10, y: 5, z: 10 };
const clock = new THREE.Clock();

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

    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);
    stats.dom.style.top = '20px';
    stats.dom.style.left = 'auto';
    stats.dom.style.right = '20px';

    boidsEngine = new BoidsSimulator(totalAgentes, limitesEntorno);
    crearPanelControles();

    const matCuerpo = new THREE.MeshPhongMaterial({ color: 0x00ffcc, shininess: 100, specular: 0xffffff });
    const matAletas = new THREE.MeshPhongMaterial({ color: 0xff0055, shininess: 80, side: THREE.DoubleSide });
    const matOjos = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

    const geoCuerpo = new THREE.SphereGeometry(0.5, 16, 16);
    geoCuerpo.scale(0.8, 1.2, 2.5);
    const geoOjo = new THREE.SphereGeometry(0.12, 8, 8);
    const geoAleta = new THREE.ConeGeometry(0.1, 0.8, 4);
    geoAleta.rotateX(Math.PI / 4);

    // Hornear offsets en el buffer para romper la sincronía de la cola en GPU
    const offsets = new Float32Array(totalAgentes);
    for (let i = 0; i < totalAgentes; i++) {
        offsets[i] = boidsEngine.boids[i].timeOffset;
    }
    geoCuerpo.setAttribute('aTimeOffset', new THREE.InstancedBufferAttribute(offsets, 1));
    geoAleta.setAttribute('aTimeOffset', new THREE.InstancedBufferAttribute(offsets, 1));

    // Shader Avanzado Propio (T4) con soporte de desincronización por instancia
    const instanciarShaderWobble = (material, deformaAletas = false) => {
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            material.userData.shader = shader;
            shader.vertexShader = `
                uniform float uTime;
                attribute float aTimeOffset;
            ` + shader.vertexShader;

            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                float freq = ${deformaAletas ? '6.0' : '4.0'};
                float amp = ${deformaAletas ? '0.25' : '0.18'};
                // Uso de aTimeOffset para animaciones independientes
                float deforma = sin(transformed.z * freq - (uTime + aTimeOffset) * 12.0) * amp;
                
                if(transformed.z > -0.2) {
                    transformed.x += deforma * (transformed.z + 0.2);
                }
                `
            );
        };
    };

    instanciarShaderWobble(matCuerpo, false);
    instanciarShaderWobble(matAletas, true);

    instancedCuerpo = new THREE.InstancedMesh(geoCuerpo, matCuerpo, totalAgentes);
    instancedOjos = new THREE.InstancedMesh(geoOjo, matOjos, totalAgentes * 2);
    instancedAletas = new THREE.InstancedMesh(geoAleta, matAletas, totalAgentes);

    instancedCuerpo.castShadow = true;
    instancedAletas.castShadow = true;
    scene.add(instancedCuerpo, instancedOjos, instancedAletas);

    // Superficie marina dinámica
    const geometriaMar = new THREE.PlaneGeometry(30, 30, 64, 64);
    geometriaMar.rotateX(-Math.PI / 2);
    const materialMar = new THREE.MeshPhongMaterial({
        color: 0x005588, shininess: 120, specular: 0x00ffff,
        transparent: true, opacity: 0.5, side: THREE.DoubleSide
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

    window.addEventListener('resize', onWindowResize);
}

function animate() {
    requestAnimationFrame(animate);
    stats.begin();

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    if (instancedCuerpo.material.userData.shader) instancedCuerpo.material.userData.shader.uniforms.uTime.value = elapsedTime;
    if (instancedAletas.material.userData.shader) instancedAletas.material.userData.shader.uniforms.uTime.value = elapsedTime;
    if (superficieMar.material.userData.shader) superficieMar.material.userData.shader.uniforms.uTime.value = elapsedTime;

    boidsEngine.actualizar(delta);

    boidsEngine.boids.forEach((pez, i) => {
        dummyCuerpo.position.copy(pez.posicion);
        
        if (pez.velocidad.lengthSq() > 0.01) {
            const quaternion = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, -1), 
                pez.velocidad.clone().normalize()
            );
            dummyCuerpo.quaternion.copy(quaternion);
        }

        dummyCuerpo.scale.set(pez.escala, pez.escala, pez.escala);
        dummyCuerpo.updateMatrix();
        instancedCuerpo.setMatrixAt(i, dummyCuerpo.matrix);

        // Ojos y Aletas jerárquicas
        dummyParte.position.set(0.35, 0.2, -0.8); dummyParte.updateMatrix();
        dummyParte.matrix.premultiply(dummyCuerpo.matrix);
        instancedOjos.setMatrixAt(i * 2, dummyParte.matrix);

        dummyParte.position.set(-0.35, 0.2, -0.8); dummyParte.updateMatrix();
        dummyParte.matrix.premultiply(dummyCuerpo.matrix);
        instancedOjos.setMatrixAt(i * 2 + 1, dummyParte.matrix);

        dummyParte.position.set(0, 0.8, -0.2); dummyParte.updateMatrix();
        dummyParte.matrix.premultiply(dummyCuerpo.matrix);
        instancedAletas.setMatrixAt(i, dummyParte.matrix);
    });

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