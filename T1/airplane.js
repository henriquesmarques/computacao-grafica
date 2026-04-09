import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import {
    initRenderer,
    initCamera,
    initDefaultBasicLight,
    setDefaultMaterial,
    InfoBox,
    onWindowResize,
} from "../libs/util/util.js";

let scene, renderer, camera, material, light, orbit; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
scene.add(camera); // Add camera to the scene
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.

// Listen window size changes
window.addEventListener('resize', function () {
    onWindowResize(camera, renderer)
}, false);

// Show axes (parameter is size of each axis)
let axesHelper = new THREE.AxesHelper(12);
scene.add(axesHelper);



const aviao = criarAviao();

// Adicionando avião na cena
scene.add(aviao);




// Use this to show information onscreen
let controls = new InfoBox();
controls.add("Basic Scene");
controls.addParagraph();
controls.add("Use mouse to interact:");
controls.add("* Left button to rotate");
controls.add("* Right button to translate (pan)");
controls.add("* Scroll to zoom in/out.");
controls.show();

render();

function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera) // Render scene
}

function criarAviao() {
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