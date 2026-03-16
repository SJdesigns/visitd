/* ============================================================================
   APP.JS - Lógica principal y gestión de datos de la aplicación
   ============================================================================
   Este archivo contiene:
   - Inicialización de la aplicación
   - Carga de datos desde BD o localStorage
   - Funciones para cada página (home, systems, map, settings)
   - Manejo de datos globales
   ============================================================================ */

// ========== VARIABLES GLOBALES DE DATOS ==========

/**
 * Objeto que almacena los datos de la aplicación
 * Se cargan desde BD o desde localStorage si no hay conexión
 */

var firstLoad = true;
// esta variable detecta si se acaba de cargar la página para que se muestre un spinner esperando a recuperar los datos de la base de datos.
// Al ejecutarse la función loadHomePage() se mostrará la primera un spinner al cargar la página sin resultados, cuando se vuelva a ejecutar la funcion de nuevo ya aparecera el mensaje de que no hay sistemas añadidos aún si no hay respuestas.

const appData = {
    user: null,
    allSystems: [],
    userSystems: [],
    visits: [],
    stations: [],     // Todas las estaciones (ahora es array en lugar de objeto)
    svgCache: {}      // Caché de SVG cargados: { sysId: svgContent }
};

/**
 * Sistema actualmente siendo visualizado en el mapa
 */
let currentViewingSystem = null;

// ========== INICIALIZACIÓN ==========

/**
 * Inicializa la aplicación
 * Verifica autenticación y carga datos
 */
async function initApp() {
    // Inicializar base de datos (esperar a que se cargue la configuración)
    await initDatabase();

    // Verificar si el usuario está logeado
    const userStr = localStorage.getItem('metrovisit-user');
    if (!userStr) {
        // No está logeado, redirigir a login
        window.location.href = './login/index.html';
        return;
    }

    // Parsear datos del usuario
    try {
        appData.user = JSON.parse(userStr);
    } catch (error) {
        console.error('Error al parsear datos de usuario:', error);
        localStorage.removeItem('metrovisit-user');
        window.location.href = './login/index.html';
        return;
    }

    // Cargar datos de la aplicación
    await loadAppData();

    // Inicializar controles del mapa
    initMapControls();

    // La navegación ya se inicializa en pages.js
}

/**
 * Carga todos los datos necesarios para la aplicación
 * Intenta desde BD, fallback a localStorage
 */
async function loadAppData() {
    try {
        // Cargar todos los sistemas
        const systemsResult = await getAllSystems();
        if (systemsResult.success) {
            appData.allSystems = systemsResult.systems;
        }

        // Cargar todas las estaciones
        const stationsResult = await getAllStations();
        if (stationsResult.success) {
            appData.stations = stationsResult.stations;
        }

        // Cargar sistemas del usuario
        const userSystemsResult = await getUserSystems(appData.user.userId);
        if (userSystemsResult.success) {
            appData.userSystems = userSystemsResult.systems;
        }

        // Cargar visitas del usuario
        const visitsResult = await getAllUserVisits(appData.user.userId);
        if (visitsResult.success) {
            appData.visits = visitsResult.visits;
        }

        // Guardar en localStorage para offline
        saveToLocalStorage();

    } catch (error) {
        console.error('Error cargando datos de BD:', error);
        // Intentar cargar desde localStorage
        loadFromLocalStorage();
    }
}

/**
 * Guarda los datos actuales en localStorage
 */
function saveToLocalStorage() {
    const lastRequested = {
        systems: appData.allSystems,
        userSystems: appData.userSystems,
        visits: appData.visits,
        timestamp: new Date().getTime()
    };
    localStorage.setItem('metrovisit-lastRequested', JSON.stringify(lastRequested));

    loadHomePage();
}

/**
 * Carga los datos desde localStorage (modo offline)
 */
function loadFromLocalStorage() {
    const stored = localStorage.getItem('metrovisit-lastRequested');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            appData.allSystems = data.systems || [];
            appData.userSystems = data.userSystems || [];
            appData.visits = data.visits || [];
            console.log('Datos cargados desde localStorage (modo offline)');
        } catch (error) {
            console.error('Error al cargar desde localStorage:', error);
        }
    }
}

// ========== PÁGINA HOME ==========

/**
 * Carga y renderiza la página home
 */
function loadHomePage() {
    const systemsList = document.getElementById('systemsList');
    const noSystemsMessage = document.getElementById('noSystemsMessage');
    const systemsLoad = document.getElementById('systemsLoading');

    if (!systemsList) return;

    // Limpiar contenido anterior
    systemsList.innerHTML = '';

    if (appData.userSystems.length === 0) {
        if (firstLoad) {
            systemsLoad.style.display = 'flex';
            noSystemsMessage.style.display = 'none';
            systemsList.style.display = 'none';
            firstLoad = false;
        } else {
            // Mostrar mensaje de no sistemas
            if (noSystemsMessage) {
                noSystemsMessage.style.display = 'flex';
            }
            systemsList.style.display = 'none';
            systemsLoad.style.display = 'none';
        }
    } else {
        // Mostrar sistemas del usuario
        if (noSystemsMessage) {
            noSystemsMessage.style.display = 'none';
        }
        systemsLoad.style.display = 'none';
        systemsList.style.display = 'grid';

        appData.userSystems.forEach(system => {
            const systemCard = createSystemCard(system, 'home');
            systemsList.appendChild(systemCard);
        });
    }
}

/**
 * Crea una tarjeta de sistema para mostrar en home o systems
 * @param {Object} system - Datos del sistema
 * @param {string} context - 'home' o 'systems' para determinar el botón
 * @returns {HTMLElement} Elemento de la tarjeta
 */
function createSystemCard(system, context = 'home') {
    const card = document.createElement('div');
    card.className = 'system-card';

    const logoUrl = `./img/${system.logo}`;
    const visitedCount = appData.visits.filter(v => v.sysId === system.sysId).length;
    var countryFlagHtml = setCountryFlag(system.country);
    if (system.lines==undefined || system.lines==null) {
        var numLines = 0;
    } else {
        var numLines = system.lines.length;
    }
    var percentCompleted = Math.round(((visitedCount * 100) / system.stations)*10) /10;

    let contentHome = `
        <div class="systemCardTop">
            <div class="systemCardLogo">
                <img src="${logoUrl}" alt="${system.name}" />
            </div>
            <div class="systemCardTitle">
                <p>${system.name}</p>
                <div class="systemCardCountry">
                    ${countryFlagHtml}
                </div>
            </div>
        </div>
        <div class="systemCardMiddle">
            <div><p>${numLines} lineas</p></div>
            <div><p>${system.stations} estaciones</p></div>
            <div><p>${system.length} km</p></div>
        </div>
        <div class="systemCardBottom">
            <div class="systemCardProgress">
                <div class="systemCardProgressThumb" style="width: ${percentCompleted}%"></div>
            </div>
            <p>${percentCompleted}%</p>
        </div>
    `;

    let contentAllSystems = `
        <div class="systemCardTop">
            <div class="systemCardLogo">
                <img src="${logoUrl}" alt="${system.name}" />
            </div>
            <div class="systemCardTitle">
                <p>${system.name}</p>
                <div class="systemCardCountry">
                    ${countryFlagHtml}
                </div>
            </div>
        </div>
        <div class="systemCardMiddle systemCardMiddleCentered">
            <div><p>${numLines} lineas</p></div>
            <div><p>${system.stations} estaciones</p></div>
            <div><p>${system.length} km</p></div>
        </div>
        <div class="systemCardAdd">
            <button class="btn btn-primary btn-add-system">
                <span class="material-icons">add</span>
                Añadir
            </button>
        </div>
    `;

    if (context === 'home') {
        card.innerHTML = contentHome;

        // Hacer la tarjeta clickable para ir al mapa
        card.addEventListener('click', () => {
            currentViewingSystem = system;
            changePage('map');
        });
    } else {
        card.innerHTML = contentAllSystems;

        // Botón para añadir sistema
        const addBtn = card.querySelector('.btn-add-system');
        if (addBtn) {
            addBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await addSystemToUserSystems(system);
            });
        }
    }

    return card;
}

/**
 * Añade un sistema a los favoritos del usuario
 * @param {Object} system - Sistema a añadir
 */
async function addSystemToUserSystems(system) {
    try {
        const result = await addSystemToUser(appData.user.userId, system.sysId);

        if (result.success) {
            // Añadir al array local
            appData.userSystems.push(system);

            // Guardar en localStorage
            saveToLocalStorage();

            // Mostrar mensaje
            alert(`${system.name} añadido a tus sistemas`);

            // Volver a home
            changePage('home');
        } else {
            alert('Error al añadir el sistema: ' + result.error);
        }
    } catch (error) {
        console.error('Error al añadir sistema:', error);
        alert('Error al añadir el sistema');
    }
}

// ========== PÁGINA SYSTEMS ==========

/**
 * Carga y renderiza la página systems
 */
function loadSystemsPage() {
    const allSystemsList = document.getElementById('allSystemsList');

    if (!allSystemsList) return;

    // Limpiar contenido anterior
    allSystemsList.innerHTML = '';

    // Mostrar solo los sistemas que no están en userSystems
    const userSysIds = appData.userSystems.map(s => s.sysId);
    const availableSystems = appData.allSystems.filter(s => !userSysIds.includes(s.sysId));

    if (availableSystems.length === 0) {
        allSystemsList.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span class="material-icons">done_all</span>
                <p>Ya tienes todos los sistemas</p>
            </div>
        `;
        return;
    }

    availableSystems.forEach(system => {
        const systemCard = createSystemCard(system, 'systems');
        allSystemsList.appendChild(systemCard);
    });
}

// ========== PÁGINA MAP ==========

/**
 * Objeto para almacenar mapas SVG en caché
 */
const svgMapCache = {};

/**
 * Carga y renderiza la página map
 */
async function loadMapPage() {
    if (!currentViewingSystem) {
        changePage('home');
        return;
    }

    //console.log(currentViewingSystem);

    const mapContent = document.getElementById('mapContent');
    if (!mapContent) return;

    try {
        // Cargar el SVG del mapa
        await loadSystemSVG(currentViewingSystem, mapContent);

        // Mostrar información del sistema
        displaySystemInfo();

        // Mostrar y actualizar lista de estaciones visitadas
        displayVisitedStations();

        // Marcar estaciones visitadas en el mapa
        markVisitedStations();

        // Conectar event listeners a las estaciones
        attachStationClickListeners();

        // Inicializar interacción del mapa (drag, zoom)
        setupMapInteraction();

    } catch (error) {
        console.error('Error cargando mapa:', error);
        mapContent.innerHTML = `
            <div id="loadMapError">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M508.5-291.5Q520-303 520-320t-11.5-28.5Q497-360 480-360t-28.5 11.5Q440-337 440-320t11.5 28.5Q463-280 480-280t28.5-11.5ZM440-440h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>
                <p>No se ha podido cargar el mapa de este sistema, pruebe de nuevo.</p>
            </div>
        `;
    }
}

/**
 * Carga el SVG de un sistema desde archivo o caché
 * @param {Object} system - Sistema de metro
 * @param {HTMLElement} container - Contenedor donde insertar el SVG
 */
async function loadSystemSVG(system, container) {
    // Verificar si ya está en caché
    if (svgMapCache[system.sysId]) {
        container.innerHTML = svgMapCache[system.sysId];
        return;
    }

    try {
        const svgPath = `./maps/${system.mapFile}`;
        const response = await fetch(svgPath);

        if (!response.ok) {
            throw new Error(`Error cargando SVG: ${response.status}`);
        }

        const svgContent = await response.text();

        // Guardar en caché
        svgMapCache[system.sysId] = svgContent;

        // Insertar en el contenedor
        container.innerHTML = svgContent;

    } catch (error) {
        console.error('Error cargando SVG:', error);
        container.innerHTML = '<p>Error al cargar el mapa</p>';
        throw error;
    }
}

/**
 * Muestra la información del sistema en el panel derecho
 */
function displaySystemInfo() {
    const systemInfoContent = document.getElementById('systemInfoContent');
    if (!systemInfoContent) return;

    const visitedCount = appData.visits.filter(v => v.sysId === currentViewingSystem.sysId).length;
    var country = setCountryFlag(currentViewingSystem.country, true);

    systemInfoContent.innerHTML = `
        <div class="info-item">
            <span class="label">Red:</span>
            <span class="value">`+ country +`${currentViewingSystem.name}</span>
        </div>
        <div class="info-item">
            <span class="label">Estaciones visitadas:</span>
            <span class="value">${visitedCount} / ${currentViewingSystem.stations}</span>
        </div>
        <div class="info-item">
            <span class="label">Progreso:</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(visitedCount / currentViewingSystem.stations * 100)}%"></div>
            </div>
        </div>
        <div class="info-item">
            <span class="label">Longitud:</span>
            <span class="value">${currentViewingSystem.length} km</span>
        </div>
    `;
}

/**
 * Muestra la lista de estaciones visitadas en el panel derecho
 */
function displayVisitedStations() {
    const visitedList = document.getElementById('visitedStationsList');
    const visitedCount = document.getElementById('visitedCount');

    if (!visitedList) return;

    //console.log(appData);

    const visits = appData.visits
        .filter(v => v.sysId === currentViewingSystem.sysId)
        .sort((a, b) => parseInt(b.visitDate) - parseInt(a.visitDate));
    
    if (visitedCount) {
        visitedCount.textContent = visits.length;
    }

    if (visits.length === 0) {
        visitedList.innerHTML = '<p class="empty-text">No has visitado estaciones aún</p>';
        return;
    }

    visitedList.innerHTML = '';

    visits.forEach(visit => {
        const visitDate = new Date(visit.visitDate);
        const formattedDate = formatUnixToLocalDate(visit.visitDate);

        const item = document.createElement('div');
        item.className = 'visited-item';

        for (i in appData.stations) {
            var linesHtml = '';
            if (appData.stations[i].stationCode == visit.stationCode) {
                //console.log(appData.stations[i].lines);
                var lines = appData.stations[i].lines;
                for (j in lines) {
                    var lineColor = '';
                    var lineText = '';
                    var lineBorder = '';
                    
                    for (l in currentViewingSystem.lines) {
                        var lineData = currentViewingSystem.lines[l].split('|');
                        //console.log(currentViewingSystem.lines[l].split('|')[1]);
                        //console.log(lines[j]);
                        if (lineData[1] == lines[j]) {
                            lineColor = lineData[2];
                            lineText = lineData[3];
                            if (lineData[4] != undefined) {
                                lineBorder = lineData[4];
                            }
                        }
                    }

                    //console.log(lines[j]);
                    if (lineColor != '' && lineText != '') {
                        if (lineBorder != '') {
                            linesHtml += '<div class="visited-line" style="background-color: #'+lineColor+'; color: #'+lineText+'; border:  1px solid #'+lineBorder+'">'+lines[j]+'</div>';
                        } else {
                            linesHtml += '<div class="visited-line" style="background-color: #'+lineColor+'; color: #'+lineText+'">'+lines[j]+'</div>';
                        }
                    } else {
                        linesHtml += '<div class="visited-line">'+lines[j]+'</div>';
                    }   
                }
                item.innerHTML = `
                    <div class="visited-info">
                        <p class="visited-code">`+appData.stations[i].name+`</p>
                        <div class="visited-lines">`+linesHtml+`</div>
                    </div>`;
            }
        }

        // esto era parte del código html del innerHTML anterior.
        //<p class="visited-date">${formattedDate}</p>

        visitedList.appendChild(item);
    });
}

/**
 * Marca las estaciones visitadas en el SVG
 */
function markVisitedStations() {
    const visits = appData.visits.filter(v => v.sysId === currentViewingSystem.sysId);
    const visitedCodes = visits.map(v => v.stationCode);

    // Buscar todos los elementos con clase stationCircle
    const stationElements = document.querySelectorAll('.stationCircle');

    stationElements.forEach(element => {
        const stationCode = element.id;

        // Si esta estación ha sido visitada, añadir la clase
        if (visitedCodes.includes(stationCode)) {
            element.classList.add('stationCircleVisited');
        }
    });
}

/**
 * Conecta los event listeners a las estaciones del mapa
 */
function attachStationClickListeners() {
    const stationElements = document.querySelectorAll('.stationCircle');

    stationElements.forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que se active el drag del mapa

            const stationCode = element.id;
            const isVisited = element.classList.contains('stationCircleVisited');

            // Obtener la visita si existe
            let visitId = null;
            let visitDate = null;
            if (isVisited) {
                const visit = appData.visits.find(v => 
                    v.stationCode === stationCode && 
                    v.sysId === currentViewingSystem.sysId
                );
                if (visit) {
                    visitId = visit.visitId;
                    visitDate = visit.visitDate;
                }
            }

            // Abrir el diálogo
            // El nombre de la estación se obtendría de la BD si fuera necesario
            openStationDialog(stationCode, stationCode, isVisited, visitId, visitDate);
        });
    });
}

// ========== PÁGINA SETTINGS ==========

/**
 * Carga y renderiza la página settings
 */
function loadSettingsPage() {
    const usernameEl = document.getElementById('settingsUsername');
    const joinDateEl = document.getElementById('settingsJoinDate');
    const logoutBtn = document.getElementById('logoutBtn');

    if (usernameEl) {
        usernameEl.textContent = appData.user.username;
    }

    if (joinDateEl) {
        const joinDate = new Date(parseInt(appData.user.joinDate));
        joinDateEl.textContent = formatUnixToLocalDate(parseInt(appData.user.joinDate));
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

/**
 * Maneja el cierre de sesión
 */
function handleLogout() {
    const confirm = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
    
    if (confirm) {
        // Eliminar datos del usuario
        localStorage.removeItem('metrovisit-user');
        
        // Redirigir a login
        window.location.href = './login/index.html';
    }
}

function setCountryFlag(code, onlyFlag=false) {
    var countries = { "AF": "Afganistán", "AX": "Islas Åland", "AL": "Albania", "DZ": "Argelia", "AS": "Samoa Americana", "AD": "Andorra", "AO": "Angola", "AI": "Anguila", "AQ": "Antártida", "AG": "Antigua y Barbuda", "AR": "Argentina", "AM": "Armenia", "AW": "Aruba", "AU": "Australia", "AT": "Austria", "AZ": "Azerbaiyán", "BS": "Bahamas", "BH": "Baréin", "BD": "Bangladés", "BB": "Barbados", "BY": "Bielorrusia", "BE": "Bélgica", "BZ": "Belice", "BJ": "Benín", "BM": "Bermudas", "BT": "Bután", "BO": "Bolivia", "BQ": "Caribe Neerlandés", "BA": "Bosnia y Herzegovina", "BW": "Botsuana", "BV": "Isla Bouvet", "BR": "Brasil", "IO": "Territorio Británico del Océano Índico", "BN": "Brunéi", "BG": "Bulgaria", "BF": "Burkina Faso", "BI": "Burundi", "CV": "Cabo Verde", "KH": "Camboya", "CM": "Camerún", "CA": "Canadá", "KY": "Islas Caimán", "CF": "República Centroafricana", "TD": "Chad", "CL": "Chile", "CN": "China", "CX": "Isla de Navidad", "CC": "Islas Cocos", "CO": "Colombia", "KM": "Comoras", "CG": "Congo", "CD": "República Democrática del Congo", "CK": "Islas Cook", "CR": "Costa Rica", "CI": "Costa de Marfil", "HR": "Croacia", "CU": "Cuba", "CW": "Curazao", "CY": "Chipre", "CZ": "Chequia", "DK": "Dinamarca", "DJ": "Yibuti", "DM": "Dominica", "DO": "República Dominicana", "EC": "Ecuador", "EG": "Egipto", "SV": "El Salvador", "GQ": "Guinea Ecuatorial", "ER": "Eritrea", "EE": "Estonia", "SZ": "Esuatini", "ET": "Etiopía", "FK": "Islas Malvinas", "FO": "Islas Feroe", "FJ": "Fiyi", "FI": "Finlandia", "FR": "Francia", "GF": "Guayana Francesa", "PF": "Polinesia Francesa", "TF": "Territorios Australes Franceses", "GA": "Gabón", "GM": "Gambia", "GE": "Georgia", "DE": "Alemania", "GH": "Ghana", "GI": "Gibraltar", "GR": "Grecia", "GL": "Groenlandia", "GD": "Granada", "GP": "Guadalupe", "GU": "Guam", "GT": "Guatemala", "GG": "Guernsey", "GN": "Guinea", "GW": "Guinea-Bisáu", "GY": "Guyana", "HT": "Haití", "HM": "Islas Heard y McDonald", "VA": "Ciudad del Vaticano", "HN": "Honduras", "HK": "Hong Kong", "HU": "Hungría", "IS": "Islandia", "IN": "India", "ID": "Indonesia", "IR": "Irán", "IQ": "Irak", "IE": "Irlanda", "IM": "Isla de Man", "IL": "Israel", "IT": "Italia", "JM": "Jamaica", "JP": "Japón", "JE": "Jersey", "JO": "Jordania", "KZ": "Kazajistán", "KE": "Kenia", "KI": "Kiribati", "KP": "Corea del Norte", "KR": "Corea del Sur", "KW": "Kuwait", "KG": "Kirguistán", "LA": "Laos", "LV": "Letonia", "LB": "Líbano", "LS": "Lesoto", "LR": "Liberia", "LY": "Libia", "LI": "Liechtenstein", "LT": "Lituania", "LU": "Luxemburgo", "MO": "Macao", "MG": "Madagascar", "MW": "Malaui", "MY": "Malasia", "MV": "Maldivas", "ML": "Malí", "MT": "Malta", "MH": "Islas Marshall", "MQ": "Martinica", "MR": "Mauritania", "MU": "Mauricio", "YT": "Mayotte", "MX": "México", "FM": "Micronesia", "MD": "Moldavia", "MC": "Mónaco", "MN": "Mongolia", "ME": "Montenegro", "MS": "Montserrat", "MA": "Marruecos", "MZ": "Mozambique", "MM": "Birmania", "NA": "Namibia", "NR": "Nauru", "NP": "Nepal", "NL": "Países Bajos", "NC": "Nueva Caledonia", "NZ": "Nueva Zelanda", "NI": "Nicaragua", "NE": "Níger", "NG": "Nigeria", "NU": "Niue", "NF": "Isla Norfolk", "MK": "Macedonia del Norte", "MP": "Islas Marianas del Norte", "NO": "Noruega", "OM": "Omán", "PK": "Pakistán", "PW": "Palaos", "PS": "Palestina", "PA": "Panamá", "PG": "Papúa Nueva Guinea", "PY": "Paraguay", "PE": "Perú", "PH": "Filipinas", "PN": "Islas Pitcairn", "PL": "Polonia", "PT": "Portugal", "PR": "Puerto Rico", "QA": "Catar", "RE": "Reunión", "RO": "Rumanía", "RU": "Rusia", "RW": "Ruanda", "BL": "San Bartolomé", "SH": "Santa Elena", "KN": "San Cristóbal y Nieves", "LC": "Santa Lucía", "MF": "San Martín", "PM": "San Pedro y Miquelón", "VC": "San Vicente y las Granadinas", "WS": "Samoa", "SM": "San Marino", "ST": "Santo Tomé y Príncipe", "SA": "Arabia Saudita", "SN": "Senegal", "RS": "Serbia", "SC": "Seychelles", "SL": "Sierra Leona", "SG": "Singapur", "SX": "Sint Maarten", "SK": "Eslovaquia", "SI": "Eslovenia", "SB": "Islas Salomón", "SO": "Somalia", "ZA": "Sudáfrica", "GS": "Islas Georgias del Sur y Sandwich del Sur", "SS": "Sudán del Sur", "ES": "España", "LK": "Sri Lanka", "SD": "Sudán", "SR": "Surinam", "SJ": "Svalbard y Jan Mayen", "SE": "Suecia", "CH": "Suiza", "SY": "Siria", "TW": "Taiwán", "TJ": "Tayikistán", "TZ": "Tanzania", "TH": "Tailandia", "TL": "Timor Oriental", "TG": "Togo", "TK": "Tokelau", "TO": "Tonga", "TT": "Trinidad y Tobago", "TN": "Túnez", "TR": "Turquía", "TM": "Turkmenistán", "TC": "Islas Turcas y Caicos", "TV": "Tuvalu", "UG": "Uganda", "UA": "Ucrania", "AE": "Emiratos Árabes Unidos", "GB": "Reino Unido", "US": "Estados Unidos", "UM": "Islas Ultramarinas Menores de EE. UU.", "UY": "Uruguay", "UZ": "Uzbekistán", "VU": "Vanuatu", "VE": "Venezuela", "VN": "Vietnam", "VG": "Islas Vírgenes Británicas", "VI": "Islas Vírgenes de EE. UU.", "WF": "Wallis y Futuna", "EH": "Sáhara Occidental", "YE": "Yemen", "ZM": "Zambia", "ZW": "Zimbabue" };
    var codeMayus = code.toUpperCase();

    var html = '';

    if (onlyFlag) {
        html += '<img src="img/countryFlags/'+code.toLowerCase()+'.svg" />';
    } else {
        html += '<img src="img/countryFlags/'+code.toLowerCase()+'.svg" />';
        html += '<p>'+countries[codeMayus].toLowerCase()+'</p>';
    }

    return html;
}

// ========== INICIALIZACIÓN DEL DOM ==========

// Esperar a que la configuración de Supabase esté lista, luego iniciar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📡 Esperando a que la configuración de Supabase esté lista...');
    if (window.configPromise) {
        await window.configPromise;
    }
    console.log('✅ Configuración lista, iniciando aplicación...');
    await initApp();
});