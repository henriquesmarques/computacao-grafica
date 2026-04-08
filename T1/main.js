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
let plane = createGroundPlaneXZ(20, 20);
scene.add(plane);




const height = 3;

const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
let cube = new THREE.Mesh(cubeGeometry, material);
cube.scale.set(11, 0.3, 6);
cube.position.set(0.0, height - cube.scale.y / 2, 0.0);

const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);

const offsetLocalX = 0.45;
const offsetLocalZ = 0.45;
const localY = -1.5 * height - cube.scale.y;
const corners = [
    [-1, -1],
    [ 1, -1],
    [-1,  1],
    [ 1,  1]
];

corners.forEach(corner => {
    let cylinder = new THREE.Mesh(cylinderGeometry, material);

    cylinder.scale.set(1/11, 1/0.3, 1/6);

    cylinder.position.set(offsetLocalX * corner[0], localY, offsetLocalZ * corner[1]);

    cube.add(cylinder);
});





// add the cube to the scene
scene.add(cube);

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