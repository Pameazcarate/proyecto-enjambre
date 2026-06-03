# Simulación de enjambres de peces virtuales - Avance 1

Este proyecto presenta la primera versión funcional de una simulación de enjambre autónomo en un entorno tridimensional, integrando los conceptos fundamentales de los frameworks gráficos y sistemas articulados jerárquicos.

## Estructura del Proyecto

El código se encuentra modularizado bajo el entorno de desarrollo Vite para garantizar un desacoplamiento limpio de la escena y el comportamiento de los agentes:

* **index.html**: Lienzo principal que monta el contenedor del DOM para el renderizado de WebGL.
* **src/main.js**: Orquestador central de la aplicación. Configura la cámara perspectiva, inicializa el renderizador con Shadow Maps y gestiona la instanciación de 15 agentes autónomos distribuidos aleatoriamente en el espacio.
* **src/escenaBase.js**: Define la atmósfera y el entorno acuático. Implementa una iluminación tenue con variaciones de color azul y verde que emulan la profundidad marina propuesta originalmente, asistida por luces hemisféricas y direccionales con proyección de sombras suaves.
* **src/PezAgente.js**: Encapsula el modelo y comportamiento del agente pez. Construye una geometría jerárquica articulada (Cuerpo elipsoide -> Articulación de cola -> Aleta caudal) mediante el uso de `MeshPhongMaterial`. Controla de forma autónoma el vector de velocidad, la orientación adaptativa hacia el frente de avance y la física de rebote por inversión elástica en los límites del volumen.

## Integración y Requisitos Cumplidos
1. **Entorno de T1**: Escena base configurada con neblina de absorción de luz, piso marino y un esquema de iluminación dual con mapas de sombras activos.
2. **Modularización**: El agente se encuentra completamente aislado dentro de una clase ES6 importable.
3. **Instanciación Múltiple**: Se despliegan 15 instancias concurrentes en escena, cada una partiendo de una posición y orientación inicial únicas.
4. **Movimiento Autónomo**: Los agentes se desplazan autónomamente en su espacio local y rebotan elásticamente al hacer contacto con las paredes del acuario.

## Ejecución en Entorno Local

1. Instalar las dependencias del proyecto:
   npm install