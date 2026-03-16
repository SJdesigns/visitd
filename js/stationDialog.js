/* ============================================================================
   STATIONDIALOG.JS - Diálogo modal para interactuar con estaciones
   ============================================================================
   Este archivo gestiona:
   - Apertura/cierre del diálogo de estaciones
   - Formulario para marcar estaciones como visitadas
   - Formulario para editar/eliminar visitas existentes
   - Validaciones y envío de datos
   ============================================================================ */

/**
 * Objeto para almacenar la estación actualmente seleccionada
 */
let currentSelectedStation = {
    stationCode: null,
    stationName: null,
    isVisited: false,
    visitId: null,
    currentVisitDate: null
};

/**
 * Abre el diálogo de una estación
 * @param {string} stationCode - Código de la estación (id del elemento SVG)
 * @param {string} stationName - Nombre de la estación
 * @param {boolean} isVisited - Si la estación ya ha sido visitada
 * @param {number} visitId - ID de la visita (si existe)
 * @param {number} visitDate - Fecha de la visita en unix (si existe)
 */
function openStationDialog(stationCode, stationName, isVisited, visitId = null, visitDate = null) {
    // Guardar información de la estación seleccionada
    currentSelectedStation = {
        stationCode: stationCode,
        stationName: stationName,
        isVisited: isVisited,
        visitId: visitId,
        currentVisitDate: visitDate
    };

    console.log(visitDate);

    // Mostrar el modal
    const modal = document.getElementById('stationDialog');
    const overlay = document.getElementById('modalOverlay');

    if (modal && overlay) {
        modal.style.display = 'flex';
        overlay.style.display = 'block';

        // Generar el contenido del diálogo según si está visitada o no
        const content = document.getElementById('stationDialogContent');
        content.innerHTML = buildStationDialogContent(isVisited, stationName, visitDate);

        // Conectar event listeners del diálogo
        attachDialogEventListeners();
    }
}

/**
 * Cierra el diálogo de estación
 */
function closeStationDialog() {
    const modal = document.getElementById('stationDialog');
    const overlay = document.getElementById('modalOverlay');

    if (modal && overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    // Limpiar información de estación seleccionada
    currentSelectedStation = {
        stationCode: null,
        stationName: null,
        isVisited: false,
        visitId: null,
        currentVisitDate: null
    };
}

/**
 * Construye el contenido HTML del diálogo dependiendo del estado de la estación
 * @param {boolean} isVisited - Si la estación ha sido visitada
 * @param {string} stationName - Nombre de la estación
 * @param {number} visitDate - Fecha de la visita en unix (si existe)
 * @returns {string} HTML del contenido del diálogo
 */
function buildStationDialogContent(isVisited, stationName, visitDate) {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;

    var thisStationName = '';
    for (s in appData.stations) {
        if (appData.stations[s].stationCode == stationName) {
            thisStationName = appData.stations[s].name;
        }
    }
    if (thisStationName == '') {
        console.log('no se ha encontrado el nombre');
    }

    if (!isVisited) {
        // Formulario para marcar como visitada
        return `
            <h3>Marcar como visitada</h3>
            <p>Estación: <strong>${thisStationName}</strong></p>
            <div class="dialog-form-group">
                <label for="visitDateInput">Fecha de visita:</label>
                <input 
                    type="date" 
                    id="visitDateInput" 
                    value="${todayDate}"
                    required
                >
            </div>
            <div class="dialog-actions">
                <button class="btn btn-primary" id="submitVisitBtn">
                    <span class="material-icons">check</span>
                    Marcar como visitada
                </button>
            </div>
        `;
    } else {
        // Formulario para editar o eliminar visita
        const visitDateObj = new Date(parseInt(visitDate));
        const visitYear = visitDateObj.getFullYear();
        const visitMonth = String(visitDateObj.getMonth() + 1).padStart(2, '0');
        const visitDay = String(visitDateObj.getDate()).padStart(2, '0');
        const formattedVisitDate = `${visitYear}-${visitMonth}-${visitDay}`;

        return `
            <h3>Editar visita</h3>
            <p>Estación: <strong>${thisStationName}</strong></p>
            <div class="dialog-form-group">
                <label for="visitDateInput">Fecha de visita:</label>
                <input 
                    type="date" 
                    id="visitDateInput" 
                    value="${formattedVisitDate}"
                    required
                >
            </div>
            <div class="dialog-actions">
                <button class="btn btn-primary" id="updateVisitBtn">
                    <span class="material-icons">edit</span>
                    Actualizar fecha
                </button>
                <button class="btn btn-danger" id="deleteVisitBtn">
                    <span class="material-icons">delete</span>
                    Eliminar visita
                </button>
            </div>
        `;
    }
}

/**
 * Conecta los event listeners de los botones del diálogo
 */
function attachDialogEventListeners() {
    // Botón de cerrar
    const closeBtn = document.getElementById('closeStationDialog');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeStationDialog);
    }

    // Cerrar al hacer click en el overlay
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeStationDialog);
    }

    // Botones de acción según el estado
    if (currentSelectedStation.isVisited) {
        // Diálogo de edición
        const updateBtn = document.getElementById('updateVisitBtn');
        const deleteBtn = document.getElementById('deleteVisitBtn');

        if (updateBtn) {
            updateBtn.addEventListener('click', updateVisit);
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteVisitWithConfirmation);
        }
    } else {
        // Diálogo de nueva visita
        const submitBtn = document.getElementById('submitVisitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitNewVisit);
        }
    }
}

/**
 * Envía una nueva visita a la base de datos
 */
async function submitNewVisit() {
    const visitDateInput = document.getElementById('visitDateInput');
    
    if (!visitDateInput.value) {
        alert('Por favor selecciona una fecha');
        return;
    }

    // Convertir la fecha a unix timestamp con 13 dígitos
    const visitDate = new Date(visitDateInput.value);
    visitDate.setHours(0, 0, 0, 0); // Establecer a medianoche UTC
    const unixTimestamp = visitDate.getTime(); // Ya está en milisegundos (13 dígitos)

    try {
        // Obtener información del usuario logeado
        const userStr = localStorage.getItem('metrovisit-user');
        const user = JSON.parse(userStr);

        // Obtener el sysId del sistema actualmente visualizado
        const currentSystem = getCurrentViewingSystem();
        if (!currentSystem) {
            console.error('Error: No se pudo determinar el sistema');
            return;
        }

        // Llamar a la función de base de datos para insertar la visita
        const result = await addVisit(
            user.userId,
            currentSelectedStation.stationCode,
            unixTimestamp,
            currentSystem
        );

        if (result.success) {
            // Actualizar appData con la nueva visita
            const newVisit = {
                visitId: result.visitId,
                userId: user.userId,
                stationCode: currentSelectedStation.stationCode,
                visitDate: unixTimestamp,
                sysId: currentSystem
            };
            appData.visits.push(newVisit);

            // Actualizar localStorage
            const lastRequested = JSON.parse(localStorage.getItem('metrovisit-lastRequested') || '{}');
            lastRequested.visits = appData.visits;
            localStorage.setItem('metrovisit-lastRequested', JSON.stringify(lastRequested));

            // Marcar la estación como visitada en el mapa
            const stationElement = document.getElementById(currentSelectedStation.stationCode);
            if (stationElement) {
                stationElement.classList.add('stationCircleVisited');
            }

            // Mostrar mensaje de éxito
            //alert('Estación marcada como visitada');
            showMessageMap('success','Se marca la estación como visitada');

            // Cerrar el diálogo
            closeStationDialog();

            // Recargar la página del mapa para actualizar la información
            displaySystemInfo();
            displayVisitedStations();
        } else {
            alert('Error al guardar la visita: ' + result.error);
        }
    } catch (error) {
        console.error('Error al guardar visita:', error);
        alert('Error al guardar la visita');
    }
}

/**
 * Actualiza una visita existente
 */
async function updateVisit() {
    const visitDateInput = document.getElementById('visitDateInput');
    
    if (!visitDateInput.value) {
        alert('Por favor selecciona una fecha');
        return;
    }

    // Convertir la fecha a unix timestamp con 13 dígitos
    const visitDate = new Date(visitDateInput.value);
    visitDate.setHours(0, 0, 0, 0); // Establecer a medianoche UTC
    const unixTimestamp = visitDate.getTime(); // Ya está en milisegundos (13 dígitos)

    console.log(currentSelectedStation.visitId);
    console.log(unixTimestamp);
    try {
        // Llamar a la función de base de datos para actualizar la visita
        const result = await updateVisitDate(currentSelectedStation.visitId, unixTimestamp);

        if (result.success) {
            // Actualizar appData
            const visitIndex = appData.visits.findIndex(v => v.visitId === currentSelectedStation.visitId);
            if (visitIndex !== -1) {
                appData.visits[visitIndex].visitDate = unixTimestamp;
            }

            // Actualizar localStorage
            const lastRequested = JSON.parse(localStorage.getItem('metrovisit-lastRequested') || '{}');
            lastRequested.visits = appData.visits;
            localStorage.setItem('metrovisit-lastRequested', JSON.stringify(lastRequested));

            // Mostrar mensaje de éxito
            //alert('Fecha de visita actualizada');
            showMessageMap('success','Se ha actualizado la fecha de la visita');

            // Cerrar el diálogo
            closeStationDialog();

            // Actualizar solo los paneles, no recargar toda la página
            displaySystemInfo();
            displayVisitedStations();
        } else {
            alert('Error al actualizar la visita: ' + result.error);
        }
    } catch (error) {
        console.error('Error al actualizar visita:', error);
        alert('Error al actualizar la visita');
    }
}

/**
 * Pide confirmación antes de eliminar una visita
 */
function deleteVisitWithConfirmation() {
    const confirm = window.confirm(`¿Estás seguro de que deseas eliminar esta visita a ${currentSelectedStation.stationName}?`);
    
    if (confirm) {
        deleteVisitRecord();
    }
}

/**
 * Elimina una visita de la base de datos
 */
async function deleteVisitRecord() {
    try {
        // Llamar a la función de base de datos para eliminar la visita
        const result = await deleteVisit(currentSelectedStation.visitId);

        if (result.success) {
            // Actualizar appData - eliminar la visita del array
            appData.visits = appData.visits.filter(v => v.visitId !== currentSelectedStation.visitId);

            // Actualizar localStorage
            const lastRequested = JSON.parse(localStorage.getItem('metrovisit-lastRequested') || '{}');
            lastRequested.visits = appData.visits;
            localStorage.setItem('metrovisit-lastRequested', JSON.stringify(lastRequested));

            // Eliminar la clase stationCircleVisited de la estación en el mapa
            const stationElement = document.getElementById(currentSelectedStation.stationCode);
            if (stationElement) {
                stationElement.classList.remove('stationCircleVisited');
            }

            // Mostrar mensaje de éxito
            //alert('Visita eliminada');
            showMessageMap('success','Se ha eliminado la visita');

            // Cerrar el diálogo
            closeStationDialog();

            // Actualizar solo los paneles, no recargar toda la página
            displaySystemInfo();
            displayVisitedStations();
        } else {
            alert('Error al eliminar la visita: ' + result.error);
        }
    } catch (error) {
        console.error('Error al eliminar visita:', error);
        alert('Error al eliminar la visita');
    }
}

/**
 * Actualiza los datos de visitas en localStorage
 */
function updateLocalStorageVisits() {
    const lastRequested = JSON.parse(localStorage.getItem('metrovisit-lastRequested') || '{}');
    
    // Obtener el usuario logeado
    const user = JSON.parse(localStorage.getItem('metrovisit-user'));
    const currentSystem = getCurrentViewingSystem();

    if (user && currentSystem) {
        // Recargar las visitas del usuario para este sistema desde la BD
        // Esto se hará en la función loadMapPage() cuando se recargue
    }
}

/**
 * Obtiene el sistema actualmente siendo visualizado
 * @returns {Object} Sistema actual o null
 */
function getCurrentViewingSystem() {
    return currentViewingSystem.sysId;
}

function showMessageMap(type, msg) {
    console.log('f:{showMessageMap('+type+', '+msg+')}');

    if (type=='success') { var icon = 'check_small';
    } else if (type=='error') { var icon = 'error';
    } else { var icon = 'info'; }

    var code = getRandomCode(5);
    
    // Crear elemento usando createElement para evitar problemas con HTML
    const messageContainer = document.getElementById('message-area');
    if (!messageContainer) {
        console.error('No se encontró el elemento #message-area');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message-item';
    messageDiv.id = 'message-item-' + code;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'material-icons';
    iconSpan.textContent = icon;
    
    const paragraph = document.createElement('p');
    paragraph.textContent = msg;
    
    messageDiv.appendChild(iconSpan);
    messageDiv.appendChild(paragraph);
    messageContainer.appendChild(messageDiv);

    setTimeout(function() {
        const element = document.getElementById('message-item-' + code);
        if (element) {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.2s ease-out';
            setTimeout(function() {
                element.remove();
            }, 200);
        }
    }, 4000);
}

/**
 * Convierte un timestamp unix a una fecha legible en zona horaria local
 * @param {number} unixTimestamp - Timestamp en milisegundos (13 dígitos)
 * @returns {string} Fecha formateada (DD/MM/YYYY)
 */
function formatUnixToLocalDate(unixTimestamp) {
    const date = new Date(unixTimestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getRandomCode(length) {
	var code = '';
	for (i=0;i<length;i++) {
		code += Math.floor(Math.random() * 10);
	}
	return code;
}