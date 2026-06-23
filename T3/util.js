import * as THREE from 'three';
import { setDefaultMaterial } from "../libs/util/util.js";

/**
 * Cria o modelo 3D de uma árvore composta por um tronco cilíndrico e três níveis de folhas cônicas.
 * A altura da árvore sofre uma leve variação aleatória para gerar diversidade visual.
 *
 * @returns {THREE.Mesh} A malha (Mesh) contendo o tronco e as folhas agrupadas.
 */
export function criarArvore() {
    // Materiais
    const materialVerde = setDefaultMaterial("green");
    const materialMarrom = setDefaultMaterial("brown");

    // Tronco da árvore (Base)
    const cylinderGeometry = new THREE.CylinderGeometry(1.8, 2, 2, 16);
    const tronco = new THREE.Mesh(cylinderGeometry, materialMarrom);

    // Topo da árvore (Camadas de folhas)
    const coneGeometry1 = new THREE.ConeGeometry(3, 4, 32);
    const coneGeometry2 = new THREE.ConeGeometry(4, 5, 32);
    const coneGeometry3 = new THREE.ConeGeometry(4.5, 5.5, 32);

    const cone1 = new THREE.Mesh(coneGeometry1, materialVerde);
    const cone2 = new THREE.Mesh(coneGeometry2, materialVerde);
    const cone3 = new THREE.Mesh(coneGeometry3, materialVerde);

    // Otimização: desativa sombras internas nas folhas para melhorar performance
    cone1.castShadow = false; cone1.receiveShadow = false;
    cone2.castShadow = false; cone2.receiveShadow = false;
    cone3.castShadow = false; cone3.receiveShadow = false;

    // Dimensões para empilhamento correto
    const alturaCilindro = tronco.geometry.parameters.height;
    const alturaCone2 = coneGeometry2.parameters.height;
    const alturaCone3 = coneGeometry3.parameters.height;

    // Posicionamento base
    tronco.position.set(0, alturaCilindro / 2, 0);

    // Empilhamento dinâmico das folhas (de baixo para cima)
    const posY3 = alturaCilindro / 2 + alturaCone3 / 2;
    cone3.position.set(0, posY3, 0);

    const posY2 = posY3 + alturaCone3 / 2;
    cone2.position.set(0, posY2, 0);

    const posY1 = posY2 + alturaCone2 / 2;
    cone1.position.set(0, posY1, 0);

    // Agrupa as folhas como filhas do tronco
    tronco.add(cone1);
    tronco.add(cone2);
    tronco.add(cone3);

    // Aplica escala aleatória para variar a altura do conjunto final
    const alturaAleatoria = 0.4 + Math.random() * 0.3;
    tronco.scale.set(alturaAleatoria, alturaAleatoria, alturaAleatoria);
    tronco.position.y = (alturaCilindro * alturaAleatoria) / 2;

    return tronco;
}

/**
 * Cria o modelo 3D de um avião agrupando formas geométricas básicas.
 *
 * @returns {Object} Um objeto contendo a referência do `corpo` (que agrupa o avião inteiro) e da `helice` (para animação).
 */
export function criarAviao() {
    // Materiais
    const cor_1 = setDefaultMaterial("#BA5624");
    const cor_2 = setDefaultMaterial("#FCDE9C");
    const cor_3 = setDefaultMaterial("#FFA552");

    // Corpo (Cilindro afilado em uma ponta)
    const geometriaCilindro = new THREE.CylinderGeometry(2, 1, 13);
    const corpo = new THREE.Mesh(geometriaCilindro, cor_1);
    corpo.rotation.x = Math.PI / 2;

    // Asa frontal (Esfera achatada)
    const geometriaEsfera = new THREE.SphereGeometry();
    const asa = new THREE.Mesh(geometriaEsfera, cor_1);
    asa.scale.set(10, 0.5, 1.5);
    asa.rotation.x = -Math.PI / 2;
    corpo.add(asa);

    // Cauda Horizontal (Esfera achatada)
    const geometriaCaudaHoriz = new THREE.SphereGeometry();
    const caudaHorizontal = new THREE.Mesh(geometriaCaudaHoriz, cor_3);
    caudaHorizontal.scale.set(3.5, 0.4, 1);
    caudaHorizontal.position.set(0, -5.5, 0);
    caudaHorizontal.rotation.x = -Math.PI / 2;
    corpo.add(caudaHorizontal);

    // Leme Vertical (Caixa alongada)
    const geometriaCaudaVert = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const caudaVertical = new THREE.Mesh(geometriaCaudaVert, cor_3);
    caudaVertical.scale.set(0.3, 2, 1.9);
    caudaVertical.position.set(0, -5.5, -1);
    caudaVertical.rotation.x = -Math.PI / 8;
    corpo.add(caudaVertical);

    // Cabine (Meia esfera esticada)
    const geometriaCabine = new THREE.SphereGeometry(0.8);
    const cabine = new THREE.Mesh(geometriaCabine, cor_2);
    cabine.scale.set(1.2, 1.2, 2.5);
    cabine.position.set(0, 0, -1.5);
    cabine.rotation.x = -Math.PI / 2;
    corpo.add(cabine);

    // Hélice frontal (Caixa achatada)
    const geometriaHelice = new THREE.BoxGeometry(1, 1, 1);
    const helice = new THREE.Mesh(geometriaHelice, cor_3);
    helice.scale.set(5, 0.4, 0.1);
    helice.position.set(0, 6.6, 0);
    helice.rotation.x = -Math.PI / 2;
    corpo.add(helice);

    // Miolo central da hélice (Esfera)
    const geometriaMiolo = new THREE.SphereGeometry();
    const miolo = new THREE.Mesh(geometriaMiolo, cor_2);
    miolo.scale.set(0.6, 0.6, 0.6);
    miolo.position.set(0, 6.7, 0);
    miolo.rotation.x = -Math.PI / 2;
    corpo.add(miolo);

    // Detalhe frontal do corpo do avião (Torus)
    const geometriaArco = new THREE.TorusGeometry(1.85, 0.14);
    const arco = new THREE.Mesh(geometriaArco, cor_3);
    arco.scale.set(1.1, 1.1, 0.01);
    arco.position.set(0, 6.6, 0);
    arco.rotation.x = -Math.PI / 2;
    corpo.add(arco);

    return { corpo, helice };
}

/**
 * Instancia uma quantidade definida de árvores para posterior distribuição no cenário.
 *
 * @param {number} comprimentoPlano - Tamanho do plano no eixo Z (não utilizado na geração atual, mas útil para expansão).
 * @param {number} larguraPlano - Tamanho do plano no eixo X (não utilizado na geração atual).
 * @param {number} total - Quantidade de árvores a serem geradas.
 * @returns {THREE.Mesh[]} Vetor contendo as malhas (Meshes) das árvores instanciadas.
 */
export function criarArvores(comprimentoPlano, larguraPlano, total) {
    const arvores = [];
    for (let i = 0; i < total; i++) {
        arvores.push(criarArvore());
    }
    return arvores;
}

export function criarMira(color) {
    const verticesMira = [];
    const tam = 2.5;       // Tamanho total da mira
    const compLinha = 0.8; // Comprimento de cada perna do L

    verticesMira.push(
        // Canto Superior Esquerdo
        -tam, tam, 0,  -tam + compLinha, tam, 0,
        -tam, tam, 0,  -tam, tam - compLinha, 0,

        // Canto Superior Direito
        tam, tam, 0,   tam - compLinha, tam, 0,
        tam, tam, 0,   tam, tam - compLinha, 0,

        // Canto Inferior Esquerdo
        -tam, -tam, 0, -tam + compLinha, -tam, 0,
        -tam, -tam, 0, -tam, -tam + compLinha, 0,

        // Canto Inferior Direito
        tam, -tam, 0,  tam - compLinha, -tam, 0,
        tam, -tam, 0,  tam, -tam + compLinha, 0
    );

    const geometriaMira = new THREE.BufferGeometry();
    geometriaMira.setAttribute('position', new THREE.Float32BufferAttribute(verticesMira, 3));

    const materialMira = new THREE.LineBasicMaterial({ color: color, linewidth: 2 });
    return new THREE.LineSegments(geometriaMira, materialMira);
}

/**
 * Configura e inicializa a câmera de perspectiva da cena.
 *
 * @param {THREE.Vector3} position - A posição inicial da câmera no espaço 3D.
 * @returns {THREE.PerspectiveCamera} A câmera configurada apontando para a origem (0,0,0).
 */
export function iniciarCamera(position) {
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.copy(position);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return camera;
}

// SISTEMA DE GERAÇÃO DE RUÍDO CONTÍNUO (FRACTAL VALUE NOISE / fBM)

/**
 * Calcula a elevação final (eixo Y) do terreno para coordenadas específicas do mundo.
 * Aplica escalonamento e deslocamento (Offset) sobre o ruído fractal base.
 *
 * @param {number} coordenadaMundoX - Posição X absoluta no cenário.
 * @param {number} coordenadaMundoZ - Posição Z absoluta no cenário.
 * @returns {number} A altura final para o vértice do terreno na posição informada.
 */
export function calcularAlturaTerreno(coordenadaMundoX, coordenadaMundoZ) {
    const ruido = gerarRuidoFractal(coordenadaMundoX, coordenadaMundoZ);
    return -40 + ruido * 70;
}

/**
 * Fractional Brownian Motion (fBm) / Ruído Fractal: Agrega (soma) múltiplas camadas
 * (oitavas) de Value Noise para gerar terrenos complexos e naturais.
 *
 * @param {number} x - Coordenada X global
 * @param {number} y - Coordenada Y (Z) global
 * @param {number} [oitavas=4] - Quantidade de camadas de detalhe (quanto maior, mais detalhado e custoso)
 * @returns {number} O ruído acumulado e normalizado (0 a 1).
 */
function gerarRuidoFractal(x, y, oitavas = 3) {
    let valorAcumulado = 0;
    let amplitudeTotal = 1;
    let frequenciaTotal = 0.015; // Define a escala macro das montanhas
    let somaPesos = 0;

    for (let iteracao = 0; iteracao < oitavas; iteracao++) {
        valorAcumulado += gerarRuido2D(x * frequenciaTotal, y * frequenciaTotal) * amplitudeTotal;
        somaPesos += amplitudeTotal;

        amplitudeTotal *= 0.5;  // Reduz o peso/altura dos micro-detalhes (Persistência)
        frequenciaTotal *= 2.0; // Aumenta a quantidade de detalhes / imperfeições (Lacunaridade)
    }

    // Normaliza para manter o limite de escala estrito
    return valorAcumulado / somaPesos;
}

/**
 * Value Noise 2D: Gera um ruído suave interpolando os valores "Hash" dos 4 cantos
 * de um grid virtual usando uma curva de suavização (Smoothstep).
 *
 * @param {number} x - Coordenada contínua X
 * @param {number} y - Coordenada contínua Y
 * @returns {number} Valor suavizado de ruído para as coordenadas dadas.
 */
function gerarRuido2D(x, y) {
    const indiceX = Math.floor(x);
    const indiceY = Math.floor(y);
    const parteFracionariaX = x - indiceX;
    const parteFracionariaY = y - indiceY;

    // Aplicação da curva matemática de suavização (Smoothstep: 3x^2 - 2x^3)
    const curvaX = parteFracionariaX * parteFracionariaX * (3.0 - 2.0 * parteFracionariaX);
    const curvaY = parteFracionariaY * parteFracionariaY * (3.0 - 2.0 * parteFracionariaY);

    // Obtém a "semente" pseudo-aleatória nos 4 cantos da célula do grid
    const baseInferiorEsquerda = gerarHash(indiceX, indiceY);
    const baseInferiorDireita = gerarHash(indiceX + 1, indiceY);
    const baseSuperiorEsquerda = gerarHash(indiceX, indiceY + 1);
    const baseSuperiorDireita = gerarHash(indiceX + 1, indiceY + 1);

    // Mistura (Interpola) horizontalmente as bases inferiores e superiores
    const resultadoInferior = interpolacaoLinear(baseInferiorEsquerda, baseInferiorDireita, curvaX);
    const resultadoSuperior = interpolacaoLinear(baseSuperiorEsquerda, baseSuperiorDireita, curvaX);

    // Interpola verticalmente para obter o valor final 2D
    return interpolacaoLinear(resultadoInferior, resultadoSuperior, curvaY);
}

/**
 * Função Hash: Gera um valor escalar pseudo-aleatório baseado em coordenadas 2D.
 * É determinística: para o mesmo (x, y), retorna sempre o mesmo valor.
 *
 * @param {number} x - Coordenada X
 * @param {number} y - Coordenada Y (ou Z no espaço 3D)
 * @returns {number} Um valor entre 0 e 1.
 */
function gerarHash(x, y) {
    let valor = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return valor - Math.floor(valor);
}

/**
 * Interpolação Linear (Lerp): Transita entre dois valores baseando-se num fator.
 *
 * @param {number} inicio - Valor inicial
 * @param {number} fim - Valor final
 * @param {number} fator - Porcentagem da transição (0 a 1)
 * @returns {number} O valor interpolado.
 */
function interpolacaoLinear(inicio, fim, fator) {
    return inicio + fator * (fim - inicio);
}

// --- T3: Geração Procedural de Texturas ---
/**
 * Cria uma textura baseada em ruído diretamente pelo Canvas.
 * Soluciona a necessidade de "Procedural Texturing" sem necessitar de imagens externas.
 */
export function criarTexturaProcedural(corHex, intensidadeRuido = 30) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Pinta o fundo com a cor base especificada
    ctx.fillStyle = corHex;
    ctx.fillRect(0, 0, 256, 256);

    // Manipula os pixels para gerar o ruído processual
    const imgData = ctx.getImageData(0, 0, 256, 256);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        const ruido = (Math.random() - 0.5) * intensidadeRuido;
        data[i] = Math.max(0, Math.min(255, data[i] + ruido));     // R
        data[i+1] = Math.max(0, Math.min(255, data[i+1] + ruido)); // G
        data[i+2] = Math.max(0, Math.min(255, data[i+2] + ruido)); // B
    }

    ctx.putImageData(imgData, 0, 0);
    const textura = new THREE.CanvasTexture(canvas);
    textura.wrapS = THREE.RepeatWrapping;
    textura.wrapT = THREE.RepeatWrapping;
    return textura;
}

// --- T3: Shaders da Água ---
export const shaderAguaVertex = `
uniform float tempo;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    vUv = uv * 10.0;
    vec3 pos = position;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
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
    // Texturização procedural da água usando seno/cosseno para imitar refração e espuma leve
    float onda1 = sin(vUv.x * 5.0 + tempo) * 0.5 + 0.5;
    float onda2 = cos(vUv.y * 5.0 - tempo * 0.8) * 0.5 + 0.5;
    float reflexo = onda1 * onda2;

    // Mistura a cor base da água com um "brilho" simulando espuma
    vec3 corFinal = mix(corAgua, vec3(0.9, 0.95, 1.0), reflexo * 0.3);

    gl_FragColor = vec4(corFinal, 0.75); // Revertido para 75% de opacidade constante

    // Aplicação da Névoa (Fog) com base na distância global da câmera
    float dist = length(cameraPosition - vWorldPosition);
    float fatorNevoa = clamp((dist - 10.0) / (distanciaNevoa - 10.0), 0.0, 1.0);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, corNevoa, fatorNevoa);
}
`;