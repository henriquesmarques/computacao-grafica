import * as THREE from 'three';
import {OrbitControls} from '../build/jsm/controls/OrbitControls.js';
import { initRenderer, initCamera, initDefaultBasicLight, onWindowResize, createGroundPlaneWired} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import {criarAviao, gerarVariasArvores } from "./util.js";
//import { compute } from 'three/src/nodes/gpgpu/ComputeNode.js';

// Variáveis globais
const scene = new THREE.Scene();
const renderer = initRenderer();
let animationOn = true; // Controla se a animação está ativa
let valorFOG = 100;
const velocidade = 0.6; //velocidade constante
const alvoLerp = new THREE.Vector3();

// Create a basic light to illuminate the scene
initDefaultBasicLight(scene);

// Câmera
const camera = initCamera(new THREE.Vector3(0, 20, -45));
scene.add(camera);

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
const comprimentoPlano = 200;
const larguraPlano = 400;

//Criando dois planos, A e B. 
//Plano A
const planoA = createGroundPlaneWired(larguraPlano, comprimentoPlano);
scene.add(planoA);

//Plano B
const planoB = createGroundPlaneWired(larguraPlano, comprimentoPlano);
planoB.position.z = -comprimentoPlano; //inicia B assim que termina A
scene.add(planoB);

//Criação de um array com os planos para a manipulção "infinita"
let listaPlanos = [planoA, planoB];

//Adicionado as arvores nos planos
//Arvores Plano A
const arvoresA = gerarVariasArvores(comprimentoPlano, larguraPlano);
planoA.add(...arvoresA); //por se tratar de um vetor, é necessario usar esses ...

//Arvores Plano B
const arvoresB = gerarVariasArvores(comprimentoPlano, larguraPlano);
planoB.add(...arvoresB);

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
// Deita o avião para apontar para frente 
// e gira para ficar de barriga para baixo 
aviao.rotation.set(-Math.PI / 2, Math.PI, 0); 
aviao.position.set(0, 10, -90); // Avião em -90 
scene.add(aviao);

// INTERAÇÃO COM RAYCASTER 
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
    if (!animationOn) return;
    const pontoAlvo = cube.position;
    //Pega X e Y da mira, mas mantém o Z do avião
    alvoLerp.set(pontoAlvo.x, pontoAlvo.y, aviao.position.z);
    // aviao.position.x += (pontoAlvo.x - aviao.position.x) * 0.05;
    // aviao.position.y += (pontoAlvo.y - aviao.position.y) * 0.05;
    aviao.position.lerp(alvoLerp, 0.05);

    // Inclinação da Asa
    // Somamos Math.PI para virar o avião de cabeça para cima 
    const inclinacaoAlvo = Math.PI + (pontoAlvo.x - aviao.position.x) * 0.06;

    // Aplica a rotação de forma suave no eixo Y
    aviao.rotation.y += (inclinacaoAlvo - aviao.rotation.y) * 0.1;
}

//Utilizando efeito de esteira infinita
function reposicionarPlano() {
    for (let i = 0; i < listaPlanos.length; i++) {
        const plano = listaPlanos[i]; // Pega o plano atual da rodada
        
        // Como estamos viajando para Z negativo, se a posição Z do plano 
        // for maior que a da câmera ele já saiu da visão traseira.
        // somamos 60 para o plano não ir para frente e estar no campo de visão do usuario
        if (plano.position.z > camera.position.z + 100) {
            // Move o plano após o ultimo plano visível
            plano.position.z -= listaPlanos.length * comprimentoPlano;
            // Chama a função para mudar as árvores de lugar
            reposicionarArvoresPlano(plano);
        }
    }
}

function reposicionarArvoresPlano(plano) {
    let vetorDeArvores;

    //Verificando qual o plano
    if (plano === planoA) {
        vetorDeArvores = arvoresA;
    } else if (plano === planoB) {
        vetorDeArvores = arvoresB;
    }
    //Percorrendo o vetor de arvores 
    for (let i = 0; i < vetorDeArvores.length; i++) {
        const arvore = vetorDeArvores[i]; 
        
        //Sorteia novas posições 
        let x = (Math.random() - 0.5) * larguraPlano;
        const y = (Math.random() - 0.5) * comprimentoPlano;

        // Atualiza a posição no plano
        arvore.position.set(x, y, 0); 
    }
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
