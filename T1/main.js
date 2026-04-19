import * as THREE from "three";
import {
    initRenderer,
    initCamera,
    initDefaultBasicLight,
    onWindowResize,
    createGroundPlaneWired
} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js'
import { criarAviao, gerarVariasArvores } from "./util.js";

// VARIÁVEIS GLOBAIS
const scene = new THREE.Scene();
const renderer = initRenderer();
let animationOn = true; // Controla se a animação está ativa
let valorFOG = 125;
const velocidade = 0.6; // Velocidade constante
const alvoLerp = new THREE.Vector3();

// ILUMINAÇÃO
initDefaultBasicLight(scene);

// CÂMERA
const camera = initCamera(new THREE.Vector3(0, 20, -45));
scene.add(camera);

// Escuta mudanças no tamanho da janela
window.addEventListener('resize', function () {
    onWindowResize(camera, renderer)
}, false);

// FOG (Névoa)
const baseColor = "rgb(175, 200, 220)"; // a cor do FOG deve ser a mesma do background
scene.fog = new THREE.Fog(baseColor, 1, valorFOG);
renderer.setClearColor(baseColor);

// STATUS (FPS)
const stats = new Stats();
document.getElementById("webgl-output").appendChild(stats.domElement);

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

// Criação de um array com os planos para a manipulação "infinita"
let listaPlanos = [planoA, planoB];

// ÁRVORES
// Adicionado as árvores nos planos
const arvoresA = gerarVariasArvores(comprimentoPlano, larguraPlano);
planoA.add(...arvoresA);
const arvoresB = gerarVariasArvores(comprimentoPlano, larguraPlano);
planoB.add(...arvoresB);

// CUBO DE MIRA
const cubeGeometry = new THREE.BoxGeometry(5, 5, 5);
// Criando material do cubo somente com as arestas
const materialCube = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    wireframeLinewidth: 1
});
const mira = new THREE.Mesh(cubeGeometry, materialCube)
mira.position.set(0, 10, -65);
scene.add(mira);

// AVIÃO
const objeto = criarAviao();
const aviao = objeto.corpo;
const helice = objeto.helice;
// Deita o avião para apontar para frente e gira para ficar de barriga para baixo
aviao.rotation.set(-Math.PI / 2, Math.PI, 0);
aviao.position.set(0, 10, -90); // Avião inicia em Z -90
scene.add(aviao);

// INTERAÇÃO COM RAYCASTER 
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Criação da "parede invisível"
// O segundo parâmetro é a distância inversa, o que significa que ela fica cravada em Z = -65.
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 65);

window.addEventListener('mousemove', function (event) {
    // Normaliza a posição do mouse (de -1 a 1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}, false);

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
        if (mira.position.y < 7.0) mira.position.y = 7.0;
        if (mira.position.y > 40.0) mira.position.y = 40.0; // Limite superior
        if (mira.position.x > 70.0) mira.position.x = 70.0; // Limite lateral
        if (mira.position.x < -70.0) mira.position.x = -70.0;

        // Movimento em Z constante e em sentido negativo
        aviao.position.z -= velocidade;
        mira.position.z -= velocidade;
        camera.position.z -= velocidade;
        camera.position.x = aviao.position.x;
        camera.lookAt(aviao.position.x, aviao.position.y, aviao.position.z - 50);

        // Parede precisa se manter à mesma distância da câmera
        paredeInvisivel.constant = -camera.position.z + 65;

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
    helice.rotation.y += Math.PI/10;
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
            reposicionarArvoresPlano(plano);
        }
    }
}

function reposicionarArvoresPlano(plano) {
    let vetorDeArvores;

    // Verificando qual o plano
    if (plano === planoA)
        vetorDeArvores = arvoresA;
    else if (plano === planoB)
        vetorDeArvores = arvoresB;

    const posicoesAprovadas = [];
    const distanciaMinima = 10.0; // Distância mínima que você quer entre as árvores

    // Percorre o vetor de arvores para reposiciona-las
    for (let i = 0; i < vetorDeArvores.length; i++) {
        const arvore = vetorDeArvores[i];

        let x, y;
        let posicaoAceita = true;
        let tentativas = 0; // Trava de tentativas para nova posição

        // Sorteia a nova posição se estiver próximo de uma árvore
        while (posicaoAceita && tentativas < 25) {
            x = (Math.random() - 0.5) * larguraPlano;
            y = (Math.random() - 0.5) * comprimentoPlano - 100;

            posicaoAceita = false; // Assume que a posição é boa

            // Compara com as árvores já aceitas com a atual
            for (let j = 0; j < posicoesAprovadas.length; j++) {
                const arvoreAceita = posicoesAprovadas[j];

                // Calcula a distância usando Pitágoras 
                const distanciaX = x - arvoreAceita.x;
                const distanciaY = y - arvoreAceita.y;
                const distanciaReal = Math.sqrt((distanciaX * distanciaX) + (distanciaY * distanciaY));

                // Se a distância for menor que o limite é invalida
                if (distanciaReal < distanciaMinima) {
                    posicaoAceita = true;
                    break; //interrompe a comparação e sorteia nova posição
                }
            }
            tentativas++;
        }

        // Salva a posição da árvore aceita
        posicoesAprovadas.push({x: x, y: y});

        // Aplica na árvore
        arvore.position.set(x, y, 0);
    }
}

