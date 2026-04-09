import * as THREE from 'three';
import { setDefaultMaterial } from "../libs/util/util.js";

export function criarArvore() {
    // Materiais
    const materialVerde = setDefaultMaterial("green");
    const materialMarrom = setDefaultMaterial("brown");

    // Tronco da árvore
    const cylinderGeometry = new THREE.CylinderGeometry(1.8, 2, 2, 16);
    const tronco = new THREE.Mesh(cylinderGeometry, materialMarrom);

    // Topo da árvore (Folhas)
    const coneGeometry1 = new THREE.ConeGeometry(3, 4, 32);
    const coneGeometry2 = new THREE.ConeGeometry(4, 5, 32);
    const coneGeometry3 = new THREE.ConeGeometry(4.5, 5.5, 32);

    const cone1 = new THREE.Mesh(coneGeometry1, materialVerde);
    const cone2 = new THREE.Mesh(coneGeometry2, materialVerde);
    const cone3 = new THREE.Mesh(coneGeometry3, materialVerde);

    const alturaCilindro = tronco.geometry.parameters.height;
    const alturaCone2 = coneGeometry2.parameters.height;
    const alturaCone3 = coneGeometry3.parameters.height;

    tronco.position.set(0, alturaCilindro / 2, 0);

    const posY3 = alturaCilindro / 2 + alturaCone3 / 2;
    cone3.position.set(0, posY3, 0);

    const posY2 = posY3 + alturaCone3 / 2;
    cone2.position.set(0, posY2, 0);

    const posY1 = posY2 + alturaCone2 / 2;
    cone1.position.set(0, posY1, 0);

    // Adicionando folhas no tronco
    tronco.add(cone1);
    tronco.add(cone2);
    tronco.add(cone3);

    return tronco;
}

export function criarAviao() {
    // Materiais
    const materialAzul = setDefaultMaterial("rgb(23,62,125)");
    const materialAmarelo = setDefaultMaterial("rgb(194,140,39)")

    // Corpo
    // Usando CylinderGeometry com bases distintas
    const geometriaCilindro = new THREE.CylinderGeometry(2, 1, 13);
    const corpo = new THREE.Mesh(geometriaCilindro, materialAzul);
    corpo.rotation.x = Math.PI / 2;

    // Asa frontal
    // Usando SphereGeometry achatado
    const geometriaEsfera = new THREE.SphereGeometry();
    const asa = new THREE.Mesh(geometriaEsfera, materialAzul);
    asa.scale.set(10, 0.5, 1.5);
    asa.rotation.x = -Math.PI / 2;
    corpo.add(asa);

    // Asa traseira
    // Usando SphereGeometry achatada, igual à asa principal
    const geometriaCaudaHoriz = new THREE.SphereGeometry();
    const caudaHorizontal = new THREE.Mesh(geometriaCaudaHoriz, materialAmarelo);
    caudaHorizontal.scale.set(3.5, 0.4, 1);
    caudaHorizontal.position.set(0, -5.5, 0);
    caudaHorizontal.rotation.x = -Math.PI / 2;
    corpo.add(caudaHorizontal);

    // Cauda (Leme)
    // Usando BoxGeometry para fazer uma barbatana direcional
    const geometriaCaudaVert = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const caudaVertical = new THREE.Mesh(geometriaCaudaVert, materialAmarelo);
    caudaVertical.scale.set(0.3, 2, 1.9);
    caudaVertical.position.set(0, -5.5, -1);
    caudaVertical.rotation.x = -Math.PI / 8;
    corpo.add(caudaVertical);

    // Cabine
    // Uma meia-esfera alongada em cima do corpo.
    const geometriaCabine = new THREE.SphereGeometry(0.8);
    const cabine = new THREE.Mesh(geometriaCabine, materialAmarelo);
    cabine.scale.set(1.2, 1.2, 2.5);
    cabine.position.set(0, 0, -1.5);
    cabine.rotation.x = -Math.PI / 2;
    corpo.add(cabine);

    // Hélice
    // Usando BoxGeometry na parte frontal do avião
    const geometriaHelice = new THREE.BoxGeometry(1, 1, 1);
    const helice = new THREE.Mesh(geometriaHelice, materialAmarelo);
    helice.scale.set(5, 0.4, 0.1);
    helice.position.set(0, 6.6, 0);
    helice.rotation.x = -Math.PI / 2;
    corpo.add(helice);

    // Miolo da Hélice
    // Usando SphereGeometry no centro da hélice
    const geometriaMiolo = new THREE.SphereGeometry();
    const miolo = new THREE.Mesh(geometriaMiolo, materialAzul);
    miolo.scale.set(0.6, 0.6, 0.6);
    miolo.position.set(0, 6.7, 0);
    miolo.rotation.x = -Math.PI / 2;
    corpo.add(miolo);

    // Arco
    // Usando TorusGeometry para dar sensação de movimento na hélice
    const geometriaArco = new THREE.TorusGeometry(1.85, 0.14);
    const arco = new THREE.Mesh(geometriaArco, materialAmarelo);
    arco.scale.set(1.3, 1.3, 0.01);
    arco.position.set(0, 6.6, 0);
    arco.rotation.x = -Math.PI / 2;
    corpo.add(arco);

    return corpo;
}
