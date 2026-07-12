import * as THREE from 'three';
import { GUI } from 'lil-gui';

// --- COMPONENTES REQUERIDOS: PARÁMETROS AJUSTABLES EN TIEMPO REAL ---
export const boidsParams = {
    radioPercepcion: 2.8,
    radioSeparacion: 0.9,
    wSeparacion: 1.8,
    wAlineacion: 1.2,
    wCohesion: 1.0,
    velMax: 5.0,
    fuerzaMax: 0.15,
    usarSpatialHashing: true
};

// --- RENDER EFICIENTE: GRID UNIFORME PARA REDUCIR COMPLEJIDAD A O(N) ---
class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    clear() { this.grid.clear(); }

    _hash(position) {
        const x = Math.floor(position.x / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    insert(boid) {
        const key = this._hash(boid.posicion);
        if (!this.grid.has(key)) this.grid.set(key, []);
        this.grid.get(key).push(boid);
    }

    getNeighbors(boid) {
        const neighbors = [];
        const baseX = Math.floor(boid.posicion.x / this.cellSize);
        const baseY = Math.floor(boid.posicion.y / this.cellSize);
        const baseZ = Math.floor(boid.posicion.z / this.cellSize);

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const key = `${baseX + x},${baseY + y},${baseZ + z}`;
                    const cell = this.grid.get(key);
                    if (cell) neighbors.push(...cell);
                }
            }
        }
        return neighbors;
    }
}

export class BoidsSimulator {
    constructor(totalAgentes, limites) {
        this.totalAgentes = totalAgentes;
        this.limites = limites;
        this.boids = [];
        this.grid = new SpatialHashGrid(boidsParams.radioPercepcion);
        this.inicializarAgentes();
    }

    inicializarAgentes() {
        for (let i = 0; i < this.totalAgentes; i++) {
            this.boids.push({
                posicion: new THREE.Vector3(
                    (Math.random() - 0.5) * (this.limites.x * 1.5),
                    (Math.random() - 0.5) * (this.limites.y * 1.5),
                    (Math.random() - 0.5) * (this.limites.z * 1.5)
                ),
                velocidad: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 2
                ).normalize().multiplyScalar(boidsParams.velMax * 0.6),
                aceleracion: new THREE.Vector3(0, 0, 0),
                escala: 0.6 + Math.random() * 0.4,
                timeOffset: Math.random() * 100.0 // Desfase para animación independiente en GPU
            });
        }
    }

    actualizar(delta) {
        if (boidsParams.usarSpatialHashing) {
            this.grid.cellSize = boidsParams.radioPercepcion;
            this.grid.clear();
            this.boids.forEach(boid => this.grid.insert(boid));
        }

        this.boids.forEach(boid => {
            const vecinos = boidsParams.usarSpatialHashing ? this.grid.getNeighbors(boid) : this.boids;
            this.aplicarFuerzasReynolds(boid, vecinos);

            boid.velocidad.addScaledVector(boid.aceleracion, delta);
            boid.velocidad.clampLength(0, boidsParams.velMax);
            boid.posicion.addScaledVector(boid.velocidad, delta);
            boid.aceleracion.set(0, 0, 0);

            // Rebotar en fronteras virtuales
            const hX = this.limites.x, hY = this.limites.y, hZ = this.limites.z;
            if (Math.abs(boid.posicion.x) > hX) { boid.velocidad.x *= -1; boid.posicion.x = Math.sign(boid.posicion.x) * hX; }
            if (Math.abs(boid.posicion.y) > hY) { boid.velocidad.y *= -1; boid.posicion.y = Math.sign(boid.posicion.y) * hY; }
            if (Math.abs(boid.posicion.z) > hZ) { boid.velocidad.z *= -1; boid.posicion.z = Math.sign(boid.posicion.z) * hZ; }
        });
    }

    aplicarFuerzasReynolds(boid, vecinos) {
        let nSeparacion = 0, nAlineacion = 0, nCohesion = 0;
        const fSeparacion = new THREE.Vector3(), fAlineacion = new THREE.Vector3(), fCohesion = new THREE.Vector3();

        vecinos.forEach(otro => {
            if (boid === otro) return;
            const distancia = boid.posicion.distanceTo(otro.posicion);

            if (distancia > 0 && distancia < boidsParams.radioSeparacion) {
                const diff = new THREE.Vector3().subVectors(boid.posicion, otro.posicion);
                diff.normalize().divideScalar(distancia);
                fSeparacion.add(diff);
                nSeparacion++;
            }

            if (distancia > 0 && distancia < boidsParams.radioPercepcion) {
                fAlineacion.add(otro.velocidad);
                nAlineacion++;
                fCohesion.add(otro.posicion);
                nCohesion++;
            }
        });

        if (nSeparacion > 0) {
            fSeparacion.divideScalar(nSeparacion).normalize().multiplyScalar(boidsParams.velMax).sub(boid.velocidad);
            fSeparacion.clampLength(0, boidsParams.fuerzaMax);
            boid.aceleracion.addScaledVector(fSeparacion, boidsParams.wSeparacion);
        }
        if (nAlineacion > 0) {
            fAlineacion.divideScalar(nAlineacion).normalize().multiplyScalar(boidsParams.velMax).sub(boid.velocidad);
            fAlineacion.clampLength(0, boidsParams.fuerzaMax);
            boid.aceleracion.addScaledVector(fAlineacion, boidsParams.wAlineacion);
        }
        if (nCohesion > 0) {
            fCohesion.divideScalar(nCohesion).sub(boid.posicion).normalize().multiplyScalar(boidsParams.velMax).sub(boid.velocidad);
            fCohesion.clampLength(0, boidsParams.fuerzaMax);
            boid.aceleracion.addScaledVector(fCohesion, boidsParams.wCohesion);
        }
    }
}

export function crearPanelControles() {
    const gui = new GUI({ title: 'Configuración Flocking' });
    gui.domElement.style.top = '140px';
    gui.domElement.style.left = '20px';
    gui.domElement.style.right = 'auto';

    const fRadios = gui.addFolder('Radios Percepción');
    fRadios.add(boidsParams, 'radioPercepcion', 0.5, 6.0, 0.1).name('Radio Visión');
    fRadios.add(boidsParams, 'radioSeparacion', 0.1, 3.0, 0.1).name('Radio Separación');

    const fPesos = gui.addFolder('Pesos Reglas');
    fPesos.add(boidsParams, 'wSeparacion', 0.0, 4.0, 0.1).name('w_sep (Separación)');
    fPesos.add(boidsParams, 'wAlineacion', 0.0, 4.0, 0.1).name('w_ali (Alineación)');
    fPesos.add(boidsParams, 'wCohesion', 0.0, 4.0, 0.1).name('w_coh (Cohesión)');

    const fCinetica = gui.addFolder('Cinemática');
    fCinetica.add(boidsParams, 'velMax', 1.0, 12.0, 0.5).name('Velocidad Máx.');
    fCinetica.add(boidsParams, 'fuerzaMax', 0.01, 0.6, 0.01).name('Fuerza Máx.');
    fCinetica.add(boidsParams, 'usarSpatialHashing').name('Spatial Hashing');
}