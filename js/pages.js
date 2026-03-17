/* ============================================================================
   PAGES.JS - Navegación y cambio entre páginas (SPA)
   ============================================================================
   Este archivo gestiona:
   - Cambio entre páginas sin recargar
   - Activación/desactivación de enlaces de navegación
   - Estados de visualización de páginas
   ============================================================================ */

/**
 * Cambia a una página específica
 * Oculta todas las páginas y muestra solo la seleccionada
 * 
 * @param {string} pageName - Nombre de la página a mostrar (sin el prefijo 'page-')
 */
function changePage(pageName) {
    // Ocultar todas las páginas
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // Mostrar la página seleccionada
    const pageElement = document.getElementById(`page-${pageName}`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Actualizar la navegación activa
    updateActiveNavLink(pageName);

    // Ejecutar funciones específicas de cada página
    onPageChanged(pageName);
}

/**
 * Actualiza el enlace activo en la barra de navegación
 * @param {string} pageName - Nombre de la página activa
 */
function updateActiveNavLink(pageName) {
    console.log('updateActiveNavLink');
    // Remover clase active de todos los enlaces
    const navLinks = document.querySelectorAll('.navbar-item');
    navLinks.forEach(link => {
        link.classList.remove('nav-active');
    });

    const navMobileLinks = document.querySelectorAll('.navItemMobile');
    navMobileLinks.forEach(link => {
        link.classList.remove('navMobile-active');
    });

    // Añadir clase active al enlace correspondiente
    const activeLink = document.querySelector('#navbar-'+pageName);
    if (activeLink) {
        activeLink.classList.add('nav-active');
    }

    const activeMobileLink = document.querySelector('#navItemMobile-'+pageName);
    console.log('#navItemMobile-'+pageName);
    console.log(activeMobileLink);
    if (activeMobileLink) {
        activeMobileLink.classList.add('navMobile-active');
    }
}

/**
 * Se ejecuta cuando se cambia de página
 * Aquí se pueden agregar inicializaciones específicas para cada página
 * 
 * @param {string} pageName - Nombre de la página que se está mostrando
 */
function onPageChanged(pageName) {
    // Gestionar visibilidad del navbar
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (pageName === 'map') {
            navbar.style.display = 'none';
        } else {
            navbar.style.display = 'block';
        }
    }

    switch(pageName) {
        case 'home':
            loadHomePage();
            break;
        case 'systems':
            loadSystemsPage();
            break;
        case 'map':
            loadMapPage();
            break;
        case 'settings':
            loadSettingsPage();
            break;
    }
}

/**
 * Inicializa los event listeners para la navegación
 */

function initPageNavigation2() {
    // Event listeners para los links de navegación

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.getAttribute('data-page');
            changePage(pageName);
        });
    });
}

function initPageNavigation() {
    // Event listeners para los links de navegación
    const navLinks = document.querySelectorAll('.navbar-item');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageName = link.getAttribute('id').substring(7);
            changePage(pageName);
        });
    });

    // Botón de añadir sistema desde la página home
    const addSystemBtn = document.getElementById('addSystemBtn');
    if (addSystemBtn) {
        addSystemBtn.addEventListener('click', () => {
            changePage('systems');
        });
    }

    // Botón de volver desde la página systems
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            changePage('home');
        });
    }

    // Botón de volver desde la página map
    const backToHomeMapBtn = document.getElementById('backToHomeMapBtn');
    if (backToHomeMapBtn) {
        backToHomeMapBtn.addEventListener('click', () => {
            changePage('home');
        });
    }

    // Botón del nav mobile para ir a la pagina home
    const navbarMobileHomeBtn = document.getElementById('navItemMobile-home');
    if (navbarMobileHomeBtn) {
        navbarMobileHomeBtn.addEventListener('click', () => {
            changePage('home');
        });
    }

    // Botón del nav mobile para ir a la pagina map
    const navbarMobileSystemBtn = document.getElementById('navItemMobile-systems');
    if (navbarMobileSystemBtn) {
        navbarMobileSystemBtn.addEventListener('click', () => {
            changePage('systems');
        });
    }

    // Botón del nav mobile para ir a la pagina settings
    const navbarMobileSettingsBtn = document.getElementById('navItemMobile-settings');
    if (navbarMobileSettingsBtn) {
        navbarMobileSettingsBtn.addEventListener('click', () => {
            changePage('settings');
        });
    }
}

// Se ejecuta cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initPageNavigation();
    // Iniciar en la página home
    changePage('home');
});
