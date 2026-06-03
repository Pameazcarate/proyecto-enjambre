import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { crearEntornoAcuatico } from './escenaBase.js';
import { PezAgente } from './PezAgente.js';

let scene, camera, renderer, controls;
let cardumen = [];
const clock = new THREE.Clock();

// Límites del tanque
const limitesEntorno = { x: 10, y: 5, z: 10 };

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

    // Cargar entorno marino
    crearEntornoAcuatico(scene);

    // Agentes autónomos con una escala base visible
    const totalAgentes = 15; 
    for (let i = 0; i < totalAgentes; i++) {
        const pez = new PezAgente(limitesEntorno);
        scene.add(pez.mesh);
        cardumen.push(pez);
    }

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    cardumen.forEach(pez => pez.update(delta, elapsedTime));

    controls.update(); 
    renderer.render(scene, camera);
}