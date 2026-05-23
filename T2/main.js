import * as THREE from "three";
import {initRenderer, initDefaultBasicLight, onWindowResize} from "../libs/util/util.js";
import Stats from '../build/jsm/libs/stats.module.js';
import GUI from '../libs/util/dat.gui.module.js';
import { GLTFLoader } from '../build/jsm/loaders/GLTFLoader.js';
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
let valorNevoa = 200;
let velocidadeDeslocamento = 0.6; // Começa na velocidade 1
const vetorInterpolacao = new THREE.Vector3();
const relogio = new THREE.Clock();
let limiteXDinamico; // Valor padrão inicial
const posicoesValidas = []; // vetor de posições das arvores
let indicesPosicoesLivres = []; //posição livre para sorteio

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
configurarNevoa();

// CÂMERA
const camera = iniciarCamera(new THREE.Vector3(0, 25, -30));
scene.add(camera);
limiteXDinamico = Math.max(25, Math.min(55, (window.innerWidth / window.innerHeight) * 24));
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

// --- TRABALHO 2 ---

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

// Oculta o cursor inicialmente
document.body.style.cursor = 'none';
renderer.domElement.style.cursor = 'none';

// INTERAÇÃO COM RAYCASTER
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 65);

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

//Responsividade
window.addEventListener('resize', function () {
    //Atualiza o aspecto da câmera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    //Atualiza o tamanho do renderizador
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

// CONFIGURAÇÕES DO TERRENO
const comprimentoTerreno = 300;
const larguraTerreno = 450;
const segmentosTerreno = 128;
const geometriaPlano = new THREE.PlaneGeometry(larguraTerreno, comprimentoTerreno, segmentosTerreno, segmentosTerreno);
const materialPlano = new THREE.MeshLambertMaterial({color: "darkgreen"});
const planoTerreno = new THREE.Mesh(geometriaPlano, materialPlano);
planoTerreno.rotation.x = -Math.PI / 2;
planoTerreno.receiveShadow = true; //permitir sombra no terreno
scene.add(planoTerreno);

//Cria as posições validas
gerarPosicoesArvores();

// ÁRVORES
const quantidadeArvores = 350;
const listaArvores = criarArvores(comprimentoTerreno, larguraTerreno, quantidadeArvores);

listaArvores.forEach((arvore, indice) => {
    arvore.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    let indiceExclusivo;

    // Trava 
    if (indicesPosicoesLivres.length > 0) {
        indiceExclusivo = indicesPosicoesLivres.pop();
    } else {
        indiceExclusivo = indice % posicoesValidas.length;
    }

    arvore.userData.indicePosicao = indiceExclusivo; // Guarda o índice nela para lembrar depois

    const pontoSorteado = posicoesValidas[indiceExclusivo];
    
    arvore.position.x = pontoSorteado.x;
    arvore.position.z = camera.position.z - (pontoSorteado.y + (comprimentoTerreno / 2));
    arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);
    scene.add(arvore);
});

// ILUMINAÇÃO
initDefaultBasicLight(scene);
//Criando iluminação direcional
let luzDirecional;

// INIMIGOS
let modeloInimigoBase = null;
const escalaOriginalInimigo = 2.0; // Altere se o modelo for gigante ou minúsculo

const loader = new GLTFLoader();
loader.load('./assets/drone.glb', function (gltf) {
    modeloInimigoBase = gltf.scene;

    // Ativa as sombras em todas as partes da malha do drone
    modeloInimigoBase.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Só cria os inimigos depois do modelo carregar
    criarInimigos(2);
}, undefined, function (error) {
    console.error('Erro ao carregar o modelo do drone:', error);
});

construirInterface();
renderizar();

function renderizar() {
    requestAnimationFrame(renderizar);
    const deltaTime = relogio.getDelta();

    if (animacaoAtiva) {
        // Atualização de Posições e Controles
        atualizarMira();
        atualizarCamera();

        // Animações e Cenário
        animarAviao();
        atualizarTerreno();
        reposicionarArvores();
        atualizarInimigos();

        //Iluminação
        gerenciarIluminacao();

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
    cuboMira.visible = false;
}

function retomarSimulacao() {
    animacaoAtiva = true;
    document.body.style.cursor = 'none';
    renderer.domElement.style.cursor = 'none';
    cuboMira.visible = true;
}

//Iluminação
function gerenciarIluminacao() {
    // Cria as luzes apenas na primeira execução
    if (!luzDirecional) {
        luzDirecional = new THREE.DirectionalLight(0xffffff, 1.2);
        luzDirecional.castShadow = true; // Exigência do trabalho

        // Resolução equilibrada 
        luzDirecional.shadow.mapSize.width = 1024;
        luzDirecional.shadow.mapSize.height = 1024;

        // Evita artefatos e sombras piscando
        luzDirecional.shadow.bias = -0.0005;

        //Adiciona na cena
        scene.add(luzDirecional);
        scene.add(luzDirecional.target);
    }

    // Atualização contínua de posição
    // Posiciona a luz em X e Y positivo em relação à câmera para projetar na esquerda
    luzDirecional.position.set(camera.position.x + 40, 60, camera.position.z - 20);
    luzDirecional.target.position.set(camera.position.x, 0, camera.position.z - 60);

    // Volume adaptativo em relação ao fog
    const distanciaFog = scene.fog ? scene.fog.far : 200;

    luzDirecional.shadow.camera.near = 0.5;
    luzDirecional.shadow.camera.far = distanciaFog;

    // Proporção para cobrir o campo de visão visível
    const d = distanciaFog * 0.4;
    luzDirecional.shadow.camera.left = -d;
    luzDirecional.shadow.camera.right = d;
    luzDirecional.shadow.camera.top = d;
    luzDirecional.shadow.camera.bottom = -d;

    luzDirecional.shadow.camera.updateProjectionMatrix();
}

function atualizarMira() {
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(paredeInvisivel, cuboMira.position);

    // Limitação espacial da mira na tela
    if (cuboMira.position.y < 8) cuboMira.position.y = 8;
    if (cuboMira.position.y > 55) cuboMira.position.y = 55;
    if (cuboMira.position.x > limiteXDinamico) cuboMira.position.x = limiteXDinamico;
    if (cuboMira.position.x < -limiteXDinamico) cuboMira.position.x = -limiteXDinamico;
}

function atualizarCamera() {
    // Movimentação para frente
    aviao.position.z -= velocidadeDeslocamento;
    cuboMira.position.z -= velocidadeDeslocamento;
    camera.position.z -= velocidadeDeslocamento;

    // Câmera acompanha o eixo X do avião
    camera.position.x = aviao.position.x;
    camera.lookAt(aviao.position.x, aviao.position.y, aviao.position.z - 30);

    // Limitação da câmera
    if (camera.position.y < 20) camera.position.y = 20;
    if (camera.position.x > 5) camera.position.x = 5;
    if (camera.position.x < -5) camera.position.x = -5;

    // Atualiza a posição da parede invisível do raycaster
    paredeInvisivel.constant = -camera.position.z + 65 + 30;
}

function gerenciarDisparos(deltaTime) {
    // Cadência de disparo do Player
    if (mousePressionado) {
        tempoDecorridoTiroPlayer += deltaTime;
        if (tempoDecorridoTiroPlayer >= cadenciaTiroPlayer) {
            atirarPlayer();
            tempoDecorridoTiroPlayer = 0;
        }
    }

    // Cadência de disparo dos Inimigos
    tempoDecorridoInimigos += deltaTime;
    if (tempoDecorridoInimigos >= cadenciaTiroInimigos) {
        atirarInimigos();
        tempoDecorridoInimigos = 0;
    }
}

function gerenciarColisoes() {
    // Atualiza a Bounding Box principal do avião
    bbAviao.setFromObject(aviao);

    // Monitora o dando sofrido/causado
    verificarDanoNoPlayer();
    verificarDanoNosInimigos();
}

function verificarDanoNoPlayer() {
    for (let i = listaProjeteis.length - 1; i >= 0; i--) {
        const projetil = listaProjeteis[i];
        projetil.position.addScaledVector(projetil.userData.direcao, 1.5 + (velocidadeDeslocamento * 0.5));

        bbProjetilAux.setFromObject(projetil);

        if (bbProjetilAux.intersectsBox(bbAviao)) {
            statusJogo.tirosSofridos++; // Atualiza automaticamente no GUI
            removerProjetilDaCena(projetil, listaProjeteis, i);
            continue;
        }

        // Limpa projéteis muito distantes
        if (projetil.position.distanceTo(aviao.position) > 300) {
            removerProjetilDaCena(projetil, listaProjeteis, i);
        }
    }
}

function verificarDanoNosInimigos() {
    for (let i = listaProjeteisPlayer.length - 1; i >= 0; i--) {
        const projetil = listaProjeteisPlayer[i];
        projetil.position.addScaledVector(projetil.userData.direcao, 5.0 + (velocidadeDeslocamento * 0.5));

        let atingiuInimigo = false;
        // Atualiza Box e expande artificialmente para criar uma Hitbox mais generosa
        bbProjetilAux.setFromObject(projetil).expandByScalar(2.5);

        for (let j = 0; j < listaInimigos.length; j++) {
            const inimigo = listaInimigos[j];
            if (inimigo.userData.morrendo) continue;

            bbInimigoAux.setFromObject(inimigo);

            if (bbProjetilAux.intersectsBox(bbInimigoAux)) {
                atingiuInimigo = true;
                inimigo.userData.morrendo = true; // Inicia animação de queda
                removerProjetilDaCena(projetil, listaProjeteisPlayer, i);
                break;
            }
        }

        if (atingiuInimigo) continue;

        // Limpa projéteis distantes
        if (projetil.position.distanceTo(aviao.position) > 300) {
            removerProjetilDaCena(projetil, listaProjeteisPlayer, i);
        }
    }
}

function animarAviao() {
    if (!animacaoAtiva) return;

    const pontoDestino = cuboMira.position;
    vetorInterpolacao.set(pontoDestino.x, pontoDestino.y, aviao.position.z);
    aviao.position.lerp(vetorInterpolacao, 0.02); 

    // EIXO X 
    const desvioLateral = pontoDestino.x - aviao.position.x; //calcula desvio

    // EIXO Y (SUBIDA E DESCIDA )
    // Subida do avião
    // Calcula a diferença vertical entre a mira e o avião
    const diferencaY = pontoDestino.y - aviao.position.y;

    // Multiplicado por 0.02 para a inclinação suave
    let desvioX = diferencaY * 0.02;

    // Trava para o bico não inclinar excessivamente
    if (desvioX > 0.3) desvioX = 0.3;
    if (desvioX < -0.3) desvioX = -0.3;

    // Somar ao -Math.PI/2 faz a frente do avião levantar quando a mira está acima
    const rotacaoAlvoX = (-Math.PI / 2) + desvioX;
    // Suaviza a rotação em X para acompanhar o movimento suavemente
    aviao.rotation.x += (rotacaoAlvoX - aviao.rotation.x) * 0.1;

    // EIXO Z (INCLINAÇÃO E ROTAÇÕES LATERAIS)
    let inclinacaoZ = desvioLateral * 0.015; // transforma o desvio em angulo de inclinação

    // Trava de segurança para o avião não virar
    if (inclinacaoZ > 0.35) inclinacaoZ = 0.35;
    if (inclinacaoZ < -0.35) inclinacaoZ = -0.35;

    // Aplica rotação de forma suave
    const rotacaoAlvoY = Math.PI + inclinacaoZ;
    aviao.rotation.y += (rotacaoAlvoY - aviao.rotation.y) * 0.1;

    const rotacaoAlvo = Math.PI + (pontoDestino.x - aviao.position.x) * 0.03;
    aviao.rotation.y += (rotacaoAlvo - aviao.rotation.y) * 0.1;

    // ANIMAÇÃO DA HÉLICE
    helice.rotation.y += Math.PI / 10;
}

function configurarNevoa() {
    const corBase = "rgb(175, 200, 220)";
    scene.fog = new THREE.Fog(corBase, 1, valorNevoa);
    renderer.setClearColor(corBase);
}

function atualizarTerreno() {
    const deslocamentoZ = camera.position.z - (comprimentoTerreno / 2) + 60;
    planoTerreno.position.z = deslocamentoZ;

    const arrayPosicoes = geometriaPlano.attributes.position.array;

    for (let linha = 0; linha <= segmentosTerreno; linha++) {
        for (let coluna = 0; coluna <= segmentosTerreno; coluna++) {
            const indiceOriginal = (linha * (segmentosTerreno + 1) + coluna) * 3;
            const coordenadaLocalX = arrayPosicoes[indiceOriginal];
            const coordenadaLocalY = arrayPosicoes[indiceOriginal + 1];

            const coordenadaMundoX = coordenadaLocalX;
            const coordenadaMundoZ = deslocamentoZ - coordenadaLocalY;

            arrayPosicoes[indiceOriginal + 2] = calcularAlturaTerreno(coordenadaMundoX, coordenadaMundoZ);
        }
    }

    geometriaPlano.attributes.position.needsUpdate = true;
    geometriaPlano.computeVertexNormals();
}

function gerarPosicoesArvores() {
    const distanciaMinima = 18; 
    const tentativasMaximas = 10000;
    let tentativas = 0;

    while (posicoesValidas.length < 1000 && tentativas < tentativasMaximas) {
        tentativas++;
        const x = (Math.random() - 0.5) * larguraTerreno;
        const z = (Math.random() - 0.5) * comprimentoTerreno;
        const novaPosicao = new THREE.Vector2(x, z);

        let muitoPerto = false;
        for (let i = 0; i < posicoesValidas.length; i++) {
            if (novaPosicao.distanceToSquared(posicoesValidas[i]) < (distanciaMinima * distanciaMinima)) {
                muitoPerto = true;
                break;
            }
        }
        if (!muitoPerto) {
            posicoesValidas.push(novaPosicao);
        }
    }

    // Posições livres
    indicesPosicoesLivres = Array.from({length: posicoesValidas.length}, (_, i) => i);
    
    // Embaralha a lista de índices 
    for (let i = indicesPosicoesLivres.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indicesPosicoesLivres[i], indicesPosicoesLivres[j]] = [indicesPosicoesLivres[j], indicesPosicoesLivres[i]];
    }
}

function reposicionarArvores() {
    for (let arvore of listaArvores) {
        if (arvore.position.z > camera.position.z + 30) {

            // Devolve o índice usado para a lista de disponíveis
            indicesPosicoesLivres.push(arvore.userData.indicePosicao);

            // Sorteia uma posição aleatória dos que estão livres
            const posicaoAleatoria = Math.floor(Math.random() * indicesPosicoesLivres.length);
            const novoIndice = indicesPosicoesLivres[posicaoAleatoria];

            // Remove esse índice da lista de livres para que nenhuma outra árvore pegue ele
            indicesPosicoesLivres.splice(posicaoAleatoria, 1);

            // Aplica a nova posição na árvore
            arvore.userData.indicePosicao = novoIndice;
            const novoPontoSorteado = posicoesValidas[novoIndice];

            arvore.position.x = novoPontoSorteado.x;
            arvore.position.z -= comprimentoTerreno; 
            arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);
        }
    }
}

// INIMIGOS
function criarInimigos(quantidade) {
    if (!modeloInimigoBase) return; // Segurança caso o modelo ainda não tenha carregado

    for (let i = 0; i < quantidade; i++) {
        // Clona o modelo carregado para cada inimigo
        const inimigo = modeloInimigoBase.clone();
        inimigo.userData = {morrendo: false, velocidadeX: 0};
        reposicionarInimigo(inimigo);
        scene.add(inimigo);
        listaInimigos.push(inimigo);
    }
}

function reposicionarInimigo(inimigo) {
    // Retorna para a escala inicial a cada respawn
    inimigo.scale.set(escalaOriginalInimigo, escalaOriginalInimigo, escalaOriginalInimigo);
    inimigo.rotation.set(0, Math.PI * 1.5, 0);
    inimigo.userData.morrendo = false;

    // Nascem bem longe no eixo Z para "surgirem" suavemente de dentro da névoa (fog)
    inimigo.position.z = aviao.position.z - 220 - (Math.random() * 80);

    // Posição X muito mais variada (podem nascer mais perto do centro ou mais nas pontas)
    const ladoDireito = Math.random() > 0.5;
    inimigo.position.x = ladoDireito ? (20 + Math.random() * 40) : (-20 - Math.random() * 40);

    // Velocidade aleatória, cruzando o campo de visão
    inimigo.userData.velocidadeX = (ladoDireito ? -1 : 1) * (0.1 + Math.random() * 0.25);

    // Altura aleatória aproveitando toda a área da mira (10 a 30)
    inimigo.position.y = 10 + Math.random() * 20;
}

function atualizarInimigos() {
    for (let inimigo of listaInimigos) {
        if (inimigo.userData.morrendo) {
            // Animação de Morte
            inimigo.scale.multiplyScalar(0.9);

            // Quando fica muito pequeno, renasce no fundo
            if (inimigo.scale.x < 0.1) {
                reposicionarInimigo(inimigo);
            }
        } else {
            // Movimento lateral contínuo
            inimigo.position.x += inimigo.userData.velocidadeX;

            // Reposiciona ao sair da tela pela lateral ou ficou pra trás da câmera
            if (inimigo.position.x > 80 || inimigo.position.x < -80 || inimigo.position.z > camera.position.z + 20) {
                reposicionarInimigo(inimigo);
            }
        }
    }
}

// FUNÇÕES DE TIRO
function atirarPlayer() {
    const geometriaTiro = new THREE.PlaneGeometry(1.5, 12.0); //Retangulo 
    const materialTiro = new THREE.MeshBasicMaterial({color: 0x00ff00, side: THREE.DoubleSide});
    const projetil = new THREE.Mesh(geometriaTiro, materialTiro);

    geometriaTiro.rotateX(Math.PI / 2); //rotação para o retangulo ficar deitado
    projetil.position.copy(aviao.position);

    // Calcula a direção em direção ao cubo de mira
    const direcao = new THREE.Vector3();
    direcao.subVectors(cuboMira.position, aviao.position).normalize();
    projetil.userData.direcao = direcao;

    projetil.lookAt(cuboMira.position);

    scene.add(projetil);
    listaProjeteisPlayer.push(projetil);
}

function atirarInimigos() {
    const geometriaTiro = new THREE.ConeGeometry(0.5, 3, 8); //cone
    geometriaTiro.rotateX(Math.PI / 2); // Deita o cone
    const materialTiro = new THREE.MeshBasicMaterial({color: 0xffff00});

    for (let inimigo of listaInimigos) {
        if (!inimigo.userData.morrendo && inimigo.position.z < (camera.position.z - 40)) {
            const projetil = new THREE.Mesh(geometriaTiro, materialTiro);
            projetil.position.copy(inimigo.position);

            const direcao = new THREE.Vector3();
            direcao.subVectors(aviao.position, inimigo.position).normalize();
            projetil.userData.direcao = direcao;
            projetil.lookAt(aviao.position);

            scene.add(projetil);
            listaProjeteis.push(projetil);
        }
    }
}

function removerProjetilDaCena(projetil, lista, index) {
    scene.remove(projetil);
    if (projetil.geometry) projetil.geometry.dispose();
    if (projetil.material) projetil.material.dispose();
    lista.splice(index, 1);
}
