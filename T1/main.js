import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import { initRenderer, initCamera, initDefaultBasicLight, onWindowResize, createGroundPlaneXZ } from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import { criarArvore, criarAviao } from "./util.js";

// Variáveis globais
const scene = new THREE.Scene();
const renderer = initRenderer();
let animationOn = true; // Controla se a animação está ativa
let valorFOG = 100;

// Create a basic light to illuminate the scene
initDefaultBasicLight(scene);

// Câmera
const camera = initCamera(new THREE.Vector3(0, 40, -40));
scene.add(camera);

// Enable mouse rotation, pan, zoom etc.
new OrbitControls(camera, renderer.domElement);

// Percebe mudanças no tamanho da janela
window.addEventListener('resize', function () { onWindowResize(camera, renderer) }, false);

// Fog (Névoa)
const baseColor = "rgb(175, 200, 220)"; // a cor do FOG deve ser a mesma do background
scene.fog = new THREE.Fog(baseColor, 1, valorFOG);
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
aviao.position.set(0, 20, -20);
aviao.add(eixo);
scene.add(aviao);

// Árvores
const arvore = criarArvore();
scene.add(arvore);
arvore.position.set(10, arvore.geometry.parameters.height/2, 8);



buildInterface();
render();

function buildInterface() {
    // Controles
    const controls = new function ()
    {
        this.onChangeAnimation = function(){
            animationOn = !animationOn;
        };
        this.fog = valorFOG;

        this.changeFOG = function(){
            valorFOG = this.fog;
            scene.fog.far = this.fog;
        };
    };

    // Interface
    const gui = new GUI();
    gui.add(controls, 'onChangeAnimation',true).name("Animation On/Off");
    gui.add(controls, 'fog', 10, 200)
       .onChange(function(e) { controls.changeFOG() })
       .name("Change FOG");
}

function render() {
    requestAnimationFrame(render);
    stats.update();
    renderer.render(scene, camera) // Render scene
}