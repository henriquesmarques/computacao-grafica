import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import { initRenderer, initCamera, initDefaultBasicLight, onWindowResize, createGroundPlaneWired} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import {criarAviao, gerarGrupoArvore } from "./util.js";
//import { compute } from 'three/src/nodes/gpgpu/ComputeNode.js';

// Variáveis globais
const scene = new THREE.Scene();
const renderer = initRenderer();
let animationOn = true; // Controla se a animação está ativa
let valorFOG = 100;
const velocidade = 0.6; //velocidade constante

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
//criando cubo somente com as arestas
const materialCube = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    wireframeLinewidth:1
});
let cube = new THREE.Mesh(cubeGeometry, materialCube)
cube.position.set(0, 10, -65); 
scene.add(cube);

// Avião
const aviao = criarAviao();
//aviao.rotation.set(0, 0, 0);
aviao.rotation.y = Math.PI; //rotaciona em Y se não fica de cabeça para baixo
aviao.rotation.x = -Math.PI / 2; //rotaciona em X se não fica virado de frente
aviao.position.set(0, 10, -90);
scene.add(aviao);


// ==========================================
// INTERAÇÃO COM RAYCASTER (SIMPLIFICADO)
// ==========================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


// Criação da nossa "parede invisível" matemática.
// A normal (0,0,1) diz que a parede está de frente para o eixo Z.
// O número 20 é a distância inversa, o que significa que ela fica cravada em Z = -20.
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 65);

window.addEventListener('mousemove', function(event) {
    // Normaliza a posição do mouse (de -1 a 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Dispara o laser da câmera passando pelo mouse
    raycaster.setFromCamera(mouse, camera);

    // Se a animação estiver ligada, descobre onde o laser bateu na parede invisível
    if (animationOn) {
        raycaster.ray.intersectPlane(paredeInvisivel, cube.position);
        //Limitando o movimento do cubo para não ir para baixo do plano
        if (cube.position.y < 1.0) cube.position.y = 1.0; 
        if (cube.position.y > 40.0) cube.position.y = 40.0; // Limite superior
        if (cube.position.x > 70.0) cube.position.x = 70.0; // Limite lateral
        if (cube.position.x < -70.0) cube.position.x = -70.0;
    }
}, false);


function moverAviao() {
    // Fator de interpolação (0.0 a 1.0). Quanto menor, mais suave.
    const lerpSpeed = 0.05; 

    // O avião tenta alcançar a posição X e Y do cubo, mas mantém seu próprio Z
    aviao.position.x += (cube.position.x - aviao.position.x) * lerpSpeed;
    aviao.position.y += (cube.position.y - aviao.position.y) * lerpSpeed;

    if (aviao.position.y < 1.0) aviao.position.y = 1.0;
    
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

//Utilizando efeito de esteira infinita
function reposicionarPlano() {
    listaPlanos.forEach(plano => { //percorre os dois planos, A e B
        // Como estamos viajando para Z negativo, se a posição Z do plano 
        // for maior que a da câmera ele já saiu da visão traseira.
        if (plano.position.z > camera.position.z + 50) {
            //move o plano após o ultimo plano visivel
            plano.position.z -= listaPlanos.length * comprimentoPlano;
            // Chame a função para mudar as árvores de lugar no plano que passou
            reposicionarArvoresPlano(plano);
        }
    });
}

function reposicionarArvoresPlano(plano) {
    // Procura o grupo de árvores que adicionou ao plano
    plano.children.forEach(filho => {
        if (filho.type === 'Group') {
            filho.children.forEach(arvore => {
                // Valores de X e Z aleatórios para reposicionar as arvores 
                arvore.position.x = (Math.random() - 0.5) * larguraPlano;
                arvore.position.z = (Math.random() - 0.5) * comprimentoPlano;
            });
        }
    });
}

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
if (animationOn) {
        // Movimento constante em sentido negativo
        aviao.position.z -= velocidade;
        cube.position.z -= velocidade;
        camera.position.z -= velocidade;

        // Parede precisa se manter à mesma distância da câmera
        paredeInvisivel.constant += velocidade;

        // Chama a função mover avião
        moverAviao(); 
        // Chama a função para reutilizar os planos
        reposicionarPlano();
        camera.lookAt(aviao.position.x, aviao.position.y, aviao.position.z - 50);    
    }
    stats.update();
    moverAviao();
    renderer.render(scene, camera); // Render scene
}