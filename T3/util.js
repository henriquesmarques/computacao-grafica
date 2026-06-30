import * as THREE from 'three';
import { setDefaultMaterial } from "../libs/util/util.js";

/**
 * Cria a malha hierárquica (Mesh) de uma árvore genérica.
 * Estruturada com geometrias primitivas para otimizar o tempo de renderização em massa.
 *
 * @returns {THREE.Mesh} Grupo contendo o tronco base e as folhas.
 */
export function criarArvore() {
    const materialVerde = setDefaultMaterial("green");
    const materialMarrom = setDefaultMaterial("brown");

    const cylinderGeometry = new THREE.CylinderGeometry(1.8, 2, 2, 16);
    const tronco = new THREE.Mesh(cylinderGeometry, materialMarrom);

    const coneGeometry1 = new THREE.ConeGeometry(3, 4, 32);
    const coneGeometry2 = new THREE.ConeGeometry(4, 5, 32);
    const coneGeometry3 = new THREE.ConeGeometry(4.5, 5.5, 32);

    const cone1 = new THREE.Mesh(coneGeometry1, materialVerde);
    const cone2 = new THREE.Mesh(coneGeometry2, materialVerde);
    const cone3 = new THREE.Mesh(coneGeometry3, materialVerde);

    // Otimização de renderização: Sombras intra-modelo desativadas
    cone1.castShadow = false; cone1.receiveShadow = false;
    cone2.castShadow = false; cone2.receiveShadow = false;
    cone3.castShadow = false; cone3.receiveShadow = false;

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

    // Hierarquia de nós: vértices das folhas vinculados à matriz do tronco
    tronco.add(cone1);
    tronco.add(cone2);
    tronco.add(cone3);

    // Variação de escala global do objeto instanciado
    const alturaAleatoria = 0.4 + Math.random() * 0.3;
    tronco.scale.set(alturaAleatoria, alturaAleatoria, alturaAleatoria);
    tronco.position.y = (alturaCilindro * alturaAleatoria) / 2;

    return tronco;
}

/**
 * Constrói o modelo 3D do avião a partir de geometrias nativas do Three.js.
 *
 * @returns {Object} Dicionário contendo a referência da malha principal (`corpo`) e do objeto animável (`helice`).
 */
export function criarAviao() {
    const cor_1 = setDefaultMaterial("#BA5624");
    const cor_2 = setDefaultMaterial("#FCDE9C");
    const cor_3 = setDefaultMaterial("#FFA552");

    const geometriaCilindro = new THREE.CylinderGeometry(2, 1, 13);
    const corpo = new THREE.Mesh(geometriaCilindro, cor_1);
    corpo.rotation.x = Math.PI / 2;

    const geometriaEsfera = new THREE.SphereGeometry();
    const asa = new THREE.Mesh(geometriaEsfera, cor_1);
    asa.scale.set(10, 0.5, 1.5);
    asa.rotation.x = -Math.PI / 2;
    corpo.add(asa);

    const geometriaCaudaHoriz = new THREE.SphereGeometry();
    const caudaHorizontal = new THREE.Mesh(geometriaCaudaHoriz, cor_3);
    caudaHorizontal.scale.set(3.5, 0.4, 1);
    caudaHorizontal.position.set(0, -5.5, 0);
    caudaHorizontal.rotation.x = -Math.PI / 2;
    corpo.add(caudaHorizontal);

    const geometriaCaudaVert = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const caudaVertical = new THREE.Mesh(geometriaCaudaVert, cor_3);
    caudaVertical.scale.set(0.3, 2, 1.9);
    caudaVertical.position.set(0, -5.5, -1);
    caudaVertical.rotation.x = -Math.PI / 8;
    corpo.add(caudaVertical);

    const geometriaCabine = new THREE.SphereGeometry(0.8);
    const cabine = new THREE.Mesh(geometriaCabine, cor_2);
    cabine.scale.set(1.2, 1.2, 2.5);
    cabine.position.set(0, 0, -1.5);
    cabine.rotation.x = -Math.PI / 2;
    corpo.add(cabine);

    const geometriaHelice = new THREE.BoxGeometry(1, 1, 1);
    const helice = new THREE.Mesh(geometriaHelice, cor_3);
    helice.scale.set(5, 0.4, 0.1);
    helice.position.set(0, 6.6, 0);
    helice.rotation.x = -Math.PI / 2;
    corpo.add(helice);

    const geometriaMiolo = new THREE.SphereGeometry();
    const miolo = new THREE.Mesh(geometriaMiolo, cor_2);
    miolo.scale.set(0.6, 0.6, 0.6);
    miolo.position.set(0, 6.7, 0);
    miolo.rotation.x = -Math.PI / 2;
    corpo.add(miolo);

    const geometriaArco = new THREE.TorusGeometry(1.85, 0.14);
    const arco = new THREE.Mesh(geometriaArco, cor_3);
    arco.scale.set(1.1, 1.1, 0.01);
    arco.position.set(0, 6.6, 0);
    arco.rotation.x = -Math.PI / 2;
    corpo.add(arco);

    return { corpo, helice };
}

export function criarArvores(comprimentoPlano, larguraPlano, total) {
    const arvores = [];
    for (let i = 0; i < total; i++) {
        arvores.push(criarArvore());
    }
    return arvores;
}

export function criarMira(color) {
    const verticesMira = [];
    const tam = 2.5;
    const compLinha = 0.8;

    // Geração procedural das linhas via BufferGeometry
    verticesMira.push(
        // Superior Esquerdo
        -tam, tam, 0,  -tam + compLinha, tam, 0,
        -tam, tam, 0,  -tam, tam - compLinha, 0,

        // Superior Direito
        tam, tam, 0,   tam - compLinha, tam, 0,
        tam, tam, 0,   tam, tam - compLinha, 0,

        // Inferior Esquerdo
        -tam, -tam, 0, -tam + compLinha, -tam, 0,
        -tam, -tam, 0, -tam, -tam + compLinha, 0,

        // Inferior Direito
        tam, -tam, 0,  tam - compLinha, -tam, 0,
        tam, -tam, 0,  tam, -tam + compLinha, 0
    );

    const geometriaMira = new THREE.BufferGeometry();
    geometriaMira.setAttribute('position', new THREE.Float32BufferAttribute(verticesMira, 3));

    const materialMira = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    return new THREE.LineSegments(geometriaMira, materialMira);
}

export function iniciarCamera(position) {
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.copy(position);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return camera;
}

// --- ALGORITMOS DE RUÍDO (NOISE) PARA GERAÇÃO PROCEDURAL ---

/**
 * Transforma coordenadas 2D do espaço em um valor global de elevação (eixo Y).
 *
 * @param {number} coordenadaMundoX - Posição absoluta X.
 * @param {number} coordenadaMundoZ - Posição absoluta Z.
 * @returns {number} Elevação calculada.
 */
export function calcularAlturaTerreno(coordenadaMundoX, coordenadaMundoZ) {
    const ruido = gerarRuidoFractal(coordenadaMundoX, coordenadaMundoZ);
    // Normalização e deslocamento do plano topográfico
    return -40 + ruido * 70;
}

/**
 * Função de Ruído Fractal (Fractional Brownian Motion - fBm).
 * Soma múltiplas "oitavas" de ruído para produzir relevos complexos e orgânicos.
 */
function gerarRuidoFractal(x, y, oitavas = 3) {
    let valorAcumulado = 0;
    let amplitudeTotal = 1;
    let frequenciaTotal = 0.015; // Define a amplitude macro dos biomas
    let somaPesos = 0;

    for (let iteracao = 0; iteracao < oitavas; iteracao++) {
        valorAcumulado += gerarRuido2D(x * frequenciaTotal, y * frequenciaTotal) * amplitudeTotal;
        somaPesos += amplitudeTotal;

        amplitudeTotal *= 0.5;  // Persistência: atenuação da amplitude nas oitavas superiores
        frequenciaTotal *= 2.0; // Lacunaridade: compressão da frequência espacial
    }

    return valorAcumulado / somaPesos;
}

/**
 * Algoritmo Value Noise 2D.
 * Interpola valores escalares ("Hash") extraídos de um grid estático para gerar transições suaves.
 */
function gerarRuido2D(x, y) {
    const indiceX = Math.floor(x);
    const indiceY = Math.floor(y);
    const parteFracionariaX = x - indiceX;
    const parteFracionariaY = y - indiceY;

    // Suavização polinomial (Smoothstep: 3x^2 - 2x^3) para evitar bordas aguçadas na geometria
    const curvaX = parteFracionariaX * parteFracionariaX * (3.0 - 2.0 * parteFracionariaX);
    const curvaY = parteFracionariaY * parteFracionariaY * (3.0 - 2.0 * parteFracionariaY);

    const baseInferiorEsquerda = gerarHash(indiceX, indiceY);
    const baseInferiorDireita = gerarHash(indiceX + 1, indiceY);
    const baseSuperiorEsquerda = gerarHash(indiceX, indiceY + 1);
    const baseSuperiorDireita = gerarHash(indiceX + 1, indiceY + 1);

    const resultadoInferior = interpolacaoLinear(baseInferiorEsquerda, baseInferiorDireita, curvaX);
    const resultadoSuperior = interpolacaoLinear(baseSuperiorEsquerda, baseSuperiorDireita, curvaX);

    return interpolacaoLinear(resultadoInferior, resultadoSuperior, curvaY);
}

/**
 * Dispersão determinística estática. Para a mesma coordenada, o retorno é invariável.
 */
function gerarHash(x, y) {
    let valor = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return valor - Math.floor(valor);
}

function interpolacaoLinear(inicio, fim, fator) {
    return inicio + fator * (fim - inicio);
}

// --- GERAÇÃO DINÂMICA DE MAPAS UV ---

/**
 * Cria a textura base (Albedo/Diffuse Map) em memória (HTML5 Canvas).
 *
 * @param {string} corHex - Cor dominante do bioma.
 * @param {number} variacaoCor - Amplitude do desvio estocástico sobre o RGB.
 * @param {number} tamanho - Resolução do Canvas alocado.
 * @param {number} escalaDetalhe - Frequência do ruído em relação à área total.
 */
export function criarTexturaProcedural(corHex, variacaoCor = 0.15, tamanho = 256, escalaDetalhe = 64) {
    const canvasRuido = document.createElement('canvas');
    canvasRuido.width = escalaDetalhe;
    canvasRuido.height = escalaDetalhe;
    const ctxRuido = canvasRuido.getContext('2d');
    const imgRuido = ctxRuido.createImageData(escalaDetalhe, escalaDetalhe);
    for (let i = 0; i < imgRuido.data.length; i += 4) {
        const val = Math.random() * 255;
        imgRuido.data[i] = val; imgRuido.data[i+1] = val; imgRuido.data[i+2] = val; imgRuido.data[i+3] = 255;
    }
    ctxRuido.putImageData(imgRuido, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = tamanho;
    canvas.height = tamanho;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvasRuido, 0, 0, tamanho, tamanho);
    const dataRuido = ctx.getImageData(0, 0, tamanho, tamanho).data;

    ctx.fillStyle = corHex;
    ctx.fillRect(0, 0, tamanho, tamanho);
    const baseColorData = ctx.getImageData(0, 0, tamanho, tamanho);
    const dataFinal = baseColorData.data;

    // Modulação RGB da base com dados extraídos do mapa de ruído expandido
    for (let i = 0; i < dataFinal.length; i += 4) {
        const varColor = (dataRuido[i] - 128) * variacaoCor;
        dataFinal[i]   = Math.max(0, Math.min(255, dataFinal[i] + varColor));
        dataFinal[i+1] = Math.max(0, Math.min(255, dataFinal[i+1] + varColor));
        dataFinal[i+2] = Math.max(0, Math.min(255, dataFinal[i+2] + varColor));
    }
    ctx.putImageData(baseColorData, 0, 0);

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    return textura;
}

/**
 * Sintetiza o vetor normal da malha geométrica convertendo as elevações geradas via ruído.
 * Transforma dados de elevação bidimensional em vetores cartesianos (RGB mapeia para XYZ).
 */
export function criarTexturaNormalProcedural(intensidade = 3.0, tamanho = 512, escalaDetalhe = 64) {
    const canvasRuido = document.createElement('canvas');
    canvasRuido.width = escalaDetalhe;
    canvasRuido.height = escalaDetalhe;
    const ctxRuido = canvasRuido.getContext('2d');
    const imgRuido = ctxRuido.createImageData(escalaDetalhe, escalaDetalhe);

    // Geração do mapa de alturas primitivo
    for (let i = 0; i < imgRuido.data.length; i += 4) {
        const val = Math.random() * 255;
        imgRuido.data[i] = val; imgRuido.data[i+1] = val; imgRuido.data[i+2] = val; imgRuido.data[i+3] = 255;
    }
    ctxRuido.putImageData(imgRuido, 0, 0);

    // Interpolação para criação dos declives contínuos
    const canvas = document.createElement('canvas');
    canvas.width = tamanho;
    canvas.height = tamanho;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvasRuido, 0, 0, tamanho, tamanho);
    const dataRuido = ctx.getImageData(0, 0, tamanho, tamanho).data;

    const normalData = ctx.createImageData(tamanho, tamanho);

    // Filtro derivado assemelhado a matriz de Sobel.
    // Avalia o gradiente de altura dos vizinhos cardinais adjacentes.
    for (let y = 0; y < tamanho; y++) {
        for (let x = 0; x < tamanho; x++) {
            const idx = (y * tamanho + x) * 4;

            // Restrição de margens (Wrapping/Enrolamento) usando módulo
            const xEsq = (x - 1 + tamanho) % tamanho;
            const xDir = (x + 1) % tamanho;
            const yCima = (y - 1 + tamanho) % tamanho;
            const yBaixo = (y + 1) % tamanho;

            const valEsq = dataRuido[(y * tamanho + xEsq) * 4];
            const valDir = dataRuido[(y * tamanho + xDir) * 4];
            const valCima = dataRuido[(yCima * tamanho + x) * 4];
            const valBaixo = dataRuido[(yBaixo * tamanho + x) * 4];

            // Coeficientes dos diferenciais
            const dX = (valEsq - valDir) / 255.0 * intensidade;
            const dY = (valCima - valBaixo) / 255.0 * intensidade;
            const dZ = 1.0;

            // Normalização do vetor perpendicular
            const length = Math.sqrt(dX*dX + dY*dY + dZ*dZ);
            const nX = dX / length;
            const nY = dY / length;
            const nZ = dZ / length;

            // Mapeia de vetores [-1, 1] para espaço de cores numéricas [0, 255]
            normalData.data[idx] = (nX * 0.5 + 0.5) * 255;
            normalData.data[idx+1] = (nY * 0.5 + 0.5) * 255;
            normalData.data[idx+2] = (nZ * 0.5 + 0.5) * 255;
            normalData.data[idx+3] = 255;
        }
    }
    ctx.putImageData(normalData, 0, 0);

    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    return textura;
}

// --- SHADERS DO AMBIENTE ---

export const shaderAguaVertex = `
uniform float tempo;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vec3 pos = position;
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    // As coordenadas UV são derivadas do World Space (Espaço do Mundo) 
    // para travar as texturas e reflexos no referencial cartesiano fixo
    vUv = worldPosition.xz * 0.05; 
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export const shaderAguaFragment = `
uniform float tempo;
uniform vec3 corAgua;
uniform vec3 corNevoa;
uniform float distanciaNevoa;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    // Ruído contínuo baseado em tempo implementado através de composição matemática
    float onda1 = sin(vUv.x * 5.0 + tempo) * 0.5 + 0.5;
    float onda2 = cos(vUv.y * 5.0 - tempo * 0.8) * 0.5 + 0.5;
    float reflexo = onda1 * onda2;

    // Reflexividade interpolada via mistura da cor primária
    vec3 corFinal = mix(corAgua, vec3(0.9, 0.95, 1.0), reflexo * 0.3);

    gl_FragColor = vec4(corFinal, 0.75); 

    // Cálculo espacial de profundidade para atenuação do fragmento (Depth Fog)
    float dist = length(cameraPosition - vWorldPosition);
    float fatorNevoa = clamp((dist - 80.0) / (distanciaNevoa - 80.0), 0.0, 1.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, corNevoa, fatorNevoa);
}
`;