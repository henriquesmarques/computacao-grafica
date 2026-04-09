import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import {
    initRenderer,
    initCamera,
    initDefaultBasicLight,
    setDefaultMaterial,
    InfoBox,
    onWindowResize,
    createGroundPlaneXZ
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


const materialAzul = setDefaultMaterial("rgb(23,62,125)");
const materialAmarelo = setDefaultMaterial("rgb(194,140,39)")

// Asa frontal
const geometriaEsfera = new THREE.SphereGeometry();
const asa = new THREE.Mesh(geometriaEsfera, materialAzul);
asa.scale.set(10, 0.5, 1.5);
asa.position.set(0, 0, 0.5);

// Corpo
const geometriaCilindro = new THREE.CylinderGeometry(0.9, 0.5, 1, 32, 1, false, Math.PI/6);
const corpo = new THREE.Mesh(geometriaCilindro, materialAzul);
corpo.scale.set(2.3, 13, 2);
corpo.rotation.y = Math.PI;
corpo.rotation.x = Math.PI / 2;

// Asa traseira
// Usando SphereGeometry achatada, igual à asa principal, mas menor.
const geometriaCaudaHoriz = new THREE.SphereGeometry();
const caudaHorizontal = new THREE.Mesh(geometriaCaudaHoriz, materialAmarelo);
caudaHorizontal.scale.set(3.5, 0.4, 1);
caudaHorizontal.position.set(0, 0, -5.5); // Posicionado na parte de trás do cilindro
scene.add(caudaHorizontal);

// Cauda (Leme)
// Usando BoxGeometry para fazer uma barbatana direcional.
const geometriaCaudaVert = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const caudaVertical = new THREE.Mesh(geometriaCaudaVert, materialAmarelo);
caudaVertical.scale.set(0.3, 2, 1.9);
caudaVertical.position.set(0, 1, -5.5); // Acima da asa traseira
caudaVertical.rotation.x = Math.PI / 8;   // Leve inclinação para trás para dar estilo
scene.add(caudaVertical);

// Cabine
// Uma meia-esfera alongada em cima do corpo.
const geometriaCabine = new THREE.SphereGeometry(0.8);
const cabine = new THREE.Mesh(geometriaCabine, materialAmarelo);
cabine.scale.set(1.2, 1.2, 2.5);
cabine.position.set(0, 1.5, 0.6); // Na parte superior, ligeiramente à frente
scene.add(cabine);

// Hélice
// Uma caixa fina e comprida no "nariz" do avião.
const geometriaHelice = new THREE.BoxGeometry(1, 1, 1);
const helice = new THREE.Mesh(geometriaHelice, materialAmarelo);
helice.scale.set(5, 0.4, 0.1);
helice.position.set(0, 0, 6.6); // Bem na ponta frontal do cilindro
scene.add(helice);

// Miolo da Hélice
// Pequeno cone ou esfera no centro da hélice para dar acabamento.
const geometriaMiolo = new THREE.SphereGeometry();
const miolo = new THREE.Mesh(geometriaMiolo, materialAzul);
miolo.scale.set(0.6, 0.6, 0.6);
miolo.position.set(0, 0, 6.7);
scene.add(miolo);

// Arco
const geometriaArco = new THREE.TorusGeometry(1.85, 0.14);
const arco = new THREE.Mesh(geometriaArco, materialAmarelo);
arco.scale.set(1.3, 1.3, 0.01);
arco.position.set(0, 0, 6.6);


scene.add(corpo);
scene.add(arco);
scene.add(asa);


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