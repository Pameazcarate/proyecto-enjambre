# Proyecto Enjambre - Avance 2: Cardumen Optimizado con Shaders

## Integrantes
* Alan Gutierrez Gutierrez
* Pamela Azcárate Rodríguez

## Objetivo de la Entrega
Evolucionar la simulación base del primer avance para renderizar un enjambre masivo de **200 agentes autónomos** de forma simultánea, integrando optimizaciones de rendimiento por hardware (Instancing de T5) y sombreadores avanzados en la GPU (Vertex Deformation de T4), manteniendo una tasa de refresco superior a los 30 FPS obligatorios.

---

## 🛠️ Arquitectura y Optimizaciones Técnicas

### 1. Renderizado Masivo con `THREE.InstancedMesh` (T5)
En el avance previo, cada agente compuesto se gestionaba mediante un objeto `THREE.Group` individual, lo que generaba un *Draw Call* (llamada de dibujo) independiente hacia la GPU por cada pieza. Para escalar a 200 agentes sin degradar el rendimiento, se implementaron mallas instanciadas:
* Se consolidaron tres objetos `InstancedMesh` en paralelo: uno para el **cuerpo**, otro para los **ojos** y otro para la **aleta dorsal**, recuperando la identidad visual y los materiales de la primera entrega.
* En lugar de instanciar objetos en la CPU, se mantiene un arreglo lógico indexado (`cardumenLogico`). En cada frame, un nodo de transformación intermedio (`dummy`) calcula la matriz de posición, rotación y escala de cada pez, inyectándola directamente en los buffers de la GPU mediante `.setMatrixAt()`.
* Las piezas satélites (ojos y aleta) heredan las transformaciones del cuerpo principal mediante pre-multiplicación de matrices espaciales (`dummyParte.matrix.premultiply()`). **Resultado:** El costo de renderizado pasó de cientos de llamadas de dibujo a un único *Draw Call* global.

### 2. Sombreadores Avanzados en GPU (T4)
* **Vertex Deformation (Wobble):** Se inyectó código personalizado en GLSL utilizando el método `.onBeforeCompile` en los materiales de los peces. La animación ondulante del nado ahora se calcula de forma paralela en el *Vertex Shader* mediante una onda senoidal basada en el tiempo y la posición local $Z$ del vértice. Esto elimina la necesidad de mover articulaciones desde la CPU.
* **Simulación de Superficie Marina:** Se añadió una capa de agua translúcida en el límite superior del acuario ($Y = 5$) mediante una geometría de plano subdividida. Su movimiento se rige por un sombreador secundario que calcula la interferencia de dos ondas senoidales cruzadas en la GPU para generar un efecto de oleaje orgánico.

### 3. Métricas de Rendimiento
* Se integró la librería nativa `stats.js` para renderizar un monitor de rendimiento en tiempo real en la pantalla.
* **Rendimiento obtenido:** Gracias al procesamiento por hardware, la simulación corre de forma estable a **60 FPS** (superando con creces el mínimo de 30 FPS solicitado).

---

## 🚀 Ejecución en Local

1. Instalar las dependencias del proyecto (si es la primera vez):
   ```bash
   npm install
