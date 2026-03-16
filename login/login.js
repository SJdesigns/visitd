/* ============================================================================
   LOGIN.JS - Lógica de autenticación de usuario
   ============================================================================
   Este archivo gestiona:
   - Validación de inputs (campos requeridos, caracteres HTML)
   - Encriptación de contraseña con SHA1
   - Consulta a base de datos Supabase
   - Almacenamiento de datos en localStorage
   - Redirección a página principal
   ============================================================================ */

// ============ VARIABLE GLOBAL SUPABASE ============
// La conexión a Supabase se establecerá en el HTML con la URL y la clave
let supabaseClient;

/**
 * Inicializa la conexión a Supabase
 * Debe ser llamado después de que el script de Supabase esté cargado
 */
function initSupabase() {
    // Esperar a que Supabase esté disponible
    if (typeof supabase !== 'undefined') {
        // Los valores supabaseUrl y supabaseKey deben estar definidos en el HTML
        if (typeof supabaseUrl !== 'undefined' && typeof supabaseKey !== 'undefined') {
            supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        } else {
            console.warn('supabaseUrl y supabaseKey no están definidos');
        }
    }
}

/**
 * Valida que una cadena no contenga caracteres HTML o scripts maliciosos
 * @param {string} input - La cadena a validar
 * @returns {boolean} true si es válida, false si contiene caracteres HTML
 */
function validateNoHTML(input) {
    // Expresión regular que detecta etiquetas HTML, scripts y caracteres especiales peligrosos
    const htmlPattern = /<|>|script|javascript|onerror|onclick/gi;
    return !htmlPattern.test(input);
}

/**
 * Valida que un campo no esté vacío
 * @param {string} value - El valor a validar
 * @returns {boolean} true si no está vacío, false si está vacío
 */
function validateRequired(value) {
    return value.trim().length > 0;
}

/**
 * Limpia todos los mensajes de error de la página
 */
function clearErrors() {
    document.getElementById('usernameError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    document.getElementById('loginError').textContent = '';
}

/**
 * Valida los campos del formulario de login
 * @returns {boolean} true si pasa todas las validaciones, false si no
 */
function validateLoginForm() {
    clearErrors();
    let isValid = true;

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Validar que el campo de usuario no esté vacío
    if (!validateRequired(username)) {
        document.getElementById('usernameError').textContent = 'El usuario es requerido';
        isValid = false;
    }
    // Validar que el usuario no contenga HTML
    else if (!validateNoHTML(username)) {
        document.getElementById('usernameError').textContent = 'Usuario contiene caracteres no permitidos';
        isValid = false;
    }

    // Validar que el campo de contraseña no esté vacío
    if (!validateRequired(password)) {
        document.getElementById('passwordError').textContent = 'La contraseña es requerida';
        isValid = false;
    }
    // Validar que la contraseña no contenga HTML
    else if (!validateNoHTML(password)) {
        document.getElementById('passwordError').textContent = 'Contraseña contiene caracteres no permitidos';
        isValid = false;
    }

    return isValid;
}

/**
 * Encripta una contraseña usando SHA1
 * Utiliza CryptoJS para generar el hash
 * @param {string} password - La contraseña a encriptar
 * @returns {string} La contraseña encriptada en SHA1
 */

// tanto la función sha1 mia como la de CryptoJS hacen lo mismo, pero prefiero utilizar la mia y no tener que hacer llamadas externas.
function encryptPasswordSHA1(password) {
    console.log(password);
    //var encrypted = CryptoJS.SHA1(password).toString();
    var encrypted = sha1(password);
    console.log(encrypted);
    return encrypted;
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - true para mostrar, false para ocultar
 */
function setLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const form = document.querySelector('.login-form');

    if (show) {
        spinner.style.display = 'flex';
        form.style.display = 'none';
    } else {
        spinner.style.display = 'none';
        form.style.display = 'flex';
    }
}

/**
 * Intenta autenticar al usuario consultando la base de datos
 * @param {string} username - El nombre de usuario
 * @param {string} encryptedPassword - La contraseña encriptada
 */
async function authenticateUser(username, encryptedPassword) {
    try {
        setLoading(true);

        // Consultar la tabla 'users' para encontrar el usuario por username
        const { data: users, error: fetchError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('username', username);

        if (fetchError) {
            throw new Error(`Error al consultar base de datos: ${fetchError.message}`);
        }

        console.log(users);

        // Verificar que se encontró el usuario
        if (!users || users.length === 0) {
            setLoading(false);
            document.getElementById('loginError').textContent = 'Usuario o contraseña incorrectos';
            console.log('No se ha encontrado al usuario');
            return;
        }

        const user = users[0];

        // Verificar que la contraseña coincide
        if (user.password !== encryptedPassword) {
            setLoading(false);
            document.getElementById('loginError').textContent = 'Usuario o contraseña incorrectos';
            console.log('la contraseña no coincide con la del usuario');
            return;
        }

        // Verificar que el usuario está activo
        if (!user.active) {
            setLoading(false);
            document.getElementById('loginError').textContent = 'Este usuario ha sido desactivado';
            console.log('el usuario no se encuentra activo');
            return;
        }

        // ====== AUTENTICACIÓN EXITOSA ======
        // Guardar datos del usuario en localStorage
        localStorage.setItem('metrovisit-user', JSON.stringify(user));

        // Redirigir a la página principal
        console.log('identificación del usuario satisfactoria');
        window.location.href = '../index.html';

    } catch (error) {
        setLoading(false);
        console.error('Error en autenticación:', error);
        document.getElementById('loginError').textContent = 'Error de conexión. Intenta de nuevo.';
    }
}

/**
 * Maneja el envío del formulario de login
 * @param {Event} event - El evento del formulario
 */
async function handleLoginSubmit(event) {
    event.preventDefault();

    // Validar el formulario
    if (!validateLoginForm()) {
        return;
    }

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Encriptar la contraseña
    const encryptedPassword = encryptPasswordSHA1(password);

    // Intentar autenticar
    await authenticateUser(username, encryptedPassword);
}

/**
 * Inicializa la página de login
 * Ejecutado cuando el DOM está completamente cargado
 */
function initLoginPage() {
    // Inicializar Supabase
    initSupabase();

    // Obtener referencia del formulario
    const loginForm = document.getElementById('loginForm');

    // Asignar evento submit al formulario
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Verificar si el usuario ya está logeado
    const storedUser = localStorage.getItem('metrovisit-user');
    if (storedUser) {
        // Si está logeado, redirigir a la página principal
        window.location.href = '../index.html';
    }
}

// mi funcion de sha1
function sha1 (str) {
    var hash
    try {
        var crypto = require('crypto')
        var sha1sum = crypto.createHash('sha1')
        sha1sum.update(str)
        hash = sha1sum.digest('hex')
    } catch (e) {
        hash = undefined
    }

    if (hash !== undefined) {
        return hash
    }

    var _rotLeft = function (n, s) {
        var t4 = (n << s) | (n >>> (32 - s))
        return t4
    }

    var _cvtHex = function (val) {
        var str = ''
        var i
        var v

        for (i = 7; i >= 0; i--) {
            v = (val >>> (i * 4)) & 0x0f
            str += v.toString(16)
        }
        return str
    }

    var blockstart
    var i, j
    var W = new Array(80)
    var H0 = 0x67452301
    var H1 = 0xEFCDAB89
    var H2 = 0x98BADCFE
    var H3 = 0x10325476
    var H4 = 0xC3D2E1F0
    var A, B, C, D, E
    var temp

    // utf8_encode
    str = unescape(encodeURIComponent(str))
    var strLen = str.length

    var wordArray = []
    for (i = 0; i < strLen - 3; i += 4) {
        j = str.charCodeAt(i) << 24 |
        str.charCodeAt(i + 1) << 16 |
        str.charCodeAt(i + 2) << 8 |
        str.charCodeAt(i + 3)
        wordArray.push(j)
    }

    switch (strLen % 4) {
        case 0:
            i = 0x080000000
            break
        case 1:
            i = str.charCodeAt(strLen - 1) << 24 | 0x0800000
            break
        case 2:
            i = str.charCodeAt(strLen - 2) << 24 | str.charCodeAt(strLen - 1) << 16 | 0x08000
            break
        case 3:
            i = str.charCodeAt(strLen - 3) << 24 |
            str.charCodeAt(strLen - 2) << 16 |
            str.charCodeAt(strLen - 1) << 8 | 0x80
            break
        }

        wordArray.push(i)

        while ((wordArray.length % 16) !== 14) {
            wordArray.push(0)
        }

        wordArray.push(strLen >>> 29)
        wordArray.push((strLen << 3) & 0x0ffffffff)

        for (blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
            for (i = 0; i < 16; i++) {
                W[i] = wordArray[blockstart + i]
            }
            for (i = 16; i <= 79; i++) {
                W[i] = _rotLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1)
            }

            A = H0
            B = H1
            C = H2
            D = H3
            E = H4

            for (i = 0; i <= 19; i++) {
                temp = (_rotLeft(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff
                E = D
                D = C
                C = _rotLeft(B, 30)
                B = A
                A = temp
            }

            for (i = 20; i <= 39; i++) {
                temp = (_rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff
                E = D
                D = C
                C = _rotLeft(B, 30)
                B = A
                A = temp
            }

            for (i = 40; i <= 59; i++) {
                temp = (_rotLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff
                E = D
                D = C
                C = _rotLeft(B, 30)
                B = A
                A = temp
            }

            for (i = 60; i <= 79; i++) {
                temp = (_rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff
                E = D
                D = C
                C = _rotLeft(B, 30)
                B = A
                A = temp
            }

            H0 = (H0 + A) & 0x0ffffffff
            H1 = (H1 + B) & 0x0ffffffff
            H2 = (H2 + C) & 0x0ffffffff
            H3 = (H3 + D) & 0x0ffffffff
            H4 = (H4 + E) & 0x0ffffffff
        }

        temp = _cvtHex(H0) + _cvtHex(H1) + _cvtHex(H2) + _cvtHex(H3) + _cvtHex(H4)
        return temp.toLowerCase()
}

// Ejecutar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initLoginPage);
