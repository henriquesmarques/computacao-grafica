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
material = setDefaultMaterial(); // create a basic material
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

// create the ground plane
// let plane = createGroundPlaneXZ(20, 20);
// scene.add(plane);

const materialVerde = setDefaultMaterial("green");
const materialMarrom = setDefaultMaterial("brown");

const cylinderGeometry = new THREE.CylinderGeometry(1.8, 2, 2, 16);
const cilindro = new THREE.Mesh(cylinderGeometry, materialMarrom);

const coneGeometry1 = new THREE.ConeGeometry(3, 4, 32);
const coneGeometry2 = new THREE.ConeGeometry(4, 5, 32);
const coneGeometry3 = new THREE.ConeGeometry(4.5, 5.5, 32);

const cone1 = new THREE.Mesh(coneGeometry1, materialVerde);
const cone2 = new THREE.Mesh(coneGeometry2, materialVerde);
const cone3 = new THREE.Mesh(coneGeometry3, materialVerde);

const alturaCilindro = cilindro.geometry.parameters.height;
const alturaCone1 = coneGeometry1.parameters.height;
const alturaCone2 = coneGeometry2.parameters.height;
const alturaCone3 = coneGeometry3.parameters.height;

cilindro.position.set(0, alturaCilindro / 2, 0);

const posY3 = alturaCilindro / 2 + alturaCone3 / 2;
cone3.position.set(0, posY3, 0);

const posY2 = posY3 + alturaCone3 / 2;
cone2.position.set(0, posY2, 0);

const posY1 = posY2 + alturaCone2 / 2;
cone1.position.set(0, posY1, 0);

cilindro.add(cone1);
cilindro.add(cone2);
cilindro.add(cone3);




scene.add(cilindro);

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