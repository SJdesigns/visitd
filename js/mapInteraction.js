/* ============================================================================
   MAPINTERACTION.JS - Interactividad del mapa (zoom, drag, pan)
   ============================================================================
   Este archivo gestiona:
   - Zoom en/out con rueda del ratón
   - Arrastrar el mapa con el ratón
   - Botones de zoom
   - Mantener el estado del zoom y posición
   - Resetear el mapa a su estado inicial
   ============================================================================ */

/**
 * Objeto global para almacenar el estado del mapa
 */
const mapState = {
    currentZoom: 1,
    minZoom: 1,
    maxZoom: 5,
    zoomStep: 0.1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    mapElement: null,
    svgElement: null
};

/**
 * Inicializa los controles del mapa
 * Conecta los botones con sus funciones
 */
function initMapControls() {
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetMapBtn = document.getElementById('resetMapBtn');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => zoomMap(1));
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => zoomMap(-1));
    }

    if (resetMapBtn) {
        resetMapBtn.addEventListener('click', () => resetMap());
    }
}

/**
 * Inicializa los eventos de interacción del mapa (zoom y drag)
 * Se ejecuta cuando el SVG está completamente cargado
 */
function setupMapInteraction() {
    const mapContent = document.getElementById('mapContent');
    if (!mapContent) return;

    mapState.mapElement = mapContent;
    mapState.svgElement = mapContent.querySelector('svg');

    if (!mapState.svgElement) return;

    // ========== ZOOM CON RUEDA DEL RATÓN ==========
    mapContent.addEventListener('wheel', (e) => {
        e.preventDefault();

        // Determinar dirección del zoom (arriba = zoom in, abajo = zoom out)
        const direction = e.deltaY > 0 ? -1 : 1;
        
        zoomMap(direction, e);
    });

    // ========== DRAG DEL MAPA ==========
    mapContent.addEventListener('mousedown', (e) => {
        // No iniciar drag si el click es en un elemento clickable (stationCircle)
        if (e.target.classList.contains('stationCircle')) {
            return;
        }

        mapState.isDragging = true;
        mapState.dragStartX = e.clientX - mapState.offsetX;
        mapState.dragStartY = e.clientY - mapState.offsetY;

        // Cambiar cursor
        mapContent.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!mapState.isDragging) return;

        mapState.offsetX = e.clientX - mapState.dragStartX;
        mapState.offsetY = e.clientY - mapState.dragStartY;

        updateMapTransform();
    });

    document.addEventListener('mouseup', () => {
        mapState.isDragging = false;
        mapState.mapElement.style.cursor = 'grab';
    });

    // Cursor por defecto
    mapContent.style.cursor = 'grab';

    // Centrar el mapa inicialmente con un pequeño delay para asegurar que el SVG está renderizado
    setTimeout(() => {
        resetMap();
    }, 100);
}

/**
 * Aplica el zoom y la transformación al SVG
 */
function updateMapTransform() {
    if (!mapState.svgElement) return;

    const transform = `translate(${mapState.offsetX}px, ${mapState.offsetY}px) scale(${mapState.currentZoom})`;
    mapState.svgElement.style.transform = transform;
    mapState.svgElement.style.transformOrigin = 'top left';
}

/**
 * Realiza zoom en el mapa
 * @param {number} direction - 1 para zoom in, -1 para zoom out
 * @param {Event} event - El evento del mouse (opcional, para zoom relativo a la posición del ratón)
 */
function zoomMap(direction, event = null) {
    const newZoom = mapState.currentZoom + (direction * mapState.zoomStep);

    // Limitar el zoom a los valores mín/máx
    if (newZoom < mapState.minZoom || newZoom > mapState.maxZoom) {
        return;
    }

    // Si hay evento, aplicar zoom relativo a la posición del ratón
    if (event && mapState.mapElement && mapState.svgElement) {
        const rect = mapState.mapElement.getBoundingClientRect();
        
        // Posición del ratón relativa al contenedor
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        // Posición del ratón relativa al SVG sin transformar
        const svgX = (mouseX - mapState.offsetX) / mapState.currentZoom;
        const svgY = (mouseY - mapState.offsetY) / mapState.currentZoom;
        
        // Calcular los nuevos offsets para que el ratón se mantenga en el mismo punto
        mapState.offsetX = mouseX - svgX * newZoom;
        mapState.offsetY = mouseY - svgY * newZoom;
    }

    mapState.currentZoom = newZoom;
    updateMapTransform();
}

/**
 * Resetea el mapa a su estado inicial
 * - Zoom a 1
 * - Centrado en el contenedor mapContent
 */
function resetMap() {
    mapState.currentZoom = 1;
    
    if (mapState.mapElement && mapState.svgElement) {
        const mapRect = mapState.mapElement.getBoundingClientRect();
        const svgRect = mapState.svgElement.getBoundingClientRect();
        
        // Calcular offsets para centrar el SVG en el contenedor
        // (sin zoom aplicado, el SVG tiene su tamaño natural)
        mapState.offsetX = (mapRect.width - svgRect.width) / 2;
        mapState.offsetY = (mapRect.height - svgRect.height) / 2;
        
        // Asegurarse que los offsets sean al menos 0 si el SVG es más grande que el contenedor
        mapState.offsetX = Math.max(0, mapState.offsetX);
        mapState.offsetY = Math.max(0, mapState.offsetY);
    } else {
        mapState.offsetX = 0;
        mapState.offsetY = 0;
    }
    
    updateMapTransform();
}

/**
 * Obtiene el estado actual del mapa
 * Útil para debugging o guardar estado
 * @returns {Object} Estado actual del mapa
 */
function getMapState() {
    return {
        zoom: mapState.currentZoom,
        offsetX: mapState.offsetX,
        offsetY: mapState.offsetY
    };
}

/**
 * Establece el estado del mapa desde un objeto guardado
 * @param {Object} state - Estado a aplicar {zoom, offsetX, offsetY}
 */
function setMapState(state) {
    if (state.zoom) mapState.currentZoom = state.zoom;
    if (typeof state.offsetX !== 'undefined') mapState.offsetX = state.offsetX;
    if (typeof state.offsetY !== 'undefined') mapState.offsetY = state.offsetY;
    updateMapTransform();
}
