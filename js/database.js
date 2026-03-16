/* ============================================================================
   DATABASE.JS - Gestión genérica de conexiones a base de datos
   ============================================================================
   Este archivo contiene funciones genéricas para interactuar con Supabase.
   
   OBJETIVO: Centralizar toda la lógica de base de datos en un único lugar
   para que si en el futuro se cambia de proveedor de BD, solo haya que
   modificar este archivo.

   Las variables de Supabase se cargan automáticamente desde loadConfig.js
   ============================================================================ */

// Variable global para el cliente de Supabase
let supabaseClient;

/**
 * Espera a que la configuración de Supabase esté lista
 * Retorna una promesa que se resuelve cuando las variables están disponibles
 */
async function waitForConfig() {
    return new Promise((resolve) => {
        // Si supabaseUrl ya está definido, resolver inmediatamente
        if (typeof supabaseUrl !== 'undefined' && typeof supabaseKey !== 'undefined') {
            resolve();
            return;
        }
        
        // Si no, esperar a que se defina
        const checkInterval = setInterval(() => {
            if (typeof supabaseUrl !== 'undefined' && typeof supabaseKey !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            }
        }, 50); // Comprobar cada 50ms
        
        // Timeout de 5 segundos
        setTimeout(() => {
            clearInterval(checkInterval);
            console.warn('Timeout esperando configuración de Supabase');
            resolve();
        }, 5000);
    });
}

/**
 * Inicializa la conexión a Supabase
 * Debe llamarse después de que el script de Supabase esté cargado
 * Ahora espera automáticamente a que la configuración esté disponible
 */
async function initDatabase() {
    // Esperar a que la configuración esté lista
    await waitForConfig();
    
    if (typeof supabase !== 'undefined') {
        if (typeof supabaseUrl !== 'undefined' && typeof supabaseKey !== 'undefined') {
            supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
            console.log('Base de datos inicializada correctamente');
        } else {
            console.error('supabaseUrl y supabaseKey no están definidos');
        }
    } else {
        console.error('Supabase no está cargado');
    }
}

/**
 * Función genérica para realizar consultas a la base de datos
 * 
 * Esta función abstrae la lógica de Supabase para permitir cambios futuros
 * sin afectar el resto del código
 * 
 * @param {Object} params - Parámetros de la consulta
 * @param {string} params.table - Nombre de la tabla
 * @param {string} params.method - Tipo de operación: 'select', 'insert', 'update', 'delete'
 * @param {Object} params.data - Datos para insert/update
 * @param {Array} params.columns - Columnas a seleccionar (para select)
 * @param {Array} params.filters - Filtros donde [{ field: 'fieldName', operator: 'eq', value: 'value' }]
 * @param {string} params.orderBy - Campo para ordenar
 * @param {string} params.orderDirection - 'asc' o 'desc'
 * @returns {Promise<Object>} { success: boolean, data: any, error: string }
 */
async function dbQuery(params) {
    try {
        // Validar que el cliente de Supabase está inicializado
        if (!supabaseClient) {
            throw new Error('Base de datos no inicializada. Llama a initDatabase() primero.');
        }

        let query = supabaseClient.from(params.table);

        // ====== SELECT ======
        if (params.method === 'select') {
            // Seleccionar columnas específicas o todas
            const columns = params.columns ? params.columns.join(',') : '*';
            query = query.select(columns);

            // Aplicar filtros
            if (params.filters && Array.isArray(params.filters)) {
                for (const filter of params.filters) {
                    // Operador por defecto es 'eq' (equal)
                    const operator = filter.operator || 'eq';
                    query = query[operator](filter.field, filter.value);
                }
            }

            // Aplicar orden
            if (params.orderBy) {
                const ascending = params.orderDirection !== 'desc';
                query = query.order(params.orderBy, { ascending });
            }

            const { data, error } = await query;
            if (error) throw error;

            return {
                success: true,
                data: data,
                error: null
            };
        }

        // ====== INSERT ======
        else if (params.method === 'insert') {
            if (!params.data) {
                throw new Error('El método INSERT requiere un campo "data"');
            }

            const { data, error } = await query.insert([params.data]).select();
            if (error) throw error;

            return {
                success: true,
                data: data,
                error: null
            };
        }

        // ====== UPDATE ======
        else if (params.method === 'update') {
            if (!params.data) {
                throw new Error('El método UPDATE requiere un campo "data"');
            }

            if (!params.filters || params.filters.length === 0) {
                throw new Error('El método UPDATE requiere filtros para saber qué actualizar');
            }

            // Iniciar query con tabla y update()
            query = supabaseClient.from(params.table).update(params.data);

            // Aplicar filtros DESPUÉS de update()
            if (params.filters && Array.isArray(params.filters)) {
                for (const filter of params.filters) {
                    const operator = filter.operator || 'eq';
                    query = query[operator](filter.field, filter.value);
                }
            }

            // Ejecutar la consulta
            const { data: updateData, error: updateError } = await query.select();
            if (updateError) throw updateError;

            return {
                success: true,
                data: updateData,
                error: null
            };
        }

        // ====== DELETE ======
        else if (params.method === 'delete') {
            if (!params.filters || params.filters.length === 0) {
                throw new Error('El método DELETE requiere filtros para saber qué eliminar');
            }

            // Iniciar query con tabla y delete()
            query = supabaseClient.from(params.table).delete();

            // Aplicar filtros DESPUÉS de delete()
            if (params.filters && Array.isArray(params.filters)) {
                for (const filter of params.filters) {
                    const operator = filter.operator || 'eq';
                    query = query[operator](filter.field, filter.value);
                }
            }

            // Ejecutar la consulta
            const { data: deleteData, error: deleteError } = await query.select();
            if (deleteError) throw deleteError;

            return {
                success: true,
                data: deleteData,
                error: null
            };
        }

        else {
            throw new Error(`Método desconocido: ${params.method}`);
        }

    } catch (error) {
        console.error('Error en consulta a BD:', error);
        return {
            success: false,
            data: null,
            error: error.message
        };
    }
}

/**
 * Función específica para obtener un usuario por username y contraseña
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña encriptada
 * @returns {Promise<Object>} { success: boolean, user: Object, error: string }
 */
async function getUserByUsernamePassword(username, password) {
    const result = await dbQuery({
        table: 'users',
        method: 'select',
        columns: ['userId', 'username', 'password', 'joinDate', 'theme', 'active', 'admin'],
        filters: [
            { field: 'username', operator: 'eq', value: username },
            { field: 'password', operator: 'eq', value: password },
            { field: 'active', operator: 'eq', value: true }
        ]
    });

    if (result.success && result.data.length > 0) {
        return {
            success: true,
            user: result.data[0],
            error: null
        };
    }

    return {
        success: false,
        user: null,
        error: result.error || 'Usuario no encontrado'
    };
}

/**
 * Obtiene todos los sistemas de metro disponibles
 * @returns {Promise<Object>} { success: boolean, systems: Array, error: string }
 */
async function getAllSystems() {
    const result = await dbQuery({
        table: 'mv-system',
        method: 'select',
        columns: ['sysId', 'name', 'stations', 'length', 'logo', 'lines', 'country', 'mapFile']
    });

    return {
        success: result.success,
        systems: result.success ? result.data : [],
        error: result.error
    };
}

/**
 * Obtiene los sistemas de metro asociados a un usuario específico
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} { success: boolean, systems: Array, error: string }
 */
async function getUserSystems(userId) {
    // Primero obtener los IDs de sistemas del usuario
    const userSysResult = await dbQuery({
        table: 'mv-userSystem',
        method: 'select',
        filters: [{ field: 'userId', operator: 'eq', value: userId }]
    });

    if (!userSysResult.success) {
        return {
            success: false,
            systems: [],
            error: userSysResult.error
        };
    }

    // Si el usuario no tiene sistemas, retornar array vacío
    if (userSysResult.data.length === 0) {
        return {
            success: true,
            systems: [],
            error: null
        };
    }

    // Obtener los detalles de cada sistema
    const sysIds = userSysResult.data.map(row => row.sysId);
    const systemsResult = await dbQuery({
        table: 'mv-system',
        method: 'select',
        columns: ['sysId', 'name', 'stations', 'length', 'logo', 'lines', 'country', 'mapFile']
    });

    if (!systemsResult.success) {
        return {
            success: false,
            systems: [],
            error: systemsResult.error
        };
    }

    // Filtrar solo los sistemas del usuario
    const userSystems = systemsResult.data.filter(sys => sysIds.includes(sys.sysId));

    return {
        success: true,
        systems: userSystems,
        error: null
    };
}

/**
 * Añade un sistema de metro a los favoritos de un usuario
 * @param {number} userId - ID del usuario
 * @param {number} sysId - ID del sistema
 * @returns {Promise<Object>} { success: boolean, error: string }
 */
async function addSystemToUser(userId, sysId) {
    const result = await dbQuery({
        table: 'mv-userSystem',
        method: 'insert',
        data: {
            userId: userId,
            sysId: sysId
        }
    });

    return {
        success: result.success,
        error: result.error
    };
}

/**
 * Obtiene las estaciones de un sistema específico
 * @param {number} sysId - ID del sistema
 * @returns {Promise<Object>} { success: boolean, stations: Array, error: string }
 */
async function getStationsBySystem(sysId) {
    const result = await dbQuery({
        table: 'mv-station',
        method: 'select',
        filters: [{ field: 'sysId', operator: 'eq', value: sysId }]
    });

    return {
        success: result.success,
        stations: result.success ? result.data : [],
        error: result.error
    };
}

/**
 * Obtiene TODAS las estaciones de todos los sistemas
 * @returns {Promise<Object>} { success: boolean, stations: Array, error: string }
 */
async function getAllStations() {
    const result = await dbQuery({
        table: 'mv-station',
        method: 'select'
    });

    return {
        success: result.success,
        stations: result.success ? result.data : [],
        error: result.error
    };
}

/**
 * Obtiene las visitas de un usuario en un sistema específico
 * @param {number} userId - ID del usuario
 * @param {number} sysId - ID del sistema
 * @returns {Promise<Object>} { success: boolean, visits: Array, error: string }
 */
async function getUserVisitsBySystem(userId, sysId) {
    const result = await dbQuery({
        table: 'mv-visit',
        method: 'select',
        filters: [
            { field: 'userId', operator: 'eq', value: userId },
            { field: 'sysId', operator: 'eq', value: sysId }
        ]
    });

    return {
        success: result.success,
        visits: result.success ? result.data : [],
        error: result.error
    };
}

/**
 * Obtiene todas las visitas de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object>} { success: boolean, visits: Array, error: string }
 */
async function getAllUserVisits(userId) {
    const result = await dbQuery({
        table: 'mv-visit',
        method: 'select',
        filters: [{ field: 'userId', operator: 'eq', value: userId }]
    });

    return {
        success: result.success,
        visits: result.success ? result.data : [],
        error: result.error
    };
}

/**
 * Añade una visita a una estación
 * @param {number} userId - ID del usuario
 * @param {string} stationCode - Código de la estación
 * @param {number} visitDate - Fecha en formato unix (13 dígitos)
 * @param {number} sysId - ID del sistema
 * @returns {Promise<Object>} { success: boolean, visitId: number, error: string }
 */
async function addVisit(userId, stationCode, visitDate, sysId) {
    const result = await dbQuery({
        table: 'mv-visit',
        method: 'insert',
        data: {
            userId: userId,
            stationCode: stationCode,
            visitDate: visitDate,
            sysId: sysId
        }
    });

    if (result.success && result.data.length > 0) {
        console.log('visita introducida con exito');
        return {
            success: true,
            visitId: result.data[0].visitId,
            error: null
        };
    }

    return {
        success: false,
        visitId: null,
        error: result.error
    };
}

/**
 * Actualiza la fecha de una visita existente
 * @param {number} visitId - ID de la visita
 * @param {number} newVisitDate - Nueva fecha en formato unix (13 dígitos)
 * @returns {Promise<Object>} { success: boolean, error: string }
 */
async function updateVisitDate(visitId, newVisitDate) {
    const result = await dbQuery({
        table: 'mv-visit',
        method: 'update',
        filters: [{ field: 'visitId', operator: 'eq', value: visitId }],
        data: {
            visitDate: newVisitDate
        }
    });

    return {
        success: result.success,
        error: result.error
    };
}

/**
 * Elimina una visita
 * @param {number} visitId - ID de la visita
 * @returns {Promise<Object>} { success: boolean, error: string }
 */
async function deleteVisit(visitId) {
    const result = await dbQuery({
        table: 'mv-visit',
        method: 'delete',
        filters: [{ field: 'visitId', operator: 'eq', value: visitId }]
    });

    return {
        success: result.success,
        error: result.error
    };
}

/**
 * Obtiene información de un sistema específico
 * @param {number} sysId - ID del sistema
 * @returns {Promise<Object>} { success: boolean, system: Object, error: string }
 */
async function getSystemById(sysId) {
    const result = await dbQuery({
        table: 'mv-system',
        method: 'select',
        filters: [{ field: 'sysId', operator: 'eq', value: sysId }]
    });

    if (result.success && result.data.length > 0) {
        return {
            success: true,
            system: result.data[0],
            error: null
        };
    }

    return {
        success: false,
        system: null,
        error: result.error
    };
}

/**
 * Obtiene una visita específica por su ID
 * @param {number} visitId - ID de la visita
 * @returns {Promise<Object>} { success: boolean, visit: Object, error: string }
 */
async function getVisitById(visitId) {
    const result = await dbQuery({
        table: 'mv-visit',
        method: 'select',
        filters: [{ field: 'visitId', operator: 'eq', value: visitId }]
    });

    if (result.success && result.data.length > 0) {
        return {
            success: true,
            visit: result.data[0],
            error: null
        };
    }

    return {
        success: false,
        visit: null,
        error: result.error
    };
}
