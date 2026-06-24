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

// GERENCIADOR DE CARREGAMENTO 
const loadingManager = new THREE.LoadingManager();

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    if (!itemsTotal) return;
    const porcentagem = Math.floor((itemsLoaded / itemsTotal) * 100);
    
    const barraProgresso = document.getElementById('barra-progresso-loading');
    const textoPorcentagem = document.getElementById('texto-porcentagem');
    
    if (barraProgresso) barraProgresso.style.width = porcentagem + '%';
    if (textoPorcentagem) textoPorcentagem.innerText = porcentagem + '%';
};

loadingManager.onLoad = function () {
    pausarSimulacao();
    const textoPorcentagem = document.getElementById('texto-porcentagem');
    const btnStart = document.getElementById('btn-start');
    
    if (btnStart) {
        btnStart.disabled = false;
        btnStart.classList.add('liberado'); // Ativa o visual azul brilhante do CSS
    }
};

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
const trilhaSonora = new Audio('T3/assets/imperial.mp3');
trilhaSonora.loop = true;  // Faz a música recomeçar automaticamente
trilhaSonora.volume = 0.1;
trilhaSonora.play();

// Som do Tiro Player
const musicaTiro = new Audio('T3/assets/tiroaviao.mp3')

// Som de Captura de Health Pack
const musicaHealthPack = new Audio('T3/assets/bloco2.mp3')

// Som Avião Atingido
const aviaoAtingido = new Audio('T3/assets/acertouAviao.mp3')
aviaoAtingido.volume = 0.05;

// Som Inimigo Morrendo
const inimigoMorrendo = new Audio('T3/assets/inimigomorrendo.mp3')
inimigoMorrendo.volume = 0.1;

// Healt Pack
let healthpack = null;
const listaItens = []; 

// Importações 
const loader = new GLTFLoader(loadingManager);
function carregarInimigos() {
   loader.load('T3/assets/dronebranco.glb', function (gltf) {
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

loader.load('T3/assets/aviao.gltf', function (gltf) {
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

loader.load('T3/assets/healthpack.glb', function(gltf){
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
        atualizarAgua(malhaAgua, camera, comprimentoTerreno);
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

    //gui.add(statusJogo, 'tirosSofridos').name("Tiros Sofridos").listen();
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

        // Faz o avião reaparecer na tela
        aviao.visible = true;

        // Retoma a simulação
        reiniciarSimulacao();

        // Reinicia tempo
        relogio.start();

        // Esconde a janela de Game Over mudando o display de volta para none
        document.getElementById("tela-game-over").style.display = "none";
    });

    const botaoIniciar = document.getElementById("btn-start");
    if (botaoIniciar) {
        botaoIniciar.addEventListener("click", function(event) {
            event.preventDefault();

            // Reinicia o cronômetro para o tempo de voo começar do zero
            relogio.start();

            // Retoma a simulação (faz o jogo rodar)
            retomarSimulacao();

            // Esconde a janela de Carregamento mudando o display para none
            document.getElementById("tela-carregamento").style.display = "none";
        });
    }
    // VERSÃO MOBILE 
    // Botão Fullscreen
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
    // Botão de Trilha Sonora
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
                    btnMusica.style.background = "rgba(80, 20, 20, 0.6)"; // Fica vermelho se pausar
                }
            }
        });
    }
    // Inicialização do Joystick Virtual 
    const joystickZone = document.getElementById('joystick-zone');
    if (joystickZone) {
        const manager = nipplejs.create({
            zone: joystickZone,
            mode: 'static',
            position: { left: '60px', bottom: '60px' },
            color: '#85ff8d',
            size: 100
        });

        // Movimentação da Mira pelo Joystick + Tiro Automático
        // Movimentação da Mira pelo Joystick + Tiro Automático
        manager.on('move', function (evt, data) {
            if (!data.vector) return;

            const sensibilidade = 0.5; 
            
            mira.position.x += data.vector.x * sensibilidade;
            mira.position.y += data.vector.y * sensibilidade;

            mira.position.x = Math.max(-20, Math.min(20, mira.position.x));
            mira.position.y = Math.max(4, Math.min(25, mira.position.y));

            if (typeof atirarPlayer === 'function') {
                atirarPlayer();
            }
        });
    }
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

    // 💡 1. PEGA O TEMPO EM SEGUNDOS E FORMATA
    const segundosTotais = Math.floor(relogio.getElapsedTime());
    const tempoFormatado = formatarTempo(segundosTotais);

    // 💡 2. INJETA OS VALORES NO SEU HTML ATUAL
    const hudTiros = document.getElementById("hud-valor-tiros");
    if (hudTiros) {
        hudTiros.innerText = statusJogo.tirosSofridos;
    }

    const hudTempo = document.getElementById("hud-valor-tempo");
    if (hudTempo) {
        hudTempo.innerText = tempoFormatado;
    }

    tela = document.getElementById("tela-game-over");
    if (tela) {
        tela.style.display = "flex";
    }
}

// Função auxiliar para formatar os segundos em formato de relógio militar
function formatarTempo(segundosTotais) {
    const horas = Math.floor(segundosTotais / 3600);
    const minutos = Math.floor((segundosTotais % 3600) / 60);
    const segundos = segundosTotais % 60;

    // Garante que números menores que 10 ganhem um "0" na frente (ex: 05 em vez de 5)
    const h = horas.toString().padStart(2, '0');
    const m = minutos.toString().padStart(2, '0');
    const s = segundos.toString().padStart(2, '0');

    return `${h}:${m}:${s}`;
}

function reiniciarSimulacao() {
    // Reinicia os dados de controle e o relógio
    statusJogo.tirosSofridos = 0;
    relogio.start(); 

    // Teleporta o avião e a mira de volta para a largada
    if (aviao) {
        aviao.position.set(0, 10, -90);
        aviao.rotation.set(Math.PI / 2, Math.PI, 0); // Zera inclinações de bico e asa
        aviao.visible = true;
    }
    
    if (mira) {
        mira.position.set(0, 10, -65);
    }

    // Teleporta a câmera de volta para a posição inicial
    camera.position.set(0, 25, -30);
    camera.lookAt(0, 25, -60);

    // Limpa os lasers dos inimigos que ficaram voando
    for (let i = listaProjeteis.length - 1; i >= 0; i--) {
        scene.remove(listaProjeteis[i]);
    }
    listaProjeteis.length = 0; 

    // Limpa os lasers do player que ficaram voando
    for (let i = listaProjeteisPlayer.length - 1; i >= 0; i--) {
        scene.remove(listaProjeteisPlayer[i]);
    }
    listaProjeteisPlayer.length = 0; 

    // Remove os Health Packs antigos do mapa
    for (let i = listaItens.length - 1; i >= 0; i--) {
        scene.remove(listaItens[i]);
    }
    listaItens.length = 0;

    // Lista de Arvores
    listaArvores.forEach((arvore, indice) => {
        // Pega o ponto estático correspondente ao índice da árvore
        const indiceFixo = indice % posicoesValidas.length;
        const pontoFixo = posicoesValidas[indiceFixo];

        // Posiciona exatamente igual à primeira vez que o jogo carregou
        arvore.position.x = pontoFixo.x;
        arvore.position.z = camera.position.z - (pontoFixo.y + (comprimentoTerreno / 2));
        arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);
    });

    // Despausa o motor do jogo e esconde o menu
    retomarSimulacao();
    document.getElementById("tela-game-over").style.display = "none";
}