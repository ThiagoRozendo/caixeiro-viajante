#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
#include <emscripten.h>

#define INF (INT_MAX / 4)

int V;
int **mat;

EMSCRIPTEN_KEEPALIVE
int **criarAdjMatriz(int Vparam) {
    int **m = malloc(Vparam * sizeof(int*));
    for (int i = 0; i < Vparam; ++i) {
        m[i] = malloc(Vparam * sizeof(int));
        for (int j = 0; j < Vparam; ++j)
            m[i][j] = (i == j ? 0 : INF);
    }
    return m;
}

void addVerticeMatriz(int **m, int u, int v, int weight, int undirected) {
    if (u < 0 || u >= V || v < 0 || v >= V) return;
    m[u][v] = weight;
    if (undirected) m[v][u] = weight;
}

void libertaMatriz(int **m, int Vparam) {
    for (int i = 0; i < Vparam; ++i) free(m[i]);
    free(m);
}

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

int *vizinho_mais_proximo(int inicio) {
    int *visited = malloc(V * sizeof(int));
    int *tour = malloc(V * sizeof(int));
    for (int i = 0; i < V; ++i) visited[i] = 0;

    int cur = inicio;
    visited[cur] = 1;
    tour[0] = cur;

    for (int step = 1; step < V; ++step) {
        int prox = -1;
        int melhor = INF;
        for (int j = 0; j < V; ++j) {
            if (!visited[j] && mat[cur][j] < melhor) {
                melhor = mat[cur][j];
                prox = j;
            }
        }
        if (prox == -1) { 
            free(visited);
            free(tour);
            return NULL;
        }
        visited[prox] = 1;
        tour[step] = prox;
        cur = prox;
    }

    free(visited);
    return tour;
}

//inverte segmento 
void inverte_segmento(int *tour, int i, int k) {
    while (i < k) {
        int tmp = tour[i];
        tour[i] = tour[k];
        tour[k] = tmp;
        i++; k--;
    }


}

//heurística 2-opt para melhorar uma rota existente
void dois_opt(int *tour) {
    if (!tour) return;
    int melhorou = 1;
    while (melhorou) {

        melhorou = 0;
        for (int i = 1; i < V - 1; ++i) {
            for (int k = i + 1; k < V; ++k) {
                int a = tour[i - 1];
                int b = tour[i];
                int c = tour[k];
                int d = tour[(k + 1) % V];
                int delta = mat[a][c] + mat[b][d] - mat[a][b] - mat[c][d];
                if (delta < 0) {
                    inverte_segmento(tour, i, k);
                    melhorou = 1;
                }
            
                }
        }


    }
}

//implementação em si da abordagem greedy, partindo de qualquer ponto
int *greedy_todos_inicios(int aplicar_2opt) {
    int *melhor_tour = NULL;
    int melhor = INF;

    for (int inicio = 0; inicio < V; ++inicio) {
        int *tour = vizinho_mais_proximo(inicio);
        if (!tour) continue;
        if (aplicar_2opt) {
            dois_opt(tour);
        }

        int c = custo(tour);

        if (c < melhor) {
            if (melhor_tour) free(melhor_tour);
            melhor_tour = tour; 
            melhor = c;
        } else {
            free(tour);
        }


    }

    return melhor_tour; 
}

EMSCRIPTEN_KEEPALIVE
int* resolver_guloso_de_distancias(float* distancias, int n, int* custo_saida, int aplicar_2opt) {
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
    
    int *melhor = greedy_todos_inicios(aplicar_2opt);
    *custo_saida = custo(melhor);
    
    int *resultado = malloc(V * sizeof(int));
    for (int i = 0; i < V; i++) {
        resultado[i] = melhor[i];
    }
    
    free(melhor);
    libertaMatriz(mat, V);
    
    return resultado;
}

EMSCRIPTEN_KEEPALIVE
void liberar_resultado(int* ptr) {
    free(ptr);
}

int main(void) {
    //caso de teste gerado//
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
    //caso de teste gerado//

    int aplicar_2opt = 1;
    int *melhor = greedy_todos_inicios(aplicar_2opt);
    int melhor_custo = custo(melhor);

    printf("Custo total: %d\n", melhor_custo);

    printf("Melhor caminho encontrado: ");
    for (int i = 0; i < V; ++i) printf("%d ", melhor[i]);
    printf("%d\n", melhor[0]); 
    

}