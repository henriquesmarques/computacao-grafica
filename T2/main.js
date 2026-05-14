import * as THREE from "three";
import {initRenderer, initDefaultBasicLight, onWindowResize} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js';
import {
    criarAviao,
    criarArvores,
    iniciarCamera,
    calcularAlturaTerreno
} from "./util.js";

// VARIÁVEIS GLOBAIS
const scene = new THREE.Scene();
const renderer = initRenderer();
let animacaoAtiva = true;
let valorNevoa = 125;
const velocidadeDeslocamento = 0.6;
const vetorInterpolacao = new THREE.Vector3();

// --- TRABALHO 1 ---

// NÉVOA (Fog)
configurarNevoa();

// CÂMERA
const camera = iniciarCamera(new THREE.Vector3(0, 25, -30));
scene.add(camera);
window.addEventListener('resize', function () {
    onWindowResize(camera, renderer)
}, false);

// STATUS (FPS)
const status = new Stats();
document.getElementById("webgl-output").appendChild(status.domElement);

// AVIÃO
const objetoAviao = criarAviao();
const aviao = objetoAviao.corpo;
const helice = objetoAviao.helice;
aviao.rotation.set(-Math.PI / 2, Math.PI, 0);
aviao.position.set(0, 10, -90);
scene.add(aviao);

// CUBO DE MIRA
const geometriaMira = new THREE.BoxGeometry(5, 5, 5);
const materialMira = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: true,
    wireframeLinewidth: 1
});
const cuboMira = new THREE.Mesh(geometriaMira, materialMira)
cuboMira.position.set(0, 10, -65);
scene.add(cuboMira);

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

// CONFIGURAÇÕES DO TERRENO
const comprimentoTerreno = 300;
const larguraTerreno = 450;
const segmentosTerreno = 128;

const geometriaPlano = new THREE.PlaneGeometry(larguraTerreno, comprimentoTerreno, segmentosTerreno, segmentosTerreno);
const materialPlano = new THREE.MeshLambertMaterial({color: "darkgreen"});
const planoTerreno = new THREE.Mesh(geometriaPlano, materialPlano);
planoTerreno.rotation.x = -Math.PI / 2;
scene.add(planoTerreno);

// ÁRVORES
const quantidadeArvores = 350;
const listaArvores = criarArvores(comprimentoTerreno, larguraTerreno, quantidadeArvores);

listaArvores.forEach(arvore => {
    arvore.scale.set(0.4, 0.4, 0.4);
    scene.add(arvore);

    // Posicionamento aleatório inicial espalhado ao longo do espaço visível
    arvore.position.x = (Math.random() - 0.5) * larguraTerreno;
    arvore.position.z = camera.position.z - Math.random() * comprimentoTerreno;

    // Obtém a altura correspondente àquelas coordenadas para ancorar a árvore ao solo
    arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);
});

// ILUMINAÇÃO
initDefaultBasicLight(scene);

// --- FIM DO TRABALHO 2 ---

construirInterface();
renderizar();

function construirInterface() {
    const controlos = new function () {
        this.alternarAnimacao = function () {
            animacaoAtiva = !animacaoAtiva;
        };
        this.nevoa = valorNevoa;

        this.alterarNevoa = function () {
            valorNevoa = this.nevoa;
            scene.fog.far = this.nevoa;
        };
    };

    const gui = new GUI();
    gui.add(controlos, 'alternarAnimacao', true).name("Animação On/Off");
    gui.add(controlos, 'nevoa', 50, 200)
        .onChange(function () {
            controlos.alterarNevoa()
        })
        .name("Alterar Névoa");
}

function renderizar() {
    requestAnimationFrame(renderizar);
    if (animacaoAtiva) {
        // Atualiza a posição do cubo de mira baseada no ponteiro do rato
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(paredeInvisivel, cuboMira.position);

        // Limita o movimento do cubo de mira
        if (cuboMira.position.y < 10) cuboMira.position.y = 10;
        if (cuboMira.position.y > 30) cuboMira.position.y = 30;
        if (cuboMira.position.x > 30) cuboMira.position.x = 30;
        if (cuboMira.position.x < -30) cuboMira.position.x = -30;

        // Deslocamento constante no eixo Z (para a frente)
        aviao.position.z -= velocidadeDeslocamento;
        cuboMira.position.z -= velocidadeDeslocamento;
        camera.position.z -= velocidadeDeslocamento;

        camera.position.x = aviao.position.x;
        camera.lookAt(aviao.position.x, aviao.position.y, aviao.position.z - 30);

        // Limita o movimento da câmera
        if (camera.position.y < 20) camera.position.y = 20;
        if (camera.position.x > 5) camera.position.x = 5;
        if (camera.position.x < -5) camera.position.x = -5;

        paredeInvisivel.constant = -camera.position.z + 65 + 30;

        animarAviao();

        // Recalcula dinamicamente a geometria do terreno e teletransporta as árvores
        atualizarTerrenoContinuo();
        reposicionarArvoresEmTempoReal();
    }
    status.update();
    renderer.render(scene, camera);
}

function animarAviao() {
    if (!animacaoAtiva) return;

    const pontoDestino = cuboMira.position;

    vetorInterpolacao.set(pontoDestino.x, pontoDestino.y, aviao.position.z);
    aviao.position.lerp(vetorInterpolacao, 0.02);

    const rotacaoAlvo = Math.PI + (pontoDestino.x - aviao.position.x) * 0.03;
    aviao.rotation.y += (rotacaoAlvo - aviao.rotation.y) * 0.1;

    helice.rotation.y += Math.PI / 10;
}

function configurarNevoa() {
    const corBase = "rgb(175, 200, 220)";
    scene.fog = new THREE.Fog(corBase, 1, valorNevoa);
    renderer.setClearColor(corBase);
}

// Movimenta o plano base acompanhando a câmara e deforma os vértices para dar a ilusão de passagem por um cenário infinito.
function atualizarTerrenoContinuo() {
    // Desloca fisicamente o centro do plano de modo a permanecer sempre visível à frente da câmara
    const deslocamentoZ = camera.position.z - (comprimentoTerreno / 2) + 60;
    planoTerreno.position.z = deslocamentoZ;

    const arrayPosicoes = geometriaPlano.attributes.position.array;

    // Varre todos os vértices da grelha (grid) e recalcula as elevações baseadas na coordenada real
    for (let linha = 0; linha <= segmentosTerreno; linha++) {
        for (let coluna = 0; coluna <= segmentosTerreno; coluna++) {
            const indiceOriginal = (linha * (segmentosTerreno + 1) + coluna) * 3;

            const coordenadaLocalX = arrayPosicoes[indiceOriginal];
            const coordenadaLocalY = arrayPosicoes[indiceOriginal + 1];

            // Conversão de Coordenadas: A rotação inicial de -90 graus transformou o Y local no Z do mundo
            const coordenadaMundoX = coordenadaLocalX;
            const coordenadaMundoZ = deslocamentoZ - coordenadaLocalY;

            // Aplica a elevação topográfica
            arrayPosicoes[indiceOriginal + 2] = calcularAlturaTerreno(coordenadaMundoX, coordenadaMundoZ);
        }
    }

    // Sinaliza o renderizador de que as posições foram alteradas
    geometriaPlano.attributes.position.needsUpdate = true;
    geometriaPlano.computeVertexNormals(); // Essencial para recalcular o impacto da luz nas novas inclinações
}

// Monitoriza as árvores. Quando uma árvore fica muito para trás, ela é movida para a linha do horizonte.
export function reposicionarArvoresEmTempoReal() {
    for (let arvore of listaArvores) {
        if (arvore.position.z > camera.position.z + 20) {
            // Avança a árvore reciclando-a visualmente
            arvore.position.z -= comprimentoTerreno;
            // Sorteia uma nova posição horizontal
            arvore.position.x = (Math.random() - 0.5) * larguraTerreno;
            // Adapta a altura da árvore ao novo ponto do relevo
            arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);
        }
    }
}