#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <emscripten.h>

#define INF (INT_MAX / 4)

int V;
int **mat;
int *melhor_caminho;
int melhor_custo;


EMSCRIPTEN_KEEPALIVE
int **criarAdjMatriz(int V) {
    int **m = malloc(V * sizeof(int*));
    for (int i = 0; i < V; ++i) {
        m[i] = malloc(V * sizeof(int));
        for (int j = 0; j < V; ++j)
            m[i][j] = (i == j ? 0 : INF);
    }
    return m;
}

void addVerticeMatriz(int **m, int u, int v, int weight, int undirected) {
    if (u < 0 || u >= V || v < 0 || v >= V) return;
    m[u][v] = weight;
    if (undirected) m[v][u] = weight;
}

void libertaMatriz(int **m, int V) {
    for (int i = 0; i < V; ++i) free(m[i]);
    free(m);
}

void copiarCaminho(int *path, int len) {
    for (int i = 0; i < len; ++i) melhor_caminho[i] = path[i];
}


//função de backtraccking para TSP recursiva
void tsp_backtrack(int curr, int depth, int *path, int *visited, int current_cost) {
    if (current_cost >= melhor_custo) return;


    if (depth == V) {
        //tenta fechar ciclo de volta ao inicio (cidade 0)
        if (mat[curr][0] < INF) {
            int total = current_cost + mat[curr][0];
            if (total < melhor_custo) {
                melhor_custo = total;

                copiarCaminho(path, V);
            }
        }
        return;
    }


    //assumindo 0 como ponto de partida fixo
    for (int nxt = 1; nxt < V; ++nxt) {
        if (!visited[nxt] && mat[curr][nxt] < INF) {
            visited[nxt] = 1;
            path[depth] = nxt;
            tsp_backtrack(nxt, depth + 1, path, visited, current_cost + mat[curr][nxt]);

            visited[nxt] = 0;
            
        }
    }


}

//calcula o custo de uma rota
int custo(int *tour) {

    if (!tour) return INF;
    long sum = 0;
    for (int i = 0; i < V; ++i) {
        int a = tour[i];
        int b = tour[(i + 1) % V];
        if (mat[a][b] >= INF) return INF;
        sum += mat[a][b];
        if (sum >= INF) return INF;
    }
    return (int)sum;
}

EMSCRIPTEN_KEEPALIVE
int* resolver_backtracking_de_distancias(float* distancias, int n, int* custo_saida) {
    V = n;
    mat = criarAdjMatriz(V);
    
    for (int i = 0; i < V; i++) {
        for (int j = 0; j < V; j++) {
            if (i == j) {
                mat[i][j] = 0;
            } else {
                mat[i][j] = (int)(distancias[i * V + j] * 100); 
            }
        }
    }
    
    melhor_custo = INF;
    melhor_caminho = malloc(V * sizeof(int));
    int *caminho = malloc(V * sizeof(int));
    int *visitados = calloc(V, sizeof(int));
    
    visitados[0] = 1;
    caminho[0] = 0;
    
    tsp_backtrack(0, 1, caminho, visitados, 0);
    
    *custo_saida = melhor_custo;
    int *resultado = malloc(V * sizeof(int));
    for (int i = 0; i < V; i++) {
        resultado[i] = melhor_caminho[i];
    }
    
    free(caminho);
    free(visitados);
    free(melhor_caminho);
    libertaMatriz(mat, V);
    
    return resultado;
}

EMSCRIPTEN_KEEPALIVE
void liberar_resultado(int* ptr) {
    free(ptr);
}

int main(void) {

    //caso de teste gerado
    V = 5;
    mat = criarAdjMatriz(V);

    addVerticeMatriz(mat, 0,1,4,1); // A-B
    addVerticeMatriz(mat, 0,2,2,1); // A-C
    addVerticeMatriz(mat, 0,3,7,1); // A-D
    addVerticeMatriz(mat, 0,4,3,1); // A-E

    addVerticeMatriz(mat, 1,2,5,1); // B-C
    addVerticeMatriz(mat, 1,3,1,1); // B-D
    addVerticeMatriz(mat, 1,4,6,1); // B-E

    addVerticeMatriz(mat, 2,3,3,1); // C-D
    addVerticeMatriz(mat, 2,4,4,1); // C-E

    addVerticeMatriz(mat, 3,4,2,1); // D-E
    //caso de teste gerado



    //backtracking 
    melhor_custo = INF;
    melhor_caminho = malloc(V * sizeof(int));
    int *path = malloc(V * sizeof(int));
    int *visited = calloc(V, sizeof(int));

    //fixamos cidade 0 como início
    visited[0] = 1;
    path[0] = 0;

    //chamando backtracking
    tsp_backtrack(0, 1, path, visited, 0);

    //resultados
    printf("Melhor custo encontrado encontrado: %d\n", melhor_custo);
    printf("Melhor camiinho: ");

    for (int i = 0; i < V; ++i) {
        printf("%d ", melhor_caminho[i]);
    }

    printf("%d", melhor_caminho[0]);


}