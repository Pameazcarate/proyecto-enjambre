import * as THREE from 'three';

export class PezAgente {
    constructor(limites) {
        this.limites = limites;
        this.mesh = new THREE.Group();

        // Movimiento básico autónomo (Requisito 4)
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 3
        ).normalize().multiplyScalar(2.0 + Math.random() * 2.0);

        this.timeOffset = Math.random() * Math.PI * 2;

        this.buildPezGrande();
        this.establecerTransformacionInicial();
    }

    buildPezGrande() {
        // Materiales brillantes de alta visibilidad para primer requisito.
        const matCuerpo = new THREE.MeshPhongMaterial({ 
            color: 0x00ffcc, // Turquesa neón de alto contraste
            shininess: 100,
            specular: 0xffffff
        });
        const matAletas = new THREE.MeshPhongMaterial({ 
            color: 0xff0055, // Magenta
            shininess: 80,
            side: THREE.DoubleSide
        });
        const matOjos = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 100 });

        //Cuerpo para pez
        const cuerpoGeo = new THREE.SphereGeometry(0.5, 16, 16);
        this.cuerpoMesh = new THREE.Mesh(cuerpoGeo, matCuerpo);
        this.cuerpoMesh.scale.set(0.8, 1.2, 2.5); 
        this.cuerpoMesh.castShadow = true;
        this.mesh.add(this.cuerpoMesh);

        // Ojos
        const ojoGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const ojoIzq = new THREE.Mesh(ojoGeo, matOjos);
        ojoIzq.position.set(0.35, 0.2, -0.8);
        this.mesh.add(ojoIzq);

        const ojoDer = new THREE.Mesh(ojoGeo, matOjos);
        ojoDer.position.set(-0.35, 0.2, -0.8);
        this.mesh.add(ojoDer);

        // Aleta superior
        const aletaDorsalGeo = new THREE.ConeGeometry(0.1, 0.8, 4);
        aletaDorsalGeo.rotateX(Math.PI / 4);
        const aletaDorsal = new THREE.Mesh(aletaDorsalGeo, matAletas);
        aletaDorsal.position.set(0, 0.8, -0.2);
        this.mesh.add(aletaDorsal);

        //Articulación de la cola
        this.colaArticulacion = new THREE.Group();
        this.colaArticulacion.position.set(0, 0, 1.1); 
        this.mesh.add(this.colaArticulacion);

        // Aleta trasera grande
        const aletaCaudalGeo = new THREE.ConeGeometry(0.6, 1.0, 3);
        aletaCaudalGeo.rotateX(Math.PI / 2);
        
        aletaCaudalGeo.scale(0.1, 1, 1); 
        
        const aletaCaudalMesh = new THREE.Mesh(aletaCaudalGeo, matAletas);
        aletaCaudalMesh.position.set(0, 0, 0.5);
        aletaCaudalMesh.castShadow = true;
        this.colaArticulacion.add(aletaCaudalMesh);
    }

    establecerTransformacionInicial() {
        // Para el tercer requisito, donde se nos pide que la Posición y orientación inicial sean totalmente distintas en el espacio
        this.mesh.position.set(
            (Math.random() - 0.5) * (this.limites.x * 1.5),
            (Math.random() - 0.5) * (this.limites.y * 1.5),
            (Math.random() - 0.5) * (this.limites.z * 1.5)
        );
        const anguloInicial = Math.atan2(-this.velocity.z, this.velocity.x);
        this.mesh.rotation.y = anguloInicial;
    }

    update(delta, time) {
        // Avanzar en la dirección local de avance de forma autónoma, que se nos pide en el requisito 4
        this.mesh.position.addScaledVector(this.velocity, delta);

        // Rotación orientada hacia el frente dinámico
        const targetAngle = Math.atan2(-this.velocity.z, this.velocity.x);
        this.mesh.rotation.y = targetAngle;

        // Movimiento armónico de oscilación de la aleta trasera,
        const velocidadNado = 10.0;
        const amplitudNado = 0.55;
        this.colaArticulacion.rotation.y = Math.sin(time * velocidadNado + this.timeOffset) * amplitudNado;

        // Mecánica wue hace que  rebota o reaparece al salir de los límites de la escena.
        const hX = this.limites.x; const hY = this.limites.y; const hZ = this.limites.z;

        if (Math.abs(this.mesh.position.x) > hX) {
            this.velocity.x *= -1;
            this.mesh.position.x = Math.sign(this.mesh.position.x) * hX;
        }
        if (Math.abs(this.mesh.position.y) > hY) {
            this.velocity.y *= -1;
            this.mesh.position.y = Math.sign(this.mesh.position.y) * hY;
        }
        if (Math.abs(this.mesh.position.z) > hZ) {
            this.velocity.z *= -1;
            this.mesh.position.z = Math.sign(this.mesh.position.z) * hZ;
        }
    }
}