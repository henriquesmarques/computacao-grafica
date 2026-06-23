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
    criarMira,
    criarTexturaProcedural,
    shaderAguaVertex,
    shaderAguaFragment
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
    verificarDanoNosInimigos,
    criaHealthPack,
    controlarHealthPacks,
    atualizarAgua
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

// Modo invencibilidade
const statusJogo = {
    tirosSofridos: 0,
    invencivel: false // Começa desativado
};
const indicadorTexto = document.getElementById("texto-invencivel");


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

// --- TRABALHO 3 ---

// Adicionando Trilha Sonora ao Jogo
const trilhaSonora = new Audio('./assets/imperial.mp3');
trilhaSonora.loop = true;  // Faz a música recomeçar automaticamente
trilhaSonora.volume = 0.1;
trilhaSonora.play();

// Som do Tiro Player
const musicaTiro = new Audio('./assets/tiroaviao.mp3')

// Som de Captura de Health Pack
const musicaHealthPack = new Audio('./assets/bloco2.mp3')

// Som Avião Atingido
const aviaoAtingido = new Audio('./assets/acertouAviao.mp3')
aviaoAtingido.volume = 0.05;

// Som Inimigo Morrendo
const inimigoMorrendo = new Audio('./assets/inimigomorrendo.mp3')
inimigoMorrendo.volume = 0.1;

// Healt Pack
let healthpack = null;
const listaItens = []; 

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
           child.castShadow = false;
           child.receiveShadow = false;
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

loader.load('./assets/healthpack.glb', function(gltf){
    let vida = gltf.scene;
    healthpack = vida;
});

// Texturas geradas via Canvas (Ruído ajustado para 0 para ser uma cor suave e remover o efeito pontilhado)
const texturaAreia = criarTexturaProcedural("#e4c63e", 0);
const texturaGrama = criarTexturaProcedural("#2c4617", 0);
const texturaRocha = criarTexturaProcedural("#2d2c2c", 0);
const texturaNeve  = criarTexturaProcedural("#ffffff", 0);

const materialPlano = new THREE.MeshLambertMaterial({color: "white"});

// O onBeforeCompile injeta as funções GLSL e mantém a iluminação e sombra do Lambert nativo!
materialPlano.onBeforeCompile = function (shader) {
    shader.uniforms.tAreia = { value: texturaAreia };
    shader.uniforms.tGrama = { value: texturaGrama };
    shader.uniforms.tRocha = { value: texturaRocha };
    shader.uniforms.tNeve = { value: texturaNeve };

    shader.vertexShader = `
        varying float vAlturaMundo;
        varying vec2 vMyUv;
        ${shader.vertexShader}
    `.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // Lemos a altura exata que foi computada no plano localmente (Eixo Z antes da rotação)
        vAlturaMundo = position.z; 
        
        // Repetição da textura (mesmo suave, garantimos um mapeamento de UV simples)
        vMyUv = uv * 4.0; `
    );

    shader.fragmentShader = `
        uniform sampler2D tAreia;
        uniform sampler2D tGrama;
        uniform sampler2D tRocha;
        uniform sampler2D tNeve;
        varying float vAlturaMundo;
        varying vec2 vMyUv;
        ${shader.fragmentShader}
    `.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec4 cAreia = texture2D(tAreia, vMyUv);
        vec4 cGrama = texture2D(tGrama, vMyUv);
        vec4 cRocha = texture2D(tRocha, vMyUv);
        vec4 cNeve  = texture2D(tNeve, vMyUv);

        float altura = vAlturaMundo;

        // Limites de blending EXATOS mapeados para o terreno (De -25 até +10)
        // Valores <= -15.0 são pura Areia
        float blendGrama = smoothstep(-15.0, -10.0, altura); // De -15 para -10 a Areia vira Grama
        float blendRocha = smoothstep(-2.0, 3.0, altura);    // De -2 para 3 a Grama vira Rocha (Pés das montanhas)
        float blendNeve  = smoothstep(6.0, 8.0, altura);     // De 6 para 8 a Rocha vira Neve (Somente nos Picos mais altos)

        vec4 mixCor = mix(cAreia, cGrama, blendGrama);
        mixCor = mix(mixCor, cRocha, blendRocha);
        mixCor = mix(mixCor, cNeve, blendNeve);

        diffuseColor = mixCor; // Substitui a cor original pelas texturas procedurais baseadas em altura
        `
    );
};

const planoTerreno = new THREE.Mesh(geometriaPlano, materialPlano);
planoTerreno.rotation.x = -Math.PI / 2;
planoTerreno.receiveShadow = true;
scene.add(planoTerreno);

// --- Plano de Água com Shaders ---
const aguaUniforms = {
    tempo: { value: 0.0 },
    corAgua: { value: new THREE.Color("#1ca3ec") },
    corNevoa: { value: new THREE.Color("rgb(175, 200, 220)") },
    distanciaNevoa: { value: valorNevoa }
};

const geometriaAgua = new THREE.PlaneGeometry(larguraTerreno, comprimentoTerreno, 64, 64);
const materialAgua = new THREE.ShaderMaterial({
    uniforms: aguaUniforms,
    vertexShader: shaderAguaVertex,
    fragmentShader: shaderAguaFragment,
    transparent: true
});

const malhaAgua = new THREE.Mesh(geometriaAgua, materialAgua);
malhaAgua.rotation.x = -Math.PI / 2;
malhaAgua.position.y = -15.5; // Fica exatamente no limite final da areia
scene.add(malhaAgua);


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

        //Health Pack
        if (Math.random() < 0.001) { 
            criaHealthPack(scene, limiteXDinamico, listaItens, aviao, statusJogo, healthpack);
        }
        controlarHealthPacks(scene, listaItens, aviao, statusJogo, musicaHealthPack);
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
    trilhaSonora.pause(); 
}

function retomarSimulacao() {
    animacaoAtiva = true;
    document.body.style.cursor = 'none';
    renderer.domElement.style.cursor = 'none';
    mira.visible = true;
    trilhaSonora.play();
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
    verificarDanoNoPlayer(scene, listaProjeteis, aviao, bbAviao, bbProjetilAux, statusJogo, velocidadeDeslocamento, aviaoAtingido);
    verificarDanoNosInimigos(scene, listaProjeteisPlayer, listaInimigos, aviao, bbProjetilAux, bbInimigoAux, velocidadeDeslocamento, inimigoMorrendo);

    barraDeVida(statusJogo, animacaoAtiva);
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
            if (event.button === 0){
                mousePressionado = true; // Botão esquerdo atira

                if(typeof musicaTiro !== "undefined"){
                    // Disparo continuo
                    const reproduzirDisparo = () => {
                        // Interrompe o som quando para de pressionar no mouse
                        if (!mousePressionado || !animacaoAtiva) return;
                        
                        // Repete o audio a uma cadencia de 0.15s quando pressionado
                        const somAtual = musicaTiro.cloneNode();
                        somAtual.volume = 0.15; // Volume calibrado para rajadas rápidas
                        somAtual.play().catch(erro => console.log(erro));
                        
                
                        somAtual.addEventListener('ended', () => somAtual.remove());
                        
                        // Mapeia o proximo tiro para 15s
                        setTimeout(reproduzirDisparo, 150);
                    };
                    reproduzirDisparo();
                }
            } 
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
            case 'g':
                statusJogo.invencivel = !statusJogo.invencivel;
                if (indicadorTexto) {
                    if (statusJogo.invencivel) {
                        indicadorTexto.style.display = "block"; // Mostra o texto no canto direito
                    } else {
                        indicadorTexto.style.display = "none";  // Esconde o texto ao voltar ao normal
                    }
                }
                break;
            case 'G':
                statusJogo.invencivel = !statusJogo.invencivel;
                if (indicadorTexto) {
                    if (statusJogo.invencivel) {
                        indicadorTexto.style.display = "block"; // Mostra o texto no canto direito
                    } else {
                        indicadorTexto.style.display = "none";  // Esconde o texto ao voltar ao normal
                    }
                }
                break;
            case 'S':
                if(trilhaSonora.paused){
                    trilhaSonora.play();
                }else{
                    trilhaSonora.pause();
                }
                break;
            case 's':
                if(trilhaSonora.paused){
                    trilhaSonora.play();
                }else{
                    trilhaSonora.pause();
                }
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

    // Botão de Reiniciar
    const botaoReiniciar = document.getElementById("btn-reiniciar");
    document.getElementById("btn-reiniciar").addEventListener("click", function(event) {
        event.preventDefault();

        // Reinicia o contador de tiros 
        statusJogo.tirosSofridos = 0;

        //Faz o avião reaparecer na tela
        aviao.visible = true;

        //Retoma a simulação
        retomarSimulacao();

        // Esconde a janela de Game Over mudando o display de volta para none
        document.getElementById("tela-game-over").style.display = "none";
    });
}

function barraDeVida(){
    const maxTiros = 20; // Definimos o limite estrito de 20 tiros aqui
    const tiros = statusJogo.tirosSofridos;
    
    // Calcula a porcentagem restante de vida com base nos tiros sofridos
    const porcentagemVida = Math.max(0, ((maxTiros - tiros) / maxTiros) * 100);
    
    // Altera dinamicamente a largura (width) da barra vermelha no estiloJogo.css
    const elementoBarra = document.getElementById("barra-preenchimento");
    if (elementoBarra) {
        elementoBarra.style.width = porcentagemVida + "%";
    }

    if (tiros >= maxTiros && animacaoAtiva) {
        dispararGameOver(); 
    }
}

function dispararGameOver() {
    aviao.visible = false;
    mira.visible = false;
    mouse.visible = true;

    pausarSimulacao();
    const tela = document.getElementById("tela-game-over");
    if (tela) {
        tela.style.display = "flex";
    }
}
