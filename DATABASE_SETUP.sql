-- ============================================================================
-- DATABASE_SETUP.sql
-- Script para crear la estructura de base de datos en Supabase
-- ============================================================================

-- ========== TABLA: users ==========
-- Contiene los datos de los usuarios permitidos en la aplicación
CREATE TABLE users (
    userId BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,  -- Debe estar encriptado en SHA1
    joinDate BIGINT NOT NULL,  -- Unix timestamp 13 dígitos
    theme TEXT DEFAULT 'light',
    active BOOLEAN DEFAULT true,
    admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== TABLA: mv-system ==========
-- Contiene todos los sistemas de transporte público
CREATE TABLE "mv-system" (
    sysId BIGSERIAL PRIMARY KEY,
    userId BIGINT REFERENCES users(userId) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stations INTEGER,  -- Número total de estaciones
    length DECIMAL(10, 2),  -- Longitud en kilómetros
    logo TEXT NOT NULL,  -- Nombre del archivo de logo en ./img/
    lines JSONB,  -- JSON con las líneas del sistema
    country TEXT NOT NULL,
    mapFile TEXT NOT NULL,  -- Nombre del archivo SVG en ./maps/
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== TABLA: mv-userSystem ==========
-- Relaciona usuarios con sistemas de metro
-- Indica qué sistemas ha añadido cada usuario a su página de inicio
CREATE TABLE "mv-userSystem" (
    userSysId BIGSERIAL PRIMARY KEY,
    userId BIGINT NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
    sysId BIGINT NOT NULL REFERENCES "mv-system"(sysId) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, sysId)  -- Un usuario no puede añadir el mismo sistema dos veces
);

-- ========== TABLA: mv-station ==========
-- Contiene todas las estaciones de todos los sistemas
CREATE TABLE "mv-station" (
    stationId BIGSERIAL PRIMARY KEY,
    stationCode TEXT NOT NULL,  -- ID del elemento SVG en el mapa
    name TEXT,  -- Nombre de la estación
    sysId BIGINT NOT NULL REFERENCES "mv-system"(sysId) ON DELETE CASCADE,
    lines JSONB,  -- Array de IDs de líneas que pasan por esta estación
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== TABLA: mv-visit ==========
-- Contiene todas las visitas realizadas a las estaciones
CREATE TABLE "mv-visit" (
    visitId BIGSERIAL PRIMARY KEY,
    userId BIGINT NOT NULL REFERENCES users(userId) ON DELETE CASCADE,
    stationCode TEXT NOT NULL,  -- Corresponde con stationCode de mv-station
    visitDate BIGINT NOT NULL,  -- Unix timestamp 13 dígitos
    sysId BIGINT NOT NULL REFERENCES "mv-system"(sysId) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== ÍNDICES PARA MEJORAR RENDIMIENTO ==========

-- Índices en la tabla users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(active);

-- Índices en la tabla mv-system
CREATE INDEX idx_system_userId ON "mv-system"(userId);
CREATE INDEX idx_system_country ON "mv-system"(country);

-- Índices en la tabla mv-userSystem
CREATE INDEX idx_userSystem_userId ON "mv-userSystem"(userId);
CREATE INDEX idx_userSystem_sysId ON "mv-userSystem"(sysId);

-- Índices en la tabla mv-station
CREATE INDEX idx_station_sysId ON "mv-station"(sysId);
CREATE INDEX idx_station_stationCode ON "mv-station"(stationCode);

-- Índices en la tabla mv-visit
CREATE INDEX idx_visit_userId ON "mv-visit"(userId);
CREATE INDEX idx_visit_sysId ON "mv-visit"(sysId);
CREATE INDEX idx_visit_stationCode ON "mv-visit"(stationCode);
CREATE INDEX idx_visit_userId_sysId ON "mv-visit"(userId, sysId);

-- ========== DATOS DE EJEMPLO ==========

-- Insertar usuario de prueba
-- Contraseña: "password123" encriptada en SHA1 = 482c811da5d5b4bc6d497ffa98491e38
INSERT INTO users (username, password, joinDate, active, admin) VALUES 
('testuser', '482c811da5d5b4bc6d497ffa98491e38', 1703707200000, true, false);

-- Insertar un sistema de ejemplo (Metro de Madrid)
INSERT INTO "mv-system" (userId, name, stations, length, logo, country, mapFile, lines) VALUES 
(1, 'Metro de Madrid', 301, 294.1, 'madrid-metro-logo.png', 'España', 'madrid-metro.svg', '[]'::jsonb);

-- Insertar otro sistema de ejemplo (Metro de Barcelona)
INSERT INTO "mv-system" (userId, name, stations, length, logo, country, mapFile, lines) VALUES 
(1, 'Metro de Barcelona', 165, 206.9, 'barcelona-metro-logo.png', 'España', 'barcelona-metro.svg', '[]'::jsonb);

-- Relacionar el usuario con los sistemas
INSERT INTO "mv-userSystem" (userId, sysId) VALUES 
(1, 1),
(1, 2);

-- Insertar estaciones de ejemplo para Madrid
INSERT INTO "mv-station" (stationCode, name, sysId, lines) VALUES 
('station-001', 'Sol', 1, '[1,2,3]'::jsonb),
('station-002', 'Gran Vía', 1, '[1]'::jsonb),
('station-003', 'Plaza de España', 1, '[2,3]'::jsonb),
('station-004', 'Callao', 1, '[1,3,5]'::jsonb);

-- Insertar algunas visitas de ejemplo
INSERT INTO "mv-visit" (userId, stationCode, visitDate, sysId) VALUES 
(1, 'station-001', 1703707200000, 1),
(1, 'station-002', 1703793600000, 1),
(1, 'station-003', 1703880000000, 1);

-- ========== FUNCIONES ÚTILES PARA QUERIES ==========

-- Obtener estaciones visitadas por un usuario en un sistema
-- SELECT * FROM "mv-visit" WHERE userId = 1 AND sysId = 1;

-- Obtener sistemas de un usuario
-- SELECT s.* FROM "mv-system" s 
-- JOIN "mv-userSystem" us ON s.sysId = us.sysId 
-- WHERE us.userId = 1;

-- Obtener porcentaje de estaciones visitadas
-- SELECT 
--     COUNT(DISTINCT mv.stationCode) as visited_count,
--     s.stations as total_stations,
--     ROUND(100.0 * COUNT(DISTINCT mv.stationCode) / s.stations, 2) as percentage
-- FROM "mv-visit" mv
-- JOIN "mv-system" s ON mv.sysId = s.sysId
-- WHERE mv.userId = 1 AND mv.sysId = 1
-- GROUP BY s.stations;

-- ========== NOTAS IMPORTANTES ==========

-- 1. Las contraseñas DEBEN estar encriptadas en SHA1 antes de insertarlas
--    Usa una herramienta online como https://www.tools4noobs.com/online_tools/hash/
--    O desde JavaScript: CryptoJS.SHA1('password').toString()

-- 2. Las fechas DEBEN ser unix timestamps con 13 dígitos (milisegundos)
--    Genera uno: new Date().getTime()

-- 3. Los valores de stationCode DEBEN coincidir con los IDs de los elementos
--    SVG que tengan class="stationCircle" en los archivos de mapa

-- 4. El campo mapFile DEBE ser el nombre exacto del archivo SVG
--    Sin rutas, solo el nombre del archivo en la carpeta ./maps/

-- 5. El campo logo DEBE ser el nombre exacto del archivo de imagen
--    Sin rutas, solo el nombre del archivo en la carpeta ./img/

-- ========== EXPORTAR DATOS ==========

-- Si necesitas exportar los datos, usa:
-- pg_dump -h [HOST] -U [USER] -d [DATABASE] > backup.sql

-- Para restaurar:
-- psql -h [HOST] -U [USER] -d [DATABASE] < backup.sql
