const COLORS = {
    PRIMARY: '#ffbf5a',
    WHITE: '#ffffff',
    BLACK: '#000000',
    DARK_BG: '#1a1a1a',
    DARK_GRAY: '#2a2a2a',
    MEDIUM_GRAY: '#333333',
    GREEDY: '#ff6b6b',
    BACKTRACK: '#00ff00'
};

let cities = [];
let numCities = 10;
let greedyResult = null;
let backtrackResult = null;
let greedyModule = null;
let backtrackModule = null;
let modulesLoaded = false;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const chartCanvas = document.getElementById('chartCanvas');
const chartCtx = chartCanvas.getContext('2d');

async function initWasm() {
    try {
        console.log('Carregando módulos WebAssembly');
        greedyModule = await GreedyModule();
        console.log('Módulo guloso carregado');
        backtrackModule = await BacktrackingModule();
        console.log('Módulo backtracking carregado');
        modulesLoaded = true;
        console.log('Todos os módulos carregados com sucesso');
    } catch (error) {
        console.error('Erro ao carregar módulos:', error);
        alert('Erro ao carregar os módulos WebAssembly');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWasm);
} else {
    initWasm();
}

class City {
    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.id = id;
    }

    distance(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    draw(ctx, color = COLORS.PRIMARY) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = COLORS.BLACK;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.id, this.x, this.y);
    }
}

function generateCities(n) {
    cities = [];
    const margin = 50;
    for (let i = 0; i < n; i++) {
        const x = margin + Math.random() * (canvas.width - 2 * margin);
        const y = margin + Math.random() * (canvas.height - 2 * margin);
        cities.push(new City(x, y, i));
    }
    drawCities();
    clearResults();
}

function drawCities(path = null, color = COLORS.PRIMARY) {
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (path && path.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cities[path[0]].x, cities[path[0]].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(cities[path[i]].x, cities[path[i]].y);
        }
        ctx.lineTo(cities[path[0]].x, cities[path[0]].y);
        ctx.stroke();
    }
    
    cities.forEach(city => city.draw(ctx, color));
}

async function greedyAlgorithm() {
    if (cities.length === 0) return null;
    if (!greedyModule) {
        alert('carregando módulo');
        return null;
    }
    
    const startTime = performance.now();
    const use2opt = document.getElementById('use2opt').checked;
    console.log('Executando algoritmo guloso', use2opt ? 'COM' : 'SEM', '2-opt');
    
    const n = cities.length;
    const distances = new Float32Array(n * n);
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                distances[i * n + j] = 0;
            } else {
                distances[i * n + j] = cities[i].distance(cities[j]);
            }
        }
    }
    
    const distancesPtr = greedyModule._malloc(distances.length * 4);
    const costPtr = greedyModule._malloc(4);
    
    for (let i = 0; i < distances.length; i++) {
        greedyModule.setValue(distancesPtr + i * 4, distances[i], 'float');
    }
    
    const apply2opt = use2opt ? 1 : 0;
    const resultPtr = greedyModule._resolver_guloso_de_distancias(distancesPtr, n, costPtr, apply2opt);
    
    const path = [];
    for (let i = 0; i < n; i++) {
        path.push(greedyModule.getValue(resultPtr + i * 4, 'i32'));
    }
    
    const cost = greedyModule.getValue(costPtr, 'i32') / 100;
    greedyModule._free(distancesPtr);
    greedyModule._free(costPtr);
    greedyModule._liberar_resultado(resultPtr);
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;
    
    return {
        path: path,
        distance: cost,
        time: executionTime
    };
}

async function backtrackingAlgorithm() {
    if (cities.length === 0) return null;
    if (!backtrackModule) {
        alert('carregando módulo');
        return null;
    }
    
    const startTime = performance.now();
    console.log('Executando backtracking');
    
    const n = cities.length;
    const distances = new Float32Array(n * n);
    
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            if (i === j) {
                distances[i * n + j] = 0;
            } else {
                distances[i * n + j] = cities[i].distance(cities[j]);
            }
        }
    }
    
    const distancesPtr = backtrackModule._malloc(distances.length * 4);
    const costPtr = backtrackModule._malloc(4);
    
    for (let i = 0; i < distances.length; i++) {
        backtrackModule.setValue(distancesPtr + i * 4, distances[i], 'float');
    }
    
    const resultPtr = backtrackModule._resolver_backtracking_de_distancias(distancesPtr, n, costPtr);
    
    const path = [];
    for (let i = 0; i < n; i++) {
        path.push(backtrackModule.getValue(resultPtr + i * 4, 'i32'));
    }
    
    const cost = backtrackModule.getValue(costPtr, 'i32') / 100;
    backtrackModule._free(distancesPtr);
    backtrackModule._free(costPtr);
    backtrackModule._liberar_resultado(resultPtr);
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;
    
    return {
        path: path,
        distance: cost,
        time: executionTime
    };
}

function clearResults() {
    greedyResult = null;
    backtrackResult = null;
    updateChart();
    
    document.getElementById('greedyResultCard').innerHTML = `
        <h3>Algoritmo Guloso</h3>
        <p class="result-status">Aguardando execução...</p>
    `;
    document.getElementById('backtrackResultCard').innerHTML = `
        <h3>Algoritmo Backtracking</h3>
        <p class="result-status">Aguardando execução...</p>
    `;
}

function updateResultCard(cardId, result, algorithmName, executionTime = null) {
    const card = document.getElementById(cardId);
    
    // Rotaciona o caminho para começar do 0 (apenas no display)
    let displayPath = [...result.path];
    const zeroIndex = displayPath.indexOf(0);
    if (zeroIndex > 0) {
        displayPath = [...displayPath.slice(zeroIndex), ...displayPath.slice(0, zeroIndex)];
    }
    
    const pathString = displayPath.join(' → ') + ' → ' + displayPath[0];
    
    let html = `
        <h3>Algoritmo ${algorithmName}</h3>
        <p><strong>Custo total:</strong> ${result.distance.toFixed(2)}</p>
        <p><strong>Número de cidades:</strong> ${result.path.length}</p>
    `;
    
    if (executionTime !== null) {
        html += `<p><strong>Tempo de execução:</strong> ${executionTime.toFixed(3)}s</p>`;
    }
    
    html += `
        <p><strong>Caminho percorrido:</strong></p>
        <p class="result-path">${pathString}</p>
    `;
    
    card.innerHTML = html;
}

function updateChart() {
    chartCtx.fillStyle = COLORS.DARK_BG;
    chartCtx.fillRect(0, 0, chartCanvas.width, chartCanvas.height);
    
    if (!greedyResult && !backtrackResult) {
        drawChartAxes();
        return;
    }
    
    drawChartAxes();
    
    const maxDistance = Math.max(
        greedyResult ? greedyResult.distance : 0,
        backtrackResult ? backtrackResult.distance : 0
    );
    
    const barWidth = 200;
    const spacing = 300;
    const maxBarHeight = 500;
    const baseY = 600;
    
    if (greedyResult) {
        const height = (greedyResult.distance / maxDistance) * maxBarHeight;
        chartCtx.fillStyle = COLORS.GREEDY;
        chartCtx.fillRect(400, baseY - height, barWidth, height);
        
        chartCtx.fillStyle = COLORS.WHITE;
        chartCtx.font = '20px Arial';
        chartCtx.textAlign = 'center';
        chartCtx.fillText('Guloso', 500, baseY + 30);
        chartCtx.fillText(greedyResult.distance.toFixed(2), 500, baseY - height - 10);
    }
    
    if (backtrackResult) {
        const height = (backtrackResult.distance / maxDistance) * maxBarHeight;
        chartCtx.fillStyle = COLORS.BACKTRACK;
        chartCtx.fillRect(700, baseY - height, barWidth, height);
        
        chartCtx.fillStyle = COLORS.WHITE;
        chartCtx.font = '20px Arial';
        chartCtx.textAlign = 'center';
        chartCtx.fillText('Backtracking', 800, baseY + 30);
        chartCtx.fillText(backtrackResult.distance.toFixed(2), 800, baseY - height - 10);
    }
}

function drawChartAxes() {
    chartCtx.strokeStyle = COLORS.MEDIUM_GRAY;
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    chartCtx.moveTo(100, 50);
    chartCtx.lineTo(100, 650);
    chartCtx.stroke();
    
    chartCtx.beginPath();
    chartCtx.moveTo(100, 600);
    chartCtx.lineTo(1400, 600);
    chartCtx.stroke();
    
    chartCtx.save();
    chartCtx.translate(30, 350);
    chartCtx.rotate(-Math.PI / 2);
    chartCtx.fillStyle = COLORS.WHITE;
    chartCtx.font = '18px Arial';
    chartCtx.textAlign = 'center';
    chartCtx.fillText('Custo total da rota (distância)', 0, 0);
    chartCtx.restore();
    
    chartCtx.strokeStyle = COLORS.DARK_GRAY;
    chartCtx.lineWidth = 1;
    for (let i = 1; i <= 10; i++) {
        const y = 600 - (i * 50);
        chartCtx.beginPath();
        chartCtx.moveTo(100, y);
        chartCtx.lineTo(1400, y);
        chartCtx.stroke();
    }
}

document.getElementById('cityCount').addEventListener('input', (e) => {
    numCities = parseInt(e.target.value);
    document.getElementById('cityCountDisplay').textContent = numCities;
});

document.querySelector('.btn-generate').addEventListener('click', () => {
    generateCities(numCities);
});

document.getElementById('btnGreedy').addEventListener('click', async () => {
    if (cities.length === 0) {
        alert('Por favor, gere as cidades primeiro!');
        return;
    }
    
    if (!modulesLoaded || !greedyModule) {
        alert('carregando modulos');
        console.log('Status dos módulos:', { modulesLoaded, greedyModule: !!greedyModule });
        return;
    }
    
    greedyResult = await greedyAlgorithm();
    drawCities(greedyResult.path, COLORS.GREEDY);
    updateChart();
    updateResultCard('greedyResultCard', greedyResult, 'Guloso', greedyResult.time);
});

document.getElementById('btnBacktrack').addEventListener('click', async () => {
    if (cities.length === 0) {
        alert('Gere as cidades primeiro');
        return;
    }
    
    if (!modulesLoaded || !backtrackModule) {
        alert('carregando modulos');
        console.log('Status dos mdulos:', { modulesLoaded, backtrackModule: !!backtrackModule });
        return;
    }
    
    if (cities.length > 12) {
        if (!confirm('Atenção: para mais de 12 cidades, o algoritmo pode demorar muito. Continuar?')) {
            return;
        }
    }
    
    backtrackResult = await backtrackingAlgorithm();
    
    drawCities(backtrackResult.path, COLORS.BACKTRACK);
    updateChart();
    
    updateResultCard('backtrackResultCard', backtrackResult, 'Backtracking', backtrackResult.time);
});

generateCities(numCities);
updateChart();
