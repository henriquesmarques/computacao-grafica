/**
 * NOTA SOBRE O SHADER DE TERRENO E ÁGUA:
 * A lógica de texturização procedural baseada em ruído (Value Noise / fBm)
 * e a manipulação dos shaders via 'onBeforeCompile' presentes neste arquivo
 * e no 'util.js' foram desenvolvidas de forma personalizada com o auxílio
 * de Inteligência Artificial (Google Gemini).
 */

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
    criarTexturaNormalProcedural,
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

// Monitora o download de todos os assets antes de iniciar o jogo
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    if (!itemsTotal) return;
    
    // Calcula a porcentagem da barra
    const porcentagem = Math.round((itemsLoaded / itemsTotal) * 100);
    const barraProgresso = document.getElementById("barra-progresso-loading");
    if (barraProgresso) {
        barraProgresso.style.width = porcentagem + "%";
    }

    // EXTRAI APENAS O NOME DO ARQUIVO ATUAL 
    const nomeArquivo = url.substring(url.lastIndexOf('/') + 1);

    // ATUALIZA O TEXTO NA TELA
    const textoArquivo = document.getElementById("arquivo-carregando");
    if (textoArquivo) {
        textoArquivo.innerText = `Carregando: ${nomeArquivo} (${itemsLoaded}/${itemsTotal})`;
    }
};

loadingManager.onLoad = function () {
    const textoArquivo = document.getElementById("arquivo-carregando");
    if (textoArquivo) {
        textoArquivo.innerText = "Todos os assets carregados com sucesso!";
    }
    
    const btnStart = document.getElementById("btn-start");
    if (btnStart) {
        btnStart.disabled = false;
        btnStart.classList.add("liberado"); // Ativa o visual brilhante indicando que o jogo está pronto
    }
};

// --- VARIÁVEIS GLOBAIS DA CENA ---
const scene = new THREE.Scene();
const renderer = initRenderer();
let animacaoAtiva = true;

// Controle de visibilidade e Névoa (Fog)
let porcentagemNevoa = 80; // Define o quão longe o jogador consegue ver
const maxNevoa = 250; // Distância limite de renderização para 100% de visibilidade

// Variáveis de Movimento e Tempo
let velocidadeDeslocamento = 0.6;
const vetorInterpolacao = new THREE.Vector3(); // Reutilizado no loop para evitar instanciar vetores novos
const relogio = new THREE.Clock(); // Mantém o tempo de jogo consistente independente do FPS
let limiteXDinamico;
const posicoesValidas = []; // Armazena as coordenadas iniciais para reaproveitamento (Object Pooling)

// --- VARIÁVEIS DE COLISÃO ---
// Caixas de colisão instanciadas apenas uma vez por performance
const bbAviao = new THREE.Box3();
const bbProjetilAux = new THREE.Box3();
const bbInimigoAux = new THREE.Box3();

// --- VARIÁVEIS DO SISTEMA DE COMBATE ---
const listaInimigos = [];
const listaProjeteis = [];
const listaProjeteisPlayer = [];
const listaItens = [];
let healthpack = null;

// Controle de cadência de tiros (Cooldowns)
let tempoDecorridoInimigos = 0;
const cadenciaTiroInimigos = 1;
let tempoDecorridoTiroPlayer = 0;
const cadenciaTiroPlayer = 0.15;
let mousePressionado = false;

// Configuração inicial da Névoa baseada na porcentagem
configurarNevoa(scene, renderer, maxNevoa * (porcentagemNevoa / 100));

// --- CÂMERA E UI ---
// Câmera posicionada acima do terreno para visão panorâmica
const camera = iniciarCamera(new THREE.Vector3(0, 55, -30));
scene.add(camera);

// Limita a área de movimentação lateral com base na largura da tela
limiteXDinamico = Math.max(25, Math.min(55, (window.innerWidth / window.innerHeight) * 24));

// Painel de FPS (Canto superior esquerdo)
const status = new Stats();
document.getElementById("webgl-output").appendChild(status.domElement);

let aviao = null;

// --- MIRA E INTERAÇÃO ---
const mira = criarMira(0x000000);
mira.position.set(0, 25, -65);
scene.add(mira);

// Oculta o cursor padrão do sistema operativo para imersão
document.body.style.cursor = 'none';
renderer.domElement.style.cursor = 'none';

// Status do jogador
const statusJogo = {
    tirosSofridos: 0,
    invencivel: false // Modo de depuração / god mode
};
const indicadorTexto = document.getElementById("texto-invencivel");

// Sistema de projeção para mapear o mouse (2D) em movimento tridimensional
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const paredeInvisivel = new THREE.Plane(new THREE.Vector3(0, 0, 1), 65); // Plano de fundo onde a mira desliza

configurarJanela();

// --- CONFIGURAÇÃO DO TERRENO ---
const comprimentoTerreno = 300;
const larguraTerreno = 650;
const segmentosTerreno = 128; // Define a resolução da malha para deformação procedural
const geometriaPlano = new THREE.PlaneGeometry(larguraTerreno, comprimentoTerreno, segmentosTerreno, segmentosTerreno);

// --- GERAÇÃO DA FLORESTA ---
const quantidadeArvores = 150;
const listaArvores = criarArvores(comprimentoTerreno, larguraTerreno, quantidadeArvores);

// Mapeia posições evitando sobreposição
gerarPosicoesArvores(posicoesValidas, quantidadeArvores, larguraTerreno, comprimentoTerreno);

listaArvores.forEach((arvore, indice) => {
    arvore.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Vincula a árvore a um slot de posição estática
    const indiceFixo = indice % posicoesValidas.length;
    arvore.userData.indicePosicao = indiceFixo;
    const pontoFixo = posicoesValidas[indiceFixo];

    // Posicionamento no terreno e cálculo da altura procedural correspondente
    arvore.position.x = pontoFixo.x;
    arvore.position.z = camera.position.z - (pontoFixo.y + (comprimentoTerreno / 2));
    arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);

    // Esconde as árvores que nasceriam submersas na água
    if (arvore.position.y <= -14.0) {
        arvore.visible = false;
    } else {
        arvore.visible = true;
    }

    scene.add(arvore);
});

// --- ILUMINAÇÃO ---
let luzDirecional;
const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(luzAmbiente);

// --- CARREGAMENTO DE MODELOS E SONS ---
let modeloInimigoBase = null;
const escalaOriginalInimigo = 5;

const trilhaSonora = new Audio('T3/assets/imperial.mp3');
trilhaSonora.loop = true;
trilhaSonora.volume = 0.1;
trilhaSonora.play();

const musicaTiro = new Audio('T3/assets/tiroaviao.mp3')
const musicaHealthPack = new Audio('T3/assets/bloco2.mp3')

const aviaoAtingido = new Audio('T3/assets/acertouAviao.mp3')
aviaoAtingido.volume = 0.05;

const inimigoMorrendo = new Audio('T3/assets/inimigomorrendo.mp3')
inimigoMorrendo.volume = 0.1;

const loader = new GLTFLoader(loadingManager);

function carregarInimigos() {
    loader.load('T3/assets/dronebranco.glb', function (gltf) {
        modeloInimigoBase = gltf.scene;

        modeloInimigoBase.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        // Inicia os primeiros inimigos e a interface assim que o modelo estiver pronto
        criarInimigos(scene, modeloInimigoBase, listaInimigos, 2, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao);
        construirInterface();
        renderizar();
    }, undefined, function (error) {
        console.error('Erro ao carregar o modelo do drone:', error);
    });
}

// Carrega o avião principal
loader.load('T3/assets/aviao.gltf', function (gltf) {
    const modeloAviao = gltf.scene;

    const textureLoader = new THREE.TextureLoader();
    const aviaoTexture = textureLoader.load('T3/assets/texturaMilitar.jpg'); 
    aviaoTexture.flipY = false; 

    modeloAviao.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = false; // Desabilitado para focar sombras no cenário
            child.receiveShadow = false;

            child.material = new THREE.MeshStandardMaterial({
                map: aviaoTexture,  
                roughness: 0.4,            // Controla o brilho da fuselagem
                metalness: 0.2             // Dá um leve aspecto metálico ao avião
            });
            child.material.needsUpdate = true;
        }
    });
    aviao = modeloAviao;
    aviao.scale.set(2, 2, 2);
    aviao.rotation.set(Math.PI / 2, Math.PI, 0);
    aviao.position.set(0, 25, -90);
    scene.add(aviao);

    // Carrega inimigos após o avião para garantir referências seguras de posicionamento
    carregarInimigos();
}, undefined, function (error) {
    console.error('Erro ao carregar o modelo do avião:', error);
});

// Carrega o modelo do item de cura
loader.load('T3/assets/healthpack.glb', function(gltf){
    healthpack = gltf.scene;
});

// --- SISTEMA DE TEXTURAS PROCEDURAIS ---
// Gera dinamicamente texturas baseadas em ruído matemático via Canvas
const texturaAreia = criarTexturaProcedural("#e4c63e", 0.15);
const texturaGrama = criarTexturaProcedural("#2c4617", 0.15);
const texturaRocha = criarTexturaProcedural("#4a4a4a", 0.15);
const texturaNeve  = criarTexturaProcedural("#ffffff", 0.15);

// Textura de Relevo (Normal Map) para interagir fisicamente com as luzes
const texturaNormal = criarTexturaNormalProcedural(3.0, 512, 64);

const materialPlano = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1.0, // Superfície fosca para as texturas de neve e terra
    metalness: 0.0, // Impede distorções de luz especular no terreno
    map: texturaAreia, // Base nativa para instanciar a estrutura de UV do material
    normalMap: texturaNormal,
    normalScale: new THREE.Vector2(0.08, 0.08) // Profundidade sutil do relevo
});

// Injeção GLSL (onBeforeCompile) para personalização do comportamento do Material Standard
materialPlano.onBeforeCompile = function (shader) {
    // Exporta as texturas procedurais para o escopo do shader de fragmento
    shader.uniforms.tAreia = { value: texturaAreia };
    shader.uniforms.tGrama = { value: texturaGrama };
    shader.uniforms.tRocha = { value: texturaRocha };
    shader.uniforms.tNeve = { value: texturaNeve };

    shader.vertexShader = `
        varying float vAlturaMundo;
        varying vec2 vWorldUv;
        ${shader.vertexShader}
    `.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        // Captura a altura local gerada pela deformação de ruído antes das matrizes de projeção
        vAlturaMundo = position.z; 
        
        // Mapeamento Planar em World Space: garante que a textura não deslize 
        // à medida que os vértices do terreno se deslocam simulando o movimento
        vec4 wPos = modelMatrix * vec4(position, 1.0);
        vWorldUv = wPos.xz * 0.04; 
        
        #ifdef USE_UV
            // Aplica uma escala maior para o Normal Map para criar granulação no relevo
            vUv = wPos.xz * 0.12; 
        #endif
        `
    );

    shader.fragmentShader = `
        uniform sampler2D tAreia;
        uniform sampler2D tGrama;
        uniform sampler2D tRocha;
        uniform sampler2D tNeve;
        varying float vAlturaMundo;
        varying vec2 vWorldUv;
        ${shader.fragmentShader}
    `.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        
        // Aplicação das texturas de bioma utilizando as coordenadas fixas calculadas no vertex shader
        vec4 cAreia = texture2D(tAreia, vWorldUv);
        vec4 cGrama = texture2D(tGrama, vWorldUv);
        vec4 cRocha = texture2D(tRocha, vWorldUv);
        vec4 cNeve  = texture2D(tNeve, vWorldUv);

        float altura = vAlturaMundo;

        // Limites de transição (blend) entre os biomas baseados em faixas de altura
        float blendGrama = smoothstep(-15.0, -8.0, altura); 
        float blendRocha = smoothstep(-2.0, 4.0, altura);    
        float blendNeve  = smoothstep(5.0, 8.0, altura);     

        // Interpolação sequencial das cores
        vec4 mixCor = mix(cAreia, cGrama, blendGrama);
        mixCor = mix(mixCor, cRocha, blendRocha);
        mixCor = mix(mixCor, cNeve, blendNeve);

        // Substitui a cor de reflexão base do material, preservando a iluminação computada pelo Normal Map
        diffuseColor = mixCor; 
        `
    );
};

const planoTerreno = new THREE.Mesh(geometriaPlano, materialPlano);
planoTerreno.rotation.x = -Math.PI / 2;
planoTerreno.receiveShadow = true;
scene.add(planoTerreno);

// --- PLANO DE ÁGUA ---
// Criação da textura procedural para a água reforçada (aumentada variação de cor para 0.45)
const texturaAgua = criarTexturaProcedural("#1ca3ec", 0.45);
texturaAgua.wrapS = THREE.RepeatWrapping;
texturaAgua.wrapT = THREE.RepeatWrapping;

const aguaUniforms = {
    tempo: { value: 0.0 },
    corAgua: { value: new THREE.Color("#1ca3ec") },
    corNevoa: { value: new THREE.Color("rgb(175, 200, 220)") },
    distanciaNevoa: { value: maxNevoa * (porcentagemNevoa / 100) },
    tAgua: { value: texturaAgua } // Adicionado a textura procedural como uniform
};

const geometriaAgua = new THREE.PlaneGeometry(larguraTerreno, comprimentoTerreno, 64, 64);

// Injeta a textura procedural no fragment shader nativo substituindo a cor sólida
const fragmentShaderTexturizado = shaderAguaFragment
    .replace(
        'uniform float distanciaNevoa;',
        'uniform float distanciaNevoa;\nuniform sampler2D tAgua;'
    )
    .replace(
        'vec3 corFinal = mix(corAgua, vec3(0.9, 0.95, 1.0), reflexo * 0.3);',
        `
    // Amostra a textura procedural gerada com escala UV ajustada (de 15.0 para 8.0) para padrões maiores
    vec4 corTextura = texture2D(tAgua, vUv * 8.0);
    // Mistura a textura base reforçada com o reflexo animado das ondas (aumentado para 0.4)
    vec3 corFinal = mix(corTextura.rgb, vec3(0.85, 0.95, 1.0), reflexo * 0.4);`
    );

const materialAgua = new THREE.ShaderMaterial({
    uniforms: aguaUniforms,
    vertexShader: shaderAguaVertex,
    fragmentShader: fragmentShaderTexturizado, // Usando o shader texturizado
    transparent: true
});

const malhaAgua = new THREE.Mesh(geometriaAgua, materialAgua);
malhaAgua.rotation.x = -Math.PI / 2;
malhaAgua.position.y = -15.5; // Nível fixo abaixo da área de areia do terreno
scene.add(malhaAgua);

// --- LOOP PRINCIPAL DO JOGO ---
function renderizar() {
    requestAnimationFrame(renderizar);
    const deltaTime = relogio.getDelta();

    if (animacaoAtiva) {
        // Atualiza a posição da mira, exceto se estiver em um dispositivo touch (onde é gerida pelo joystick)
        if (!('ontouchstart' in window)) {
            atualizarMira(raycaster, mouse, camera, paredeInvisivel, mira, limiteXDinamico);
        }
        atualizarCamera(aviao, mira, camera, paredeInvisivel, velocidadeDeslocamento);

        // Atualização da física visual e deslocamento contínuo
        animarAviao(animacaoAtiva, aviao, mira, velocidadeDeslocamento, vetorInterpolacao);
        atualizarTerreno(planoTerreno, geometriaPlano, camera, comprimentoTerreno, segmentosTerreno);
        atualizarAgua(malhaAgua, camera, comprimentoTerreno);
        reposicionarArvores(listaArvores, posicoesValidas, camera, comprimentoTerreno);
        atualizarInimigos(listaInimigos, camera, limiteXDinamico, escalaOriginalInimigo, velocidadeDeslocamento, aviao);

        // Anima as ondas e reflexos da água dinamicamente
        aguaUniforms.tempo.value += deltaTime;

        luzDirecional = gerenciarIluminacao(scene, camera, luzDirecional);

        // Sistema de Combate e Entidades Dinâmicas
        gerenciarDisparos(deltaTime);
        gerenciarColisoes();

        // 0.1% de chance por frame de spawnar um kit de cura
        if (Math.random() < 0.001) {
            criaHealthPack(scene, limiteXDinamico, listaItens, aviao, statusJogo, healthpack);
        }
        controlarHealthPacks(scene, listaItens, aviao, statusJogo, musicaHealthPack);
    }

    status.update();
    renderer.render(scene, camera);
}

// --- INTERFACE GUI ---
function construirInterface() {
    const controlos = new function () {
        this.nevoaPerc = porcentagemNevoa;
        this.alterarNevoa = function () {
            porcentagemNevoa = this.nevoaPerc;
            const novaDistancia = maxNevoa * (porcentagemNevoa / 100);

            // Atualiza o fog global do renderer
            scene.fog.far = novaDistancia;

            // Sincroniza a distância da névoa no material GLSL customizado da água
            malhaAgua.material.uniforms.distanciaNevoa.value = novaDistancia;
        };
    };

    const gui = new GUI();
    gui.add(controlos, 'nevoaPerc', 50, 100)
        .onChange(function () {
            controlos.alterarNevoa()
        })
        .name("Névoa (%)");
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
    // Gerenciador de cadência para evitar flood de tiros do jogador
    if (mousePressionado) {
        tempoDecorridoTiroPlayer += deltaTime;
        if (tempoDecorridoTiroPlayer >= cadenciaTiroPlayer) {
            atirarPlayer(scene, aviao, mira, listaProjeteisPlayer);
            tempoDecorridoTiroPlayer = 0;
        }
    }

    // IA básica dos inimigos para disparo baseado em intervalo de tempo
    tempoDecorridoInimigos += deltaTime;
    if (tempoDecorridoInimigos >= cadenciaTiroInimigos) {
        atirarInimigos(scene, listaInimigos, aviao, camera, listaProjeteis);
        tempoDecorridoInimigos = 0;
    }
}

function gerenciarColisoes() {
    // Sincroniza a caixa delimitadora principal com a posição e rotação atuais do avião
    bbAviao.setFromObject(aviao);

    // Validação de interseção de Bounding Boxes
    verificarDanoNoPlayer(scene, listaProjeteis, aviao, bbAviao, bbProjetilAux, statusJogo, velocidadeDeslocamento, aviaoAtingido);
    verificarDanoNosInimigos(scene, listaProjeteisPlayer, listaInimigos, aviao, bbProjetilAux, bbInimigoAux, velocidadeDeslocamento, inimigoMorrendo);

    barraDeVida(statusJogo, animacaoAtiva);
}

// --- EVENTOS E CONTROLES (I/O) ---
function configurarJanela() {
    window.addEventListener('resize', function () {
        onWindowResize(camera, renderer)
    }, false);

    // Atualiza a mira
    window.addEventListener('mousemove', function (event) {
        // Conversão das coordenadas de tela (pixels) para NDC (Normalized Device Coordinates: -1 a +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }, false);

    window.addEventListener('mousedown', function (event) {
        if (!animacaoAtiva) {
            retomarSimulacao();
        } else {
            if (event.button === 0){
                mousePressionado = true; // Ativa flag de disparo contínuo

                if(typeof musicaTiro !== "undefined"){
                    // Reprodução contínua controlada do efeito sonoro
                    const reproduzirDisparo = () => {
                        if (!mousePressionado || !animacaoAtiva) return;

                        const somAtual = musicaTiro.cloneNode();
                        somAtual.volume = 0.15;
                        somAtual.play().catch(erro => console.log(erro));

                        somAtual.addEventListener('ended', () => somAtual.remove());
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

    // Atalhos do teclado para debug e controle
    window.addEventListener('keydown', function (event) {
        switch (event.key) {
            case '1': velocidadeDeslocamento = 0.6; break; // Velocidade lenta
            case '2': velocidadeDeslocamento = 1.2; break; // Velocidade moderada
            case '3': velocidadeDeslocamento = 1.8; break; // Velocidade rápida
            case 'Escape': pausarSimulacao(); break;
            case 'g':
            case 'G':
                statusJogo.invencivel = !statusJogo.invencivel; // God Mode Toggle
                if (indicadorTexto) {
                    if (statusJogo.invencivel) {
                        indicadorTexto.style.display = "block";
                    } else {
                        indicadorTexto.style.display = "none";
                    }
                }
                break;
            case 'S':
            case 's':
                if(trilhaSonora.paused){
                    trilhaSonora.play();
                }else{
                    trilhaSonora.pause();
                }
                break;
        }
    }, false);

    // Reposicionamento responsivo
    window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Recálculo trigonométrico dos limites horizontais baseando-se no FOV (Field Of View)
        const aspecto = camera.aspect;
        const fovRadiano = (camera.fov * Math.PI) / 180;
        const distanciaCameraAviao = Math.abs(camera.position.z - aviao.position.z);
        limiteXDinamico = Math.tan(fovRadiano / 2) * distanciaCameraAviao * aspecto;

        if (typeof onWindowResize === 'function') {
            onWindowResize(camera, renderer);
        }
    }, false);

    // --- CONTROLES DE MENUS E HUD ---
    const botaoReiniciar = document.getElementById("btn-reiniciar");
    document.getElementById("btn-reiniciar").addEventListener("click", function(event) {
        event.preventDefault();
        statusJogo.tirosSofridos = 0;
        aviao.visible = true;
        reiniciarSimulacao();
        relogio.start();
        document.getElementById("tela-game-over").style.display = "none";
    });

    const botaoIniciar = document.getElementById("btn-start");
    if (botaoIniciar) {
        botaoIniciar.addEventListener("click", function(event) {
            event.preventDefault();
            relogio.start();
            retomarSimulacao();
            document.getElementById("tela-carregamento").style.display = "none";
        });
    }

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Erro ao ativar Fullscreen: ${err.message}`);
                });
                btnFullscreen.innerText = "📺 JANELA";
            } else {
                document.exitFullscreen();
                btnFullscreen.innerText = "📺 FULLSCREEN";
            }
        });
    }

    const btnMusica = document.getElementById('btn-musica');
    if (btnMusica) {
        btnMusica.addEventListener('click', () => {
            if (typeof trilhaSonora !== 'undefined') {
                if (trilhaSonora.paused) {
                    trilhaSonora.play();
                    btnMusica.innerText = "🎵 MÚSICA: ON";
                    btnMusica.style.background = "rgba(30, 60, 30, 0.6)";
                } else {
                    trilhaSonora.pause();
                    btnMusica.innerText = "🔇 MÚSICA: OFF";
                    btnMusica.style.background = "rgba(80, 20, 20, 0.6)";
                }
            }
        });
    }

    // Biblioteca NippleJS para emulação de direcional (D-Pad/Joystick) em dispositivos móveis
    const joystickZone = document.getElementById('joystick-zone');
    if(joystickZone){
        const manager = nipplejs.create({
            zone:joystickZone,
            mode:'static',
            position:{
                left:'60px',
                bottom:'60px'
            },
            color:'#85ff8d',
            size:100
        });
        manager.on('move',function(evt,data){
            if(!data.vector) return;
            const velocidade = 0.8;
            mira.position.x += data.vector.x * velocidade;
            mira.position.y += data.vector.y * velocidade;
            // Prende a mira às bordas computadas anteriormente
            mira.position.x = Math.max(-limiteXDinamico, Math.min(limiteXDinamico,mira.position.x));
            mira.position.y = Math.max(35,Math.min(65,mira.position.y));
            mousePressionado = true;
        });
        manager.on('end',function(){
            mousePressionado = false;
        });
    }
}

// --- MECÂNICAS DE JOGO ---
function barraDeVida(){
    const maxTiros = 20;
    const tiros = statusJogo.tirosSofridos;

    // Converte os acertos num formato percentual para manipular a barra CSS
    const porcentagemVida = Math.max(0, ((maxTiros - tiros) / maxTiros) * 100);

    const elementoBarra = document.getElementById("barra-preenchimento");
    if (elementoBarra) {
        elementoBarra.style.width = porcentagemVida + "%";
    }

    if (tiros >= maxTiros && animacaoAtiva) {
        dispararGameOver();
    }
}

function dispararGameOver() {
    // Esconde as instâncias visuais principais ao ser abatido
    aviao.visible = false;
    mira.visible = false;
    mouse.visible = true;

    pausarSimulacao();
    const tela = document.getElementById("tela-game-over");
    if (tela) {
        tela.style.display = "flex";
    }

    // Calcula pontuação baseada na sobrevivência
    const segundosTotais = Math.floor(relogio.getElapsedTime());
    const tempoFormatado = formatarTempo(segundosTotais);

    const hudTiros = document.getElementById("hud-valor-tiros");
    if (hudTiros) {
        hudTiros.innerText = statusJogo.tirosSofridos;
    }

    const hudTempo = document.getElementById("hud-valor-tempo");
    if (hudTempo) {
        hudTempo.innerText = tempoFormatado;
    }
}

function formatarTempo(segundosTotais) {
    // Lógica para formatação HH:MM:SS
    const horas = Math.floor(segundosTotais / 3600);
    const minutos = Math.floor((segundosTotais % 3600) / 60);
    const segundos = segundosTotais % 60;

    const h = horas.toString().padStart(2, '0');
    const m = minutos.toString().padStart(2, '0');
    const s = segundos.toString().padStart(2, '0');

    return `${h}:${m}:${s}`;
}

function reiniciarSimulacao() {
    // Restaura as métricas de vida e tempo para a próxima sessão
    statusJogo.tirosSofridos = 0;
    relogio.start();

    // Alinhamento de inicialização do Player
    if (aviao) {
        aviao.position.set(0, 25, -90);
        aviao.rotation.set(Math.PI / 2, Math.PI, 0);
        aviao.visible = true;
    }

    if (mira) {
        mira.position.set(0, 25, -65);
    }

    camera.position.set(0, 55, -30);
    camera.lookAt(0, 55, -60);

    // Faz a varredura da cena para limpar projéteis órfãos da sessão passada
    for (let i = listaProjeteis.length - 1; i >= 0; i--) {
        scene.remove(listaProjeteis[i]);
    }
    listaProjeteis.length = 0;

    for (let i = listaProjeteisPlayer.length - 1; i >= 0; i--) {
        scene.remove(listaProjeteisPlayer[i]);
    }
    listaProjeteisPlayer.length = 0;

    for (let i = listaItens.length - 1; i >= 0; i--) {
        scene.remove(listaItens[i]);
    }
    listaItens.length = 0;

    // Reseta as instâncias no pool de árvores
    listaArvores.forEach((arvore, indice) => {
        const indiceFixo = indice % posicoesValidas.length;
        const pontoFixo = posicoesValidas[indiceFixo];

        arvore.position.x = pontoFixo.x;
        arvore.position.z = camera.position.z - (pontoFixo.y + (comprimentoTerreno / 2));
        arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);

        if (arvore.position.y <= -14.0) {
            arvore.visible = false;
        } else {
            arvore.visible = true;
        }
    });

    retomarSimulacao();
    document.getElementById("tela-game-over").style.display = "none";
}