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
const camera = initCamera(new THREE.Vector3(0, 30, -40));
scene.add(camera);

// Enable mouse rotation, pan, zoom etc.
new OrbitControls(camera, renderer.domElement);

// Escuta mudanças no tamanho da janela
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

// Interação com Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// O ponto de destino começa onde o avião está
const pontoAlvo = new THREE.Vector3(0, 20, -20);

// Criação da "parede invisível" para rastreio do ponteiro mouse
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 20);

window.addEventListener('mousemove', function(event) {
    // Normaliza a posição do mouse
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Dispara o laser da câmera passando pelo mouse
    raycaster.setFromCamera(mouse, camera);

    // Se a animação estiver ligada, descobre onde o laser bateu na parede invisível
    if (animationOn) {
        raycaster.ray.intersectPlane(paredeInvisivel, pontoAlvo);
    }
}, false);





buildInterface();
render();

function moverAviao() {
    if (!animationOn) return;

    // Movimento usando LERP
    aviao.position.lerp(pontoAlvo, 0.05);

    // Inclinação da Asa
    // Multiplicamos por -0.06 para transformar a distância em ângulo de inclinação
    const inclinacaoAlvo = (pontoAlvo.x - aviao.position.x) * -0.06;

    // Aplica a rotação de forma suave no eixo Y
    aviao.rotation.y += (inclinacaoAlvo - aviao.rotation.y) * 0.1;
}

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
    moverAviao();
    renderer.render(scene, camera); // Render scene
}