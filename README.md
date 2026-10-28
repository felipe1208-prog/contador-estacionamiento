Aquí tienes el **`README.md`** completo y blindado. Incluye tanto el paso a paso exacto para quien clona el repositorio como la configuración explícita de `package.json` e instalación manual de librerías (`three` y `vite`) por si se inicia desde cero en cualquier máquina sin dependencias previas:

# Simulador 3D | Estacionamiento Sambilito

Simulador 3D interactivo desarrollado con **Three.js** y **Vite**, que modela un sistema de control de aforo para un estacionamiento de 7 plazas. El comportamiento de la simulación está gobernado por un **contador síncrono bidireccional de 3 bits** implementado con compuertas y biestables TTL estándar de la serie 74LS (74LS76, 74LS74, 74LS02 y 74LS47).

---

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu computadora:

1. **Node.js** (versión 18.0.0 o superior): [Descargar Node.js](https://nodejs.org/)
   * Verifica la instalación en tu terminal ejecutando:
     ```bash
     node -v
     npm -v
     ```
2. **Git**: [Descargar Git](https://git-scm.com/)
3. **pnpm** (Gestor de paquetes recomendado para este proyecto):
   * Si no lo tienes instalado, instálalo globalmente ejecutando:
     ```bash
     npm install -g pnpm
     ```

---

## Verificación previa de `package.json`

Para garantizar que cualquier persona pueda ejecutar el proyecto sin errores de paquetes faltantes, el archivo **`package.json`** en la raíz debe contener obligatoriamente `three` en sus dependencias y `vite` en herramientas de desarrollo:

```json
{
  "name": "contador-estacionamiento",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.160.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}

```

---

## Guía de Instalación Paso a Paso (Paso Exacto)

Abre tu terminal (**PowerShell**, **Git Bash** o la terminal integrada de **VS Code**) y sigue estos comandos en orden:

### 1. Clonar el repositorio

```bash
git clone [https://github.com/TU_USUARIO/TU_REPOSITORIO.git](https://github.com/TU_USUARIO/TU_REPOSITORIO.git)

```

### 2. Entrar a la carpeta del proyecto

```bash
cd "Contador Estacionamiento"

```

### 3. Instalar las dependencias del proyecto

Ejecuta el siguiente comando para descargar e instalar todas las dependencias declaradas (incluyendo `three` y `vite`):

* **Con pnpm (Recomendado):**
```bash
pnpm install

```


* **Con npm (Alternativa):**
```bash
npm install

```



---

### ¿Instalación directa o manual de Three.js?

Si por algún motivo el proyecto se descargó en un archivo ZIP sin dependencias o el `package.json` no tenía `three` registrado, ejecuta estos comandos para forzar la instalación manual de `three` y el servidor de desarrollo `vite`:

* **Con pnpm:**
```bash
pnpm add three
pnpm add -D vite

```


* **Con npm:**
```bash
npm install three
npm install --save-dev vite

```



---

### 4. Iniciar el servidor local de desarrollo

Una vez finalizada la instalación de los módulos, levanta el servidor local con:

* **Con pnpm:**
```bash
pnpm dev

```


* **Con npm:**
```bash
npm run dev

```



En la consola aparecerá un mensaje similar a este:

```text
  VITE v5.x.x  ready in 180 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose

```

### 5. Abrir en el navegador

Haz `Ctrl + Clic` en el enlace de la terminal o abre tu navegador web e ingresa manualmente a:

```text
http://localhost:5173

```

---

## Errores Comunes y Soluciones

### Error: `Failed to resolve module specifier "three"` o `OrbitControls`

* **Causa:** Abriste el archivo `index.html` haciendo doble clic en el explorador de Windows (`file:///C:/...`) o con la extensión *Live Server* de VS Code (`127.0.0.1:5500`), los cuales no resuelven módulos de la carpeta `node_modules`.
* **Solución:** Corre siempre el proyecto con `pnpm dev` y accede a través de la URL que genera Vite (`http://localhost:5173`).

### Error: `'pnpm' no se reconoce como un comando interno o externo`

* **Solución:** Instala pnpm de forma global ejecutando:
```bash
npm install -g pnpm

```


O simplemente utiliza `npm install` y `npm run dev` en su lugar.

### Error: El puerto 5173 ya está en uso

* **Causa:** Tienes otra instancia de Vite corriendo en segundo plano.
* **Solución:** Vite te asignará automáticamente el siguiente puerto libre (ejemplo: `http://localhost:5174`). Revisa el número de puerto exacto que imprime la consola.

---

## Controles de la Simulación

| Control | Acción | Descripción |
| --- | --- | --- |
| **Sumar Carro** | Clic botón verde | Activa la señal $E_{IN}=1$, dispara el reloj $CLK$, levanta la barrera de entrada e ingresa un auto al puesto libre. |
| **Restar Carro** | Clic botón gris | Activa la señal $E_{OUT}=1$, dispara el reloj $CLK$, levanta la barrera de salida y retira un vehículo del estacionamiento. |
| **Sensores Manuales** | Desplegable manual | Permite fijar manualmente las entradas $E_{IN}$ y $E_{OUT}$ en 0 o 1 y pulsar el reloj con el botón `PULSO`. |
| **Lógica Interna** | Desplegable técnico | Muestra los bits de estado de los flip-flops ($Q_2, Q_1, Q_0$) y los términos de excitación ($J_2, K_2, D_1, T_0, S, R$). |
| **Tótem Digital 3D** | Visualización 3D | Pantalla LED ubicada frente a la entrada que muestra el conteo y aforo en tiempo real a los conductores. |
| **Cámaras** | Botones inferiores | Permite alternar entre vista Isométrica General, Garita de Entrada, Garita de Salida y Vista Cenital. |
| **Navegación 3D** | Mouse / Touch | Clic izquierdo para rotar la cámara, clic derecho para desplazar el plano y rueda del mouse para hacer zoom. |

---

## Estructura de Archivos

```text
Contador Estacionamiento/
├── public/                 # Recursos multimedia estáticos
├── src/
│   ├── audio.js            # Sintetizador de audio (clicks de relé, servomotores y alarma)
│   ├── logic.js            # Núcleo secuencial síncrono y ecuaciones de biestables TTL
│   ├── main.js             # Controlador de eventos del DOM y sincronización
│   ├── scene.js            # Escena 3D, iluminación diurna, tótem, peatones y arquitectura
│   └── vehicles.js         # Trayectorias cinemáticas, giros y físicas vehiculares
├── index.html              # Lienzo WebGL, interfaz HUD y fuentes Google Sans
├── package.json            # Definición de scripts y dependencias (Three.js y Vite)
├── pnpm-lock.yaml          # Árbol exacto de dependencias de pnpm
└── style.css               # Estilos visuales del HUD y pantallas de control

```

---

## Compilación para Producción

Para compilar el proyecto y generar los archivos estáticos listos para desplegar en plataformas como Vercel, Netlify o GitHub Pages:

```bash
pnpm build

```

Los archivos optimizados y minificados quedarán generados en la carpeta `dist/`. Para probar la versión final de producción localmente:

```bash
pnpm preview

```
