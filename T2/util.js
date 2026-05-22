import * as THREE from 'three';
import {setDefaultMaterial} from "../libs/util/util.js";

export function criarArvore() {
    // Materiais
    const materialVerde = setDefaultMaterial("green");
    const materialMarrom = setDefaultMaterial("brown");

    // Tronco da árvore
    const cylinderGeometry = new THREE.CylinderGeometry(1.8, 2, 2, 16);
    const tronco = new THREE.Mesh(cylinderGeometry, materialMarrom);

    // Topo da árvore (Folhas)
    const coneGeometry1 = new THREE.ConeGeometry(3, 4, 32);
    const coneGeometry2 = new THREE.ConeGeometry(4, 5, 32);
    const coneGeometry3 = new THREE.ConeGeometry(4.5, 5.5, 32);

    const cone1 = new THREE.Mesh(coneGeometry1, materialVerde);
    const cone2 = new THREE.Mesh(coneGeometry2, materialVerde);
    const cone3 = new THREE.Mesh(coneGeometry3, materialVerde);

    cone1.castShadow = false;
    cone1.receiveShadow = false;
    cone2.castShadow = false;
    cone2.receiveShadow = false;
    cone3.castShadow = false;
    cone3.receiveShadow = false;

    const alturaCilindro = tronco.geometry.parameters.height;
    const alturaCone2 = coneGeometry2.parameters.height;
    const alturaCone3 = coneGeometry3.parameters.height;

    tronco.position.set(0, alturaCilindro / 2, 0);

    const posY3 = alturaCilindro / 2 + alturaCone3 / 2;
    cone3.position.set(0, posY3, 0);

    const posY2 = posY3 + alturaCone3 / 2;
    cone2.position.set(0, posY2, 0);

    const posY1 = posY2 + alturaCone2 / 2;
    cone1.position.set(0, posY1, 0);

    // Adicionando folhas no tronco
    tronco.add(cone1);
    tronco.add(cone2);
    tronco.add(cone3);

    // Alturas variáveis para as árvores
    const alturaAleatoria = 0.4 + Math.random() * 0.3;
    tronco.scale.set(alturaAleatoria, alturaAleatoria, alturaAleatoria);
    tronco.position.y = (alturaCilindro * alturaAleatoria) / 2;

    return tronco;
}

export function criarAviao() {
    // Materiais
    const materialAzul = setDefaultMaterial("rgb(23,62,125)");
    const materialAmarelo = setDefaultMaterial("rgb(194,140,39)");
    const materialVermelho = setDefaultMaterial("rgb(180, 30, 60)");

    // Corpo
    // Usando CylinderGeometry com bases distintas
    const geometriaCilindro = new THREE.CylinderGeometry(2, 1, 13);
    const corpo = new THREE.Mesh(geometriaCilindro, materialAzul);
    corpo.rotation.x = Math.PI / 2;

    // Asa frontal
    // Usando SphereGeometry achatado
    const geometriaEsfera = new THREE.SphereGeometry();
    const asa = new THREE.Mesh(geometriaEsfera, materialAzul);
    asa.scale.set(10, 0.5, 1.5);
    asa.rotation.x = -Math.PI / 2;
    corpo.add(asa);

    // Asa traseira
    // Usando SphereGeometry achatada, igual à asa principal
    const geometriaCaudaHoriz = new THREE.SphereGeometry();
    const caudaHorizontal = new THREE.Mesh(geometriaCaudaHoriz, materialVermelho);
    caudaHorizontal.scale.set(3.5, 0.4, 1);
    caudaHorizontal.position.set(0, -5.5, 0);
    caudaHorizontal.rotation.x = -Math.PI / 2;
    corpo.add(caudaHorizontal);

    // Cauda (Leme)
    // Usando BoxGeometry para fazer uma barbatana direcional
    const geometriaCaudaVert = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const caudaVertical = new THREE.Mesh(geometriaCaudaVert, materialAmarelo);
    caudaVertical.scale.set(0.3, 2, 1.9);
    caudaVertical.position.set(0, -5.5, -1);
    caudaVertical.rotation.x = -Math.PI / 8;
    corpo.add(caudaVertical);

    // Cabine
    // Uma meia-esfera alongada em cima do corpo.
    const geometriaCabine = new THREE.SphereGeometry(0.8);
    const cabine = new THREE.Mesh(geometriaCabine, materialAmarelo);
    cabine.scale.set(1.2, 1.2, 2.5);
    cabine.position.set(0, 0, -1.5);
    cabine.rotation.x = -Math.PI / 2;
    corpo.add(cabine);

    // Hélice
    // Usando BoxGeometry na parte frontal do avião
    const geometriaHelice = new THREE.BoxGeometry(1, 1, 1);
    const helice = new THREE.Mesh(geometriaHelice, materialVermelho);
    helice.scale.set(5, 0.4, 0.1);
    helice.position.set(0, 6.6, 0);
    helice.rotation.x = -Math.PI / 2;
    corpo.add(helice);

    // Miolo da Hélice
    // Usando SphereGeometry no centro da hélice
    const geometriaMiolo = new THREE.SphereGeometry();
    const miolo = new THREE.Mesh(geometriaMiolo, materialAmarelo);
    miolo.scale.set(0.6, 0.6, 0.6);
    miolo.position.set(0, 6.7, 0);
    miolo.rotation.x = -Math.PI / 2;
    corpo.add(miolo);

    // Arco
    // Usando TorusGeometry para dar sensação de movimento na hélice
    const geometriaArco = new THREE.TorusGeometry(1.85, 0.14);
    const arco = new THREE.Mesh(geometriaArco, materialVermelho);
    arco.scale.set(1.1, 1.1, 0.01);
    arco.position.set(0, 6.6, 0);
    arco.rotation.x = -Math.PI / 2;
    corpo.add(arco);

    return {
        corpo: corpo,
        helice: helice
    };
}

export function criarArvores(comprimentoPlano, larguraPlano, total) {
    const arvores = []; // Lista para colocar as árvores

    for (let i = 0; i < total; i++) {
        // Cria a malha usando a sua função existente
        const arvore = criarArvore(); 
        
        // Adiciona na lista sem definir X ou Z aqui, pois a outra função definirá isso 
        arvores.push(arvore);
    }
    
    return arvores;
}

export function iniciarCamera(position) {
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.copy(position);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return camera;
}

// ============================================================================
// SISTEMA DE GERAÇÃO DE RUÍDO CONTÍNUO (FRACTAL VALUE NOISE)
// ============================================================================
// Este conjunto de funções gera elevações suaves de montanhas utilizando uma
// abordagem matemática pseudo-aleatória consistente, permitindo mapear a altura
// de um terreno infinito dependendo apenas das coordenadas globais X e Z.

// Função Hash: Gera um valor pseudo-aleatório baseado nas coordenadas de entrada.
// Para as mesmas coordenadas (x,y), devolve sempre o mesmo resultado.
function gerarHash(x, y) {
    let valor = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return valor - Math.floor(valor);
}

// Interpolação Linear: Mistura dois valores gradualmente baseada num fator (entre 0 e 1).
function interpolacaoLinear(inicio, fim, fator) {
    return inicio + fator * (fim - inicio);
}

// Ruído 2D Suavizado: Utiliza o Hash nos 4 cantos de uma grelha imaginária e
// suaviza as transições (smoothstep) para evitar solavancos grosseiros.
function gerarRuido2D(x, y) {
    const indiceX = Math.floor(x);
    const indiceY = Math.floor(y);
    const parteFracionariaX = x - indiceX;
    const parteFracionariaY = y - indiceY;

    // Aplicação da curva matemática de suavização (Smoothstep)
    const curvaX = parteFracionariaX * parteFracionariaX * (3.0 - 2.0 * parteFracionariaX);
    const curvaY = parteFracionariaY * parteFracionariaY * (3.0 - 2.0 * parteFracionariaY);

    // Obtém a fundação aleatória nos 4 cantos de "células" matemáticas
    const baseInferiorEsquerda = gerarHash(indiceX, indiceY);
    const baseInferiorDireita = gerarHash(indiceX + 1, indiceY);
    const baseSuperiorEsquerda = gerarHash(indiceX, indiceY + 1);
    const baseSuperiorDireita = gerarHash(indiceX + 1, indiceY + 1);

    // Mistura (Interpola) horizontalmente os valores inferiores e depois superiores
    const resultadoInferior = interpolacaoLinear(baseInferiorEsquerda, baseInferiorDireita, curvaX);
    const resultadoSuperior = interpolacaoLinear(baseSuperiorEsquerda, baseSuperiorDireita, curvaX);

    // Mistura verticalmente o resultado final
    return interpolacaoLinear(resultadoInferior, resultadoSuperior, curvaY);
}

// Ruído Fractal: Agrega (soma) múltiplas camadas (oitavas) de ruído,
// onde a cada passo se adicionam detalhes menores mas com menor impacto na altura.
// Isto cria silhuetas com grandes montanhas contendo pequenos picos rochosos.
function gerarRuidoFractal(x, y, oitavas = 4) {
    let valorAcumulado = 0;
    let amplitudeTotal = 1;
    let frequenciaTotal = 0.015; // Modela o quão "espalhadas" são as montanhas
    let somaPesos = 0;

    for (let iteracao = 0; iteracao < oitavas; iteracao++) {
        valorAcumulado += gerarRuido2D(x * frequenciaTotal, y * frequenciaTotal) * amplitudeTotal;
        somaPesos += amplitudeTotal;

        amplitudeTotal *= 0.5; // Reduz a altura dos micro-detalhes
        frequenciaTotal *= 2.0; // Aumenta a quantidade (frequência) das irregularidades
    }
    return valorAcumulado / somaPesos; // Normaliza o ruído para uma escala limpa entre 0 e 1
}

// Devolve o "Z" (aqui mapeado como Y no mundo 3D) final dos vértices da malha.
export function calcularAlturaTerreno(coordenadaMundoX, coordenadaMundoZ) {
    const ruido = gerarRuidoFractal(coordenadaMundoX, coordenadaMundoZ);
    // Extrapola o resultado final (de 0 a 1) para a nossa topografia visível
    return -15 + ruido * 25;
}