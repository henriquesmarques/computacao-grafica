import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import { initRenderer, initCamera, initDefaultBasicLight, onWindowResize, createGroundPlaneWired, setDefaultMaterial } from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import {criarAviao, gerarGrupoArvore } from "./util.js";
//import { compute } from 'three/src/nodes/gpgpu/ComputeNode.js';

// Variáveis globais
const scene = new THREE.Scene();
const renderer = initRenderer();
let animationOn = true; // Controla se a animação está ativa
let valorFOG = 100;

// Create a basic light to illuminate the scene
initDefaultBasicLight(scene);

// Câmera
const camera = initCamera(new THREE.Vector3(0, 20, -45));
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

// Criando o plano
//Variaveis para comprimento e largura
const comprimentoPlano = 200;
const larguraPlano = 150;

//Criando dois planos, A e B. 
//Plano A: Inicio
const planoA = createGroundPlaneWired(larguraPlano, comprimentoPlano);
scene.add(planoA);

//Plano B: Inicia quando o plano A acaba
const planoB = createGroundPlaneWired(larguraPlano, comprimentoPlano);
planoB.position.z = -comprimentoPlano; //inicia B assim que termina A
scene.add(planoB);

//Criação de um array com os planos para a manipulção "infinita"
let listaPlanos = [planoA, planoB];

//Adicionado as arvores nos planos
//Arvores Plano A
const arvoresA = gerarGrupoArvore(comprimentoPlano, larguraPlano);
planoA.add(arvoresA);

//Arvores Plano B
const arvoresB = gerarGrupoArvore(comprimentoPlano, larguraPlano);
planoB.add(arvoresB);

// Criando cubo de mira
let cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
//criando cubo com as arestas
const materialCube = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    wireframeLinewidth:1
});
let cube = new THREE.Mesh(cubeGeometry, materialCube)
cube.position.set(10, 10, -100); 
scene.add(cube);

// Avião
const eixo = new THREE.AxesHelper(12);
const aviao = criarAviao();
aviao.position.set(0, 10, -20);
aviao.add(eixo);
scene.add(aviao);


// ==========================================
// INTERAÇÃO COM RAYCASTER (SIMPLIFICADO)
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// O ponto de destino começa onde o avião está
const pontoAlvo = new THREE.Vector3(0, 20, -20);

// Criação da nossa "parede invisível" matemática.
// A normal (0,0,1) diz que a parede está de frente para o eixo Z.
// O número 20 é a distância inversa, o que significa que ela fica cravada em Z = -20.
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 40);

window.addEventListener('mousemove', function(event) {
    // Normaliza a posição do mouse (de -1 a 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Dispara o laser da câmera passando pelo mouse
    raycaster.setFromCamera(mouse, camera);

    // Se a animação estiver ligada, descobre onde o laser bateu na parede invisível
    if (animationOn) {
        raycaster.ray.intersectPlane(paredeInvisivel, cube.position);
    }
}, false);


function moverAviao() {
    // Fator de interpolação (0.0 a 1.0). Quanto menor, mais suave.
    const lerpSpeed = 0.05; 

    // O avião tenta alcançar a posição X e Y do cubo, mas mantém seu próprio Z
    aviao.position.x += (cube.position.x - aviao.position.x) * lerpSpeed;
    aviao.position.y += (cube.position.y - aviao.position.y) * lerpSpeed;

    // --- ROTAÇÃO EM Z (ROLL) ---
    // Calculamos a diferença lateral entre o avião e o cubo
    const deltaX = cube.position.x - aviao.position.x;
    
    // Aplicamos a inclinação baseada nessa distância
    aviao.rotation.z = -deltaX * 0.1; 

    // Limitamos a inclinação para não passar de 45 graus (PI/4)
    const maxRoll = Math.PI / 4;
    aviao.rotation.z = THREE.MathUtils.clamp(aviao.rotation.z, -maxRoll, maxRoll);
}
// ==========================================


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
    moverAviao();
    renderer.render(scene, camera); // Render scene
}