import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import {
    InfoBox,
    initRenderer,
    initCamera,
    initDefaultBasicLight,
    onWindowResize,
    createGroundPlaneXZ
} from "../libs/util/util.js";

import { criarArvore, criarAviao } from "./util.js";

let scene, renderer, camera, light, orbit; // Initial variables
scene = new THREE.Scene();    // Create main scene
renderer = initRenderer();    // Init a basic renderer
light = initDefaultBasicLight(scene); // Create a basic light to illuminate the scene
camera = initCamera(new THREE.Vector3(0, 15, 30)); // Init camera in this position
orbit = new OrbitControls(camera, renderer.domElement); // Enable mouse rotation, pan, zoom etc.

// Listen window size changes
window.addEventListener('resize', function () {
    onWindowResize(camera, renderer)
}, false);

// Fog (Névoa)
const baseColor = "rgb(175, 200, 220)"; // It's important the fog color is the same as the background
scene.fog = new THREE.Fog(baseColor, 1, 100);
renderer.setClearColor(baseColor);


const ground = createGroundPlaneXZ(150, 150);
const eixo = new THREE.AxesHelper(12);
const aviao = criarAviao();



aviao.position.set(0, 5, 0);



aviao.add(eixo);

scene.add(camera);
scene.add(ground);
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