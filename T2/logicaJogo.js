import * as THREE from "three";
import { calcularAlturaTerreno } from "./util.js";
import {GLTFLoader} from '../build/jsm/loaders/GLTFLoader.js';

// NÉVOA (Fog)
export function configurarNevoa(scene, renderer, valorNevoa) {
    const corBase = "rgb(175, 200, 220)";
    scene.fog = new THREE.Fog(corBase, 1, valorNevoa);
    renderer.setClearColor(corBase);
}

export function gerenciarIluminacao(scene, camera, luzDirecional) {
    // Cria as luzes apenas na primeira execução
    if (!luzDirecional) {
        luzDirecional = new THREE.DirectionalLight(0xffffff, 2.5);
        luzDirecional.castShadow = true;

        // Otimização de resolução
        luzDirecional.shadow.mapSize.width = 1700;
        luzDirecional.shadow.mapSize.height = 1700;

        // Evita artefatos e sombras piscando
        luzDirecional.shadow.bias = -0.0001;

        // Pegamos a distância do fog uma única vez para configurar o tamanho fixo da caixa
        const distanciaFog = scene.fog ? scene.fog.far : 200;

        luzDirecional.shadow.camera.near = 0.5;
        // Esticamos bem para frente para cobrir o fundo da névoa
        luzDirecional.shadow.camera.far = distanciaFog + 150;

        // Tornamos o cubo de projeção largo o suficiente de primeira
        const d = distanciaFog * 1.2;
        luzDirecional.shadow.camera.left = -d;
        luzDirecional.shadow.camera.right = d;
        luzDirecional.shadow.camera.top = d;
        luzDirecional.shadow.camera.bottom = -d;

        // Atualiza a matriz apenas esta vez! Nunca mais no loop.
        luzDirecional.shadow.camera.updateProjectionMatrix();

        // Adiciona tudo na cena
        scene.add(luzDirecional);
        scene.add(luzDirecional.target);
    }

    luzDirecional.position.set(camera.position.x + 40, 60, camera.position.z - 30);
    luzDirecional.target.position.set(camera.position.x, 0, camera.position.z - 30);

    return luzDirecional;
}

export function atualizarMira(raycaster, mouse, camera, paredeInvisivel, mira, limiteXDinamico) {
    // Converte a posição 2D do mouse para um alvo 3D na parede invisível
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(paredeInvisivel, mira.position);

    // Limitação espacial da mira na tela
    if (mira.position.y < 10) mira.position.y = 10;
    if (mira.position.y > 40) mira.position.y = 40;
    if (mira.position.x > limiteXDinamico) mira.position.x = limiteXDinamico;
    if (mira.position.x < -limiteXDinamico) mira.position.x = -limiteXDinamico;
}

export function atualizarCamera(aviao, mira, camera, paredeInvisivel, velocidadeDeslocamento) {
    // Movimentação contínua para frente
    aviao.position.z -= velocidadeDeslocamento;
    mira.position.z -= velocidadeDeslocamento;
    camera.position.z -= velocidadeDeslocamento;

    // Câmera acompanha o eixo X do avião lateralmente
    camera.position.x = aviao.position.x;
    camera.lookAt(aviao.position.x, aviao.position.y, aviao.position.z - 30);

    // Limitação da câmera para não afundar no terreno
    if (camera.position.y < 20) camera.position.y = 20;
    if (camera.position.x > 5) camera.position.x = 5;
    if (camera.position.x < -5) camera.position.x = -5;

    // Atualiza a posição da parede invisível do raycaster
    paredeInvisivel.constant = -camera.position.z + 65 + 30;
}

export function animarAviao(animacaoAtiva, aviao, mira, velocidadeDeslocamento, vetorInterpolacao) {
   if (!animacaoAtiva) return;

   const pontoDestino = mira.position;
   vetorInterpolacao.set(pontoDestino.x, pontoDestino.y, aviao.position.z);

   // Move o avião suavemente até a mira
   aviao.position.lerp(vetorInterpolacao, 0.02 * velocidadeDeslocamento);

   // EIXO Y
   // Calcula a diferença vertical entre a mira e o avião
   const diferencaY = pontoDestino.y - aviao.position.y;

   // Cria o desvio de X baseado nessa diferença
   let desvioX = diferencaY * 0.02;

   // Trava para o bico não inclinar excessivamente
   if (desvioX > 0.5) desvioX = 0.5;
   if (desvioX < -0.5) desvioX = -0.5;

   const funcaoBaseX = 0;
   const rotacaoAlvoX = funcaoBaseX + desvioX; //subida e descida
   aviao.rotation.x += (rotacaoAlvoX - aviao.rotation.x) * 0.1;

   // EIXO X
   // Calcula a diferença horizontal entre a mira e o avião
   const diferencaX = pontoDestino.x - aviao.position.x;

   // Cria o desvio de Y baseado nessa diferença
   let desvioY = diferencaX * 0.02;

   // Trava para o corpo não inclinar excessivamente
   if (desvioY > 1) desvioY = 1;
   if (desvioY < -1) desvioY = -1;

   // Soma a base (Math.PI) com o desvio calculated
   const bicoRotacaoAlvoY = Math.PI - desvioY;
   aviao.rotation.y += (bicoRotacaoAlvoY - aviao.rotation.y) * 0.1;

   const inclinacaoAsaZ = desvioY ;
   aviao.rotation.z += (inclinacaoAsaZ - aviao.rotation.z) * 0.1;
}


export function atualizarTerreno(planoTerreno, geometriaPlano, camera, comprimentoTerreno, segmentosTerreno) {
    // Move o plano inteiro para frente junto com a câmera
    const deslocamentoZ = camera.position.z - (comprimentoTerreno / 2) + 60;
    planoTerreno.position.z = deslocamentoZ;

    // Acessa o array da GPU direto na memória para alterar a altura
    const arrayPosicoes = geometriaPlano.attributes.position.array;

    for (let linha = 0; linha <= segmentosTerreno; linha++) {
        for (let coluna = 0; coluna <= segmentosTerreno; coluna++) {
            const indiceOriginal = (linha * (segmentosTerreno + 1) + coluna) * 3;
            const coordenadaLocalX = arrayPosicoes[indiceOriginal];
            const coordenadaLocalY = arrayPosicoes[indiceOriginal + 1];

            const coordenadaMundoX = coordenadaLocalX;
            const coordenadaMundoZ = deslocamentoZ - coordenadaLocalY;

            // Recalcula a altura de cada vértice do terreno simulando movimento da montanha
            arrayPosicoes[indiceOriginal + 2] = calcularAlturaTerreno(coordenadaMundoX, coordenadaMundoZ);
        }
    }

    // Marca a geometria como alterada para a placa de vídeo redesenhar
    geometriaPlano.attributes.position.needsUpdate = true;
    geometriaPlano.computeVertexNormals();
}

export function gerarPosicoesArvores(posicoesValidas, quantidadeArvores, larguraTerreno, comprimentoTerreno) {
    const distanciaMinima = 20; // Distância entre arvores
    const tentativasMaximas = 5000; // Tentativas de verificação para árvores não ficarem sobrepostas
    let tentativas = 0;

    while (posicoesValidas.length < quantidadeArvores && tentativas < tentativasMaximas) {
        tentativas++;
        const x = (Math.random() - 0.5) * larguraTerreno;
        const z = (Math.random() - 0.5) * comprimentoTerreno;
        const novaPosicao = new THREE.Vector2(x, z);

        // Verifica as demais posições
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
}

export function reposicionarArvores(listaArvores, posicoesValidas, camera, comprimentoTerreno) {
    // Reutiliza árvores que saíram da visão da câmera para economizar memória (Object Pooling)
    for (let arvore of listaArvores) {
        // Se a árvore ficou para trás da câmera
        if (arvore.position.z > camera.position.z + 30) {

            // Pega o índice fixo que foi atribuído a esta árvore na inicialização
            const indiceFixo = arvore.userData.indicePosicao;
            const pontoOriginal = posicoesValidas[indiceFixo];

            // Mantém a árvore exatamente no mesmo alinhamento lateral que ela nasceu
            arvore.position.x = pontoOriginal.x;

            // Empurra a arvore para o terreno à frente no horizonte
            arvore.position.z -= comprimentoTerreno;

            // Recalcula a altura com base no relevo da nova posição
            arvore.position.y = calcularAlturaTerreno(arvore.position.x, arvore.position.z);
        }
    }
}

// INIMIGOS
function reposicionarInimigo(inimigo, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao) {
    // Retorna para a escala inicial a cada respawn
    inimigo.scale.set(escalaOriginalInimigo, escalaOriginalInimigo, escalaOriginalInimigo);
    inimigo.rotation.set(0, Math.PI * 1.5, 0);
    inimigo.userData.morrendo = false;

    // Nascem bem longe no eixo Z para "surgirem" suavemente de dentro da névoa (fog)
    const distanciaMinima = velocidadeDeslocamento > 1.2 ? 180 : 130;
    inimigo.position.z = aviao.position.z - distanciaMinima - (Math.random() * 50);

    // Posição X
    inimigo.position.x = inimigo.userData.origem ? (limiteXDinamico + 10) : -(limiteXDinamico + 10);

    // Velocidade aleatória, cruzando o campo de visão na diagonal oposta ao spawn
    inimigo.userData.velocidadeX = (inimigo.userData.origem ? -1 : 1) * (0.2 + Math.random() * 0.25);

    // Altura aleatória aproveitando toda a área da mira (10 a 30)
    inimigo.position.y = 10 + Math.random() * 30;

    // Alterna a origem do próximo inimigo
    inimigo.userData.origem = !inimigo.userData.origem;
}

export function criarInimigos(scene, modeloInimigoBase, listaInimigos, quantidade, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao) {
    if (!modeloInimigoBase) return; // Segurança caso o modelo ainda não tenha carregado
    let direcao = true;

    for (let i = 0; i < quantidade; i++) {
        // Clona o modelo base para não precisar carregar o arquivo várias vezes
        const inimigo = modeloInimigoBase.clone();
        inimigo.userData = {morrendo: false, velocidadeX: 0, origem: direcao};
        reposicionarInimigo(inimigo, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao);
        scene.add(inimigo);
        listaInimigos.push(inimigo);
        direcao = !direcao;
    }
}

export function atualizarInimigos(listaInimigos, camera, limiteXDinamico, escalaOriginalInimigo, velocidadeDeslocamento, aviao) {
    for (let inimigo of listaInimigos) {
        if (inimigo.userData.morrendo) {
            // Animação de Morte (diminui escala progressivamente)
            inimigo.scale.multiplyScalar(0.9);

            // Quando fica muito pequeno, renasce no fundo
            if (inimigo.scale.x < 0.1) {
                reposicionarInimigo(inimigo, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao);
            }
        } else {
            // Movimento lateral contínuo da patrulha
            inimigo.position.x += inimigo.userData.velocidadeX;

            // Reposiciona ao sair da tela pela lateral ou ficou pra trás da câmera
            if (inimigo.position.x > limiteXDinamico*2 || inimigo.position.x < -limiteXDinamico*2 || inimigo.position.z > camera.position.z) {
                reposicionarInimigo(inimigo, escalaOriginalInimigo, velocidadeDeslocamento, limiteXDinamico, aviao);
            }
        }
    }
}

// FUNÇÕES DE TIRO
export function atirarPlayer(scene, aviao, mira, listaProjeteisPlayer) {
    // Criação do laser do player
    const geometriaTiro = new THREE.PlaneGeometry(1.5, 12.0); // Retângulo alongado
    const materialTiro = new THREE.MeshBasicMaterial({color: 0xFCDE9C, side: THREE.DoubleSide});
    const projetil = new THREE.Mesh(geometriaTiro, materialTiro);

    geometriaTiro.rotateX(Math.PI / 2); // Rotação para o retângulo ficar deitado
    projetil.position.copy(aviao.position);

    // Normaliza o vetor (tamanho 1) para usar apenas como apontador de direção
    const direcao = new THREE.Vector3();
    direcao.subVectors(mira.position, aviao.position).normalize();
    projetil.userData.direcao = direcao;

    projetil.lookAt(mira.position); // Gira o tiro em direção ao alvo

    scene.add(projetil);
    listaProjeteisPlayer.push(projetil);
}

export function atirarInimigos(scene, listaInimigos, aviao, camera, listaProjeteis) {
    const geometriaTiro = new THREE.ConeGeometry(0.5, 3, 8); // Cone pontudo
    geometriaTiro.rotateX(Math.PI / 2); // Deita o cone
    const materialTiro = new THREE.MeshBasicMaterial({color: 0xffff00});

    for (let inimigo of listaInimigos) {
        // Drone não atira se estiver morrendo ou se ainda não entrou totalmente na tela visual (z < -40)
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

function removerProjetilDaCena(scene, projetil, lista, index) {
    scene.remove(projetil);

    // Obrigatório limpar as malhas da memória
    if (projetil.geometry) projetil.geometry.dispose();
    if (projetil.material) projetil.material.dispose();

    lista.splice(index, 1);
}

export function verificarDanoNoPlayer(scene, listaProjeteis, aviao, bbAviao, bbProjetilAux, statusJogo, velocidadeDeslocamento, aviaoAtingido) {

    for (let i = listaProjeteis.length - 1; i >= 0; i--) {
        const projetil = listaProjeteis[i];
        projetil.position.addScaledVector(projetil.userData.direcao, 1.5 + (velocidadeDeslocamento * 0.5));

        bbProjetilAux.setFromObject(projetil);

        if (bbProjetilAux.intersectsBox(bbAviao)) {
            if (statusJogo.invencivel) {
                removerProjetilDaCena(scene, projetil, listaProjeteis, i);
                continue; 
            }
            if (aviaoAtingido) {
                aviaoAtingido.currentTime = 0; // Reinicia o audio
                aviaoAtingido.play();
            }
            statusJogo.tirosSofridos++; // Atualiza automaticamente no GUI
            removerProjetilDaCena(scene, projetil, listaProjeteis, i);
            continue;
        }
        // Limpa projéteis muito distantes
        if (projetil.position.distanceTo(aviao.position) > 300) {
            removerProjetilDaCena(scene, projetil, listaProjeteis, i);
        }
    }
}

export function verificarDanoNosInimigos(scene, listaProjeteisPlayer, listaInimigos, aviao, bbProjetilAux, bbInimigoAux, velocidadeDeslocamento) {
    for (let i = listaProjeteisPlayer.length - 1; i >= 0; i--) {
        const projetil = listaProjeteisPlayer[i];

        projetil.position.addScaledVector(projetil.userData.direcao, 5.0 + (velocidadeDeslocamento * 0.5));

        let atingiuInimigo = false;

        // Atualiza a Hitbox e expande artificialmente para ser mais fácil de acertar os inimigos
        bbProjetilAux.setFromObject(projetil).expandByScalar(2.5);

        for (let j = 0; j < listaInimigos.length; j++) {
            const inimigo = listaInimigos[j];
            if (inimigo.userData.morrendo) continue;

            bbInimigoAux.setFromObject(inimigo);

            if (bbProjetilAux.intersectsBox(bbInimigoAux)) {
                atingiuInimigo = true;
                inimigo.userData.morrendo = true; // Inicia animação de queda do drone
                removerProjetilDaCena(scene, projetil, listaProjeteisPlayer, i);
                break;
            }
        }

        if (atingiuInimigo) continue;

        // Limpa projéteis distantes
        if (projetil.position.distanceTo(aviao.position) > 300) {
            removerProjetilDaCena(scene, projetil, listaProjeteisPlayer, i);
        }
    }
}

export function criaHealthPack(scene, limiteXDinamico, listaItens, aviao, statusJogo) {
    if (statusJogo.invencivel) return;

    // Escolhe uma posição aleatória 
    const randomX = (Math.random() - 0.5) * (limiteXDinamico * 2);
    const randomY = 12 + Math.random() * 23;
    const posicaoZ = aviao.position.z - 120;

    //Importa Health Pack
    const loader = new GLTFLoader();
    loader.load('./assets/healthpack.glb', function(gltf){
        const healthpack = gltf.scene;
        healthpack.scale.set(0.05, 0.05, 0.05); 
        healthpack.position.set(randomX, randomY, posicaoZ); 

        healthpack.rotation.y = Math.PI/2;

        healthpack.userData = { foiAtraido: false };

        scene.add(healthpack);
        listaItens.push(healthpack);
    });
}

export function controlarHealthPacks(scene, listaItens, aviao, statusJogo, somCura) {
    if (statusJogo.invencivel) return;
    for (let i = listaItens.length - 1; i >= 0; i--) {
        const item = listaItens[i];

        // Faz o kit ficar girando sozinho no céu enquanto espera o player
        item.rotation.y += 0.02;

        // Calcula a distância entre o item parado e o avião do jogador
        const distancia = item.position.distanceTo(aviao.position);

        // Se a distância for menor que 40 ativa o imã
        if (distancia < 40.0) {
            item.position.lerp(aviao.position, 0.1); // Puxa o item suavemente
            const escalaAlvo = new THREE.Vector3(0, 0, 0);
            item.scale.lerp(escalaAlvo, 0.12);
        }

        // Se a distância for menor que 3, significa que colidiu/coletou
        if (distancia < 3.0) {
            // Recupera vida (diminui os tiros sofridos em 5, sem deixar ficar menor que zero)
            statusJogo.tirosSofridos = Math.max(0, statusJogo.tirosSofridos - 5);

            // Toca o som de cura com segurança contra bloqueio do navegador
            if (somCura) {
                const somAtual = somCura.cloneNode();
                somAtual.volume = 0.3;
                somAtual.play().catch(e => console.log("Áudio bloqueado pelo navegador"));
            }

            // Remove o objeto do jogo
            scene.remove(item);
            listaItens.splice(i, 1);
        }
    }
}