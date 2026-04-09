import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import { InfoBox, initRenderer, initCamera, initDefaultBasicLight, onWindowResize, createGroundPlaneXZ } from "../libs/util/util.js";
import Stats from       '../build/jsm/libs/stats.module.js';
import { criarArvore, criarAviao } from "./util.js";

const scene = new THREE.Scene();
const renderer = initRenderer();
initDefaultBasicLight(scene); // Create a basic light to illuminate the scene

// Câmera
const camera = initCamera(new THREE.Vector3(0, 15, 30));
scene.add(camera);

// Enable mouse rotation, pan, zoom etc.
new OrbitControls(camera, renderer.domElement);

// Listen window size changes
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Fog (Névoa)
const baseColor = "rgb(175, 200, 220)"; // a cor do FOG deve ser a mesma do background
scene.fog = new THREE.Fog(baseColor, 1, 100);
renderer.setClearColor(baseColor);

// Status (FPS)
const stats = new Stats();
document.getElementById("webgl-output").appendChild(stats.domElement);

// Plano
const plano = createGroundPlaneXZ(150, 150);
scene.add(plano);



// Avião
const eixo = new THREE.AxesHelper(12);
const aviao = criarAviao();
aviao.position.set(0, 5, 0);

aviao.add(eixo);
scene.add(aviao);




// Use this to show information onscreen
const controls = new InfoBox();
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
    stats.update();
}