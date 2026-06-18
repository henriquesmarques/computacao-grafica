import * as THREE from "three";
import {initRenderer, onWindowResize} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js';
import {GLTFLoader} from '../build/jsm/loaders/GLTFLoader.js';
import {
    criarAviao,
    criarArvores,
    iniciarCamera,
    calcularAlturaTerreno,
    criarMira
} from "./util.js";
import {
    configurarNevoa,
    gerenciarIluminacao,
    atualizarMira,
    atualizarCamera,
    animarAviao,
    atualizarTerreno,
    gerarPosicoesArvores,
    reposicionarArvores,
    criarInimigos,
    atualizarInimigos,
    atirarPlayer,
    atirarInimigos,
    verificarDanoNoPlayer,
    verificarDanoNosInimigos
} from "./logicaJogo.js";

// VARIÁVEIS GLOBAIS
const scene = new THREE.Scene();
const renderer = initRenderer();
let animacaoAtiva = true;
let valorNevoa = 200;
let velocidadeDeslocamento = 0.6; // Começa na velocidade 1
const vetorInterpolacao = new THREE.Vector3(); // Cache para evitar recriar vetores no loop
const relogio = new THREE.Clock(); // Mantém o tempo independente do FPS do monitor
let limiteXDinamico; // Valor padrão inicial
const posicoesValidas = []; // vetor de posições das arvores

// VARIÁVEIS DA COLISÃO
const bbAviao = new THREE.Box3();
const bbProjetilAux = new THREE.Box3();
const bbInimigoAux = new THREE.Box3();

// VARIÁVEIS DO SISTEMA DE COMBATE
const listaInimigos = [];
const listaProjeteis = [];
const listaProjeteisPlayer = [];
let tempoDecorridoInimigos = 0;
const cadenciaTiroInimigos = 1;
let mousePressionado = false;
let tempoDecorridoTiroPlayer = 0;
const cadenciaTiroPlayer = 0.15;
const statusJogo = {tirosSofridos: 0};

// --- TRABALHO 1 ---

// NÉVOA (Fog)
configurarNevoa(scene, renderer, valorNevoa);

// CÂMERA
const camera = iniciarCamera(new THREE.Vector3(0, 25, -30));
scene.add(camera);

// Limita o movimento da mira dependendo da proporção da tela
limiteXDinamico = Math.max(25, Math.min(55, (window.innerWidth / window.innerHeight) * 24));

// STATUS (FPS)
const status = new Stats();
document.getElementById("webgl-output").appendChild(status.domElement);

// AVIÃO
let aviao = null;

// --- TRABALHO 2 ---

// MIRA
const mira = criarMira(0x000000);
mira.position.set(0, 10, -65);
scene.add(mira);

// Oculta o cursor inicialmente
document.body.style.cursor = 'none';
renderer.domElement.style.cursor = 'none';

// INTERAÇÃO COM RAYCASTER
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 65);

// Escuta interações com a janela
configurarJanela();

// CONFIGURAÇÕES DO TERRENO
const comprimentoTerreno = 300;
const larguraTerreno = 450;
const segmentosTerreno = 128;
const geometriaPlano = new THREE.PlaneGeometry(larguraTerreno, comprimentoTerreno, segmentosTerreno, segmentosTerreno);
const materialPlano = new THREE.MeshLambertMaterial({color: "darkgreen"});
const planoTerreno = new THREE.Mesh(geometriaPlano, materialPlano);

// Deita o plano do terreno
planoTerreno.rotation.x = -Math.PI / 2;
planoTerreno.receiveShadow = true;
scene.add(planoTerreno);

// ÁRVORES
const quantidadeArvores = 150;
const listaArvores = criarArvores(comprimentoTerreno, larguraTerreno, quantidadeArvores);

// Cria as posições válidas
gerarPosicoesArvores(posicoesValidas, quantidadeArvores, larguraTerreno, comprimentoTerreno);

listaArvores.forEach((arvore, indice) => {
    arvore.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Anexa a árvore ao seu índice sequencial (de 0 a 199)
    const indiceFixo = indice % posicoesValidas.length;
    arvore.userData.indicePosicao = indiceFixo;

    // Pega o ponto fixo correspondente ao índice da árvore
    const pontoFixo = posicoesValidas[indiceFixo];

    // Posiciona usando as coordenadas estáticas do vetor
    arvore.position.x = pontoFixo.x;
    arvore.position.z = camera.position.z - (pontoFixo.y + (comprimentoTerreno / 2));
    arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);

    scene.add(arvore);
});

// ILUMINAÇÃO
let luzDirecional;
// Cria a luz ambiente
const luzAmbiente = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(luzAmbiente);

// INIMIGOS
let modeloInimigoBase = null;
const escalaOriginalInimigo = 5;
const loader = new GLTFLoader();
function carregarInimigos() {
   loader.load('./assets/dronebranco.glb', function (gltf) {
       let modeloInimigoBase = gltf.scene;


       modeloInimigoBase.traverse(function (child) {
           if (child.isMesh) {
               child.castShadow = true;
               child.receiveShadow = true;
           }
       });
       // Cria os inimigos na cena usando a lista global
       criarInimigos(scene, modeloInimigoBase, listaInimigos, 2, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao);
      
       // Liga a interface e o loop do jogo agora que tudo carregou
       construirInterface();
       renderizar();
   }, undefined, function (error) {
       console.error('Erro ao carregar o modelo do drone:', error);
   });
}

loader.load('./assets/aviao.gltf', function (gltf) {
const modeloAviao = gltf.scene;
   modeloAviao.traverse(function (child) {
       if (child.isMesh) {
           child.castShadow = true;
           child.receiveShadow = true;
       }
   });

   // Salva o modelo na variável
   aviao = modeloAviao;
   aviao.scale.set(2, 2, 2);
   aviao.rotation.set(Math.PI / 2, Math.PI, 0);
   aviao.position.set(0, 10, -90);
   scene.add(aviao);

   // Só agora que o aviao existe e tem .position, chamamos os inimigos
   carregarInimigos();

}, undefined, function (error) {
   console.error('Erro ao carregar o modelo do avião:', error);
});

function renderizar() {
    requestAnimationFrame(renderizar);
    const deltaTime = relogio.getDelta();
    if (animacaoAtiva) {
        // Atualização de Posições e Controles
        atualizarMira(raycaster, mouse, camera, paredeInvisivel, mira, limiteXDinamico);
        atualizarCamera(aviao, mira, camera, paredeInvisivel, velocidadeDeslocamento);

        // Animações e Cenário
        animarAviao(animacaoAtiva, aviao, mira, velocidadeDeslocamento, vetorInterpolacao);
        atualizarTerreno(planoTerreno, geometriaPlano, camera, comprimentoTerreno, segmentosTerreno);
        reposicionarArvores(listaArvores, posicoesValidas, camera, comprimentoTerreno);
        atualizarInimigos(listaInimigos, camera, limiteXDinamico, escalaOriginalInimigo, velocidadeDeslocamento, aviao);

        // Iluminação
        luzDirecional = gerenciarIluminacao(scene, camera, luzDirecional);

        // Sistema de Combate
        gerenciarDisparos(deltaTime);
        gerenciarColisoes();
    }

    status.update();
    renderer.render(scene, camera);
}

function construirInterface() {
    const controlos = new function () {
        this.nevoa = valorNevoa;
        this.alterarNevoa = function () {
            valorNevoa = this.nevoa;
            scene.fog.far = this.nevoa;
        };
    };

    const gui = new GUI();
    gui.add(controlos, 'nevoa', 150, 250)
        .onChange(function () {
            controlos.alterarNevoa()
        })
        .name("Alterar Névoa");

    gui.add(statusJogo, 'tirosSofridos').name("Tiros Sofridos").listen();
}

function pausarSimulacao() {
    animacaoAtiva = false;
    document.body.style.cursor = 'default';
    renderer.domElement.style.cursor = 'default';
    mira.visible = false;
}

function retomarSimulacao() {
    animacaoAtiva = true;
    document.body.style.cursor = 'none';
    renderer.domElement.style.cursor = 'none';
    mira.visible = true;
}

function gerenciarDisparos(deltaTime) {
    // Cadência de disparo do Player
    if (mousePressionado) {
        tempoDecorridoTiroPlayer += deltaTime;
        if (tempoDecorridoTiroPlayer >= cadenciaTiroPlayer) {
            atirarPlayer(scene, aviao, mira, listaProjeteisPlayer);
            tempoDecorridoTiroPlayer = 0;
        }
    }

    // Cadência de disparo dos Inimigos
    tempoDecorridoInimigos += deltaTime;
    if (tempoDecorridoInimigos >= cadenciaTiroInimigos) {
        atirarInimigos(scene, listaInimigos, aviao, camera, listaProjeteis);
        tempoDecorridoInimigos = 0;
    }
}

function gerenciarColisoes() {
    // Atualiza a Bounding Box principal do avião
    bbAviao.setFromObject(aviao);

    // Monitora o dando sofrido/causado
    verificarDanoNoPlayer(scene, listaProjeteis, aviao, bbAviao, bbProjetilAux, statusJogo, velocidadeDeslocamento);
    verificarDanoNosInimigos(scene, listaProjeteisPlayer, listaInimigos, aviao, bbProjetilAux, bbInimigoAux, velocidadeDeslocamento);
}

function configurarJanela() {
    window.addEventListener('resize', function () {
        onWindowResize(camera, renderer)
    }, false);

    window.addEventListener('mousemove', function (event) {
        // Normaliza a posição do mouse (de -1 a 1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }, false);

    // Eventos de clique para tiro contínuo e retomada de pausa
    window.addEventListener('mousedown', function (event) {
        if (!animacaoAtiva) {
            retomarSimulacao();
        } else {
            if (event.button === 0) mousePressionado = true; // Botão esquerdo atira
        }
    }, false);

    window.addEventListener('mouseup', function (event) {
        if (event.button === 0) mousePressionado = false;
    }, false);

    // CONTROLES DE TECLADO
    window.addEventListener('keydown', function (event) {
        switch (event.key) {
            case '1':
                velocidadeDeslocamento = 0.6;
                break;
            case '2':
                velocidadeDeslocamento = 1.2;
                break;
            case '3':
                velocidadeDeslocamento = 1.8;
                break;
            case 'Escape':
                pausarSimulacao();
                break;
        }
    }, false);

    // Responsividade
    window.addEventListener('resize', function () {
        // Atualiza o aspecto da câmera
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // Atualiza o tamanho do renderizador
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Calcula o limiteXDinamico no início do jogo
        const aspecto = camera.aspect;
        const fovRadiano = (camera.fov * Math.PI) / 180;

        // Calcula a largura visível total
        const distanciaCameraAviao = Math.abs(camera.position.z - aviao.position.z);
        limiteXDinamico = Math.tan(fovRadiano / 2) * distanciaCameraAviao * aspecto;

        if (typeof onWindowResize === 'function') {
            onWindowResize(camera, renderer);
        }
    }, false);
}