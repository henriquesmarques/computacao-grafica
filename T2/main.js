import * as THREE from "three";
import {
    initRenderer,
    initDefaultBasicLight,
    onWindowResize,
    createGroundPlaneWired
} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import {criarAviao, criarArvores, iniciarCamera} from "./utils.js";

// VARIÁVEIS GLOBAIS
const scene = new THREE.Scene();
const renderer = initRenderer();
let animationOn = true; // Controla se a animação está ativa
let valorFOG = 125;
const velocidade = 0.6; // Velocidade constante
const distanciaMinima = 10;
const alvoLerp = new THREE.Vector3();

// --- TRABALHO 1 ---

// FOG (Névoa)
setFog();

// CÂMERA
const camera = iniciarCamera(new THREE.Vector3(0, 25, -30));
scene.add(camera);
window.addEventListener('resize', function () {
    onWindowResize(camera, renderer)
}, false);

// STATUS (FPS)
const stats = new Stats();
document.getElementById("webgl-output").appendChild(stats.domElement);

// AVIÃO
const objeto = criarAviao();
const aviao = objeto.corpo;
const helice = objeto.helice;
aviao.rotation.set(-Math.PI / 2, Math.PI, 0);
aviao.position.set(0, 10, -90);
scene.add(aviao);

// CUBO DE MIRA
const cubeGeometry = new THREE.BoxGeometry(5, 5, 5);
const materialCube = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    wireframeLinewidth: 1
});
const mira = new THREE.Mesh(cubeGeometry, materialCube)
mira.position.set(0, 10, -65);
scene.add(mira);

// INTERAÇÃO COM RAYCASTER 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 65);
window.addEventListener('mousemove', function (event) {
    // Normaliza a posição do mouse (de -1 a 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}, false);

// --- TRABALHO 2 ---

// PLANOS
const comprimentoPlano = 250;
const larguraPlano = 450;
// Plano A
const planoA = createGroundPlaneWired(larguraPlano, comprimentoPlano);
scene.add(planoA);
planoA.material.color.set("darkgreen");
// Plano B
const planoB = createGroundPlaneWired(larguraPlano, comprimentoPlano);
planoB.position.z = -comprimentoPlano; // inicia B assim que termina A
scene.add(planoB);
planoB.material.color.set("darkgreen");
let listaPlanos = [planoA, planoB];

// ÁRVORES
const arvoresA = criarArvores(comprimentoPlano, larguraPlano, 50);
const arvoresB = criarArvores(comprimentoPlano, larguraPlano, 50);
planoA.add(...arvoresA);
planoB.add(...arvoresB);
reposicionarArvoresPlano(planoA, distanciaMinima);
reposicionarArvoresPlano(planoB, distanciaMinima);

// ILUMINAÇÃO
initDefaultBasicLight(scene);

// --- FIM DO TRABALHO 2 ---

buildInterface();
render();

function buildInterface() {
    // Controles
    const controls = new function () {
        this.onChangeAnimation = function () {
            animationOn = !animationOn;
        };
        this.fog = valorFOG;

        this.changeFOG = function () {
            valorFOG = this.fog;
            scene.fog.far = this.fog;
        };
    };

    // Interface
    const gui = new GUI();
    gui.add(controls, 'onChangeAnimation', true).name("Animation On/Off");
    gui.add(controls, 'fog', 50, 200)
        .onChange(function () {
            controls.changeFOG()
        })
        .name("Change FOG");
}

function render() {
    requestAnimationFrame(render);
    if (animationOn) {
        // Atualiza a posição da mira baseada no mouse
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(paredeInvisivel, mira.position);

        // Limitando o movimento do cubo para não ir para baixo do plano
        if (mira.position.y < 10) mira.position.y = 10;
        if (mira.position.y > 30) mira.position.y = 30; // Limite superior
        if (mira.position.x > 30) mira.position.x = 30; // Limite lateral
        if (mira.position.x < -30) mira.position.x = -30;

        // Movimento em Z constante e em sentido negativo
        aviao.position.z -= velocidade;
        mira.position.z -= velocidade;

        camera.position.z -= velocidade;
        camera.position.x = aviao.position.x;
        camera.lookAt(aviao.position.x, aviao.position.y, aviao.position.z - 30);
        if (camera.position.y > 15) camera.position.y = 15; // Limite superior
        if (camera.position.x > 5) camera.position.x = 5; // Limite lateral
        if (camera.position.x < -5) camera.position.x = -5;

        // Parede precisa se manter à mesma distância da câmera
        paredeInvisivel.constant = -camera.position.z + 65 + 30;

        // Chama a função mover avião
        moverAviao();

        // Chama a função para reutilizar os planos
        reposicionarPlano();
    }
    stats.update();
    moverAviao();
    renderer.render(scene, camera);
}

function moverAviao() {
    if (!animationOn) return;

    const pontoAlvo = mira.position;

    // Pega X e Y da mira, mas mantém o Z do avião
    alvoLerp.set(pontoAlvo.x, pontoAlvo.y, aviao.position.z);
    aviao.position.lerp(alvoLerp, 0.02);

    // Inclinação da Asa
    // Somamos Math.PI para virar o avião de cabeça para cima
    const inclinacaoAlvo = Math.PI + (pontoAlvo.x - aviao.position.x) * 0.03;

    // Aplica a rotação de forma suave no eixo Y
    aviao.rotation.y += (inclinacaoAlvo - aviao.rotation.y) * 0.1;

    // Adiciona movimentação a hélice
    helice.rotation.y += Math.PI / 10;
}

// Utilizando efeito de esteira infinita
function reposicionarPlano() {
    for (let i = 0; i < listaPlanos.length; i++) {
        const plano = listaPlanos[i]; // Pega o plano atual da rodada

        // Como estamos viajando para Z negativo, se a posição Z do plano
        // for maior que a da câmera ele já saiu da visão traseira.
        // Somamos 60 para o plano não ir para frente e estar no campo de visão do usuário
        if (plano.position.z > camera.position.z + 100) {
            // Move o plano após o último plano visível
            plano.position.z -= listaPlanos.length * comprimentoPlano;
            // Chama a função para mudar as árvores de lugar
            reposicionarArvoresPlano(plano, distanciaMinima);
        }
    }
}

function reposicionarArvoresPlano(plano, distanciaMinima = 10) {
    const arvores = plano === planoA ? arvoresA : arvoresB;
    const posicoesAprovadas = [];
    const distanciaMinima2 = distanciaMinima * distanciaMinima; // comparar distâncias ao quadrado evita sqrt

    for (const arvore of arvores) {
        let x, y;
        let ehValido = false;
        let tentativas = 0;
        const maxTentativas = 50;

        do {
            x = (Math.random() - 0.5) * larguraPlano;
            y = (Math.random() - 0.5) * comprimentoPlano - 100;

            ehValido = true; // assumimos válida até provar o contrário

            for (const pos of posicoesAprovadas) {
                const dx = x - pos.x;
                const dy = y - pos.y;
                const dist2 = dx * dx + dy * dy;

                if (dist2 < distanciaMinima2) {
                    ehValido = false;
                    break;
                }
            }

            tentativas++;
        } while (!ehValido && tentativas < maxTentativas);

        if (!ehValido) {
            console.warn(`reposicionarArvoresPlano: não encontrou posição válida após ${tentativas} tentativas, colocando árvore mesmo assim.`);
        }

        posicoesAprovadas.push({ x: x, y: y });

        // mantém outras propriedades da árvore (rotations, scale) e apenas altera posição
        arvore.position.set(x, y, 0);
    }
}

// FOG (Névoa)
function setFog() {
    const baseColor = "rgb(175, 200, 220)"; // a cor do FOG deve ser a mesma do background
    scene.fog = new THREE.Fog(baseColor, 1, valorFOG);
    renderer.setClearColor(baseColor);
}
