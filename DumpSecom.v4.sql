/* =========================================================
   BASE DE DATOS SECOM - VERSIÓN FINAL 100% (MARZO 2026)
   Incluye todo lo solicitado:
   • Múltiples roles (SET)
   • Clientes con razón social opcional + múltiples teléfonos
   • Soft delete (deleted_at)
   • Índices recomendados
   • Eliminadas proyecto_paneles y proyecto_inversores (todo en proyecto_materiales)
   • Productos: descripcion_corta y descripcion_larga
   • Cotizacion_detalles: numero_paneles y numero_inversores
   • Plantillas_propuesta mejorada + nueva tabla plantilla_imagenes
   ========================================================= */
CREATE DATABASE IF NOT EXISTS secom;
USE secom;

-- ========================================================
-- 1. USUARIOS
-- ========================================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol SET('admin','vendedor','tecnico','cliente') NOT NULL DEFAULT 'cliente',
    telefono VARCHAR(20),
    ciudad VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    deleted_at DATETIME DEFAULT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuarios_rol (rol),
    INDEX idx_usuarios_email (email)
);

-- ========================================================
-- 2. CLIENTES
-- ========================================================
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE,
    rfc VARCHAR(13) UNIQUE,
    razon_social VARCHAR(150),
    nombre_comercial VARCHAR(150),
    regimen_fiscal VARCHAR(50),
    direccion_fiscal TEXT,
    ciudad VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    deleted_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_clientes_rfc (rfc)
);

-- ========================================================
-- 3. CLIENTES_TELEFONOS
-- ========================================================
CREATE TABLE clientes_telefonos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    tipo ENUM('celular','oficina','casa','fax','otro') DEFAULT 'celular',
    principal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- ========================================================
-- 4. VENDEDORES
-- ========================================================
CREATE TABLE vendedores (
    usuario_id INT PRIMARY KEY,
    porcentaje_comision DECIMAL(5,2) DEFAULT 5.00,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- ========================================================
-- 5. PRODUCTOS (con descripciones)
-- ========================================================
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    proveedor VARCHAR(150),
    modelo VARCHAR(50),
    capacidad DECIMAL(10,2),
    eficiencia DECIMAL(5,2),
    garantia INT,
    precio_base DECIMAL(12,2) DEFAULT 0,
    categoria ENUM('panel','inversor','estructura','cableado','PiezaAluminio','otros'),
    unidad_costeo ENUM('unidad','panel','watt','instalacion','inversor','otro'),
    descripcion_corta VARCHAR(255) DEFAULT NULL,
    descripcion_larga TEXT DEFAULT NULL,
    activo BOOLEAN DEFAULT TRUE,
    deleted_at DATETIME DEFAULT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_productos_categoria (categoria)
);

-- ========================================================
-- 6. PAQUETES
-- ========================================================
CREATE TABLE paquetes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

CREATE TABLE paquete_productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paquete_id INT,
    producto_id INT,
    cantidad_base DECIMAL(10,2) DEFAULT 1,
    FOREIGN KEY (paquete_id) REFERENCES paquetes(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ========================================================
-- 7. COTIZACIONES
-- ========================================================
CREATE TABLE cotizaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendedor_id INT,
    cliente_id INT,
    paquete_id INT,
    factor_paquete DECIMAL(10,2) DEFAULT 1,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('borrador','cotizada','aceptada','rechazada','finalizada') DEFAULT 'borrador',
    consumo_promedio_mensual_kwh DECIMAL(10,2),
    consumo_promedio_diario_kwh DECIMAL(10,2),
    costo_promedio_mensual DECIMAL(10,2),
    costo_promedio_anual DECIMAL(12,2),
    watts_instalados DECIMAL(12,2),
    produccion_diaria_estimada DECIMAL(10,2),
    porcentaje_cobertura DECIMAL(5,2),
    retorno_inversion DECIMAL(6,2),
    subtotal DECIMAL(12,2),
    iva DECIMAL(12,2),
    total DECIMAL(12,2),
    financiamiento BOOLEAN DEFAULT FALSE,
    proyecto_generado BOOLEAN DEFAULT FALSE,
    notas TEXT,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(usuario_id) ON DELETE RESTRICT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (paquete_id) REFERENCES paquetes(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id),
    FOREIGN KEY (updated_by) REFERENCES usuarios(id),
    INDEX idx_cotizaciones_estado (estado),
    INDEX idx_cotizaciones_cliente (cliente_id),
    INDEX idx_cotizaciones_vendedor (vendedor_id)
);

-- ========================================================
-- 8. COTIZACION_DETALLES (con nuevos campos)
-- ========================================================
CREATE TABLE cotizacion_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT,
    producto_id INT,
    cantidad DECIMAL(12,2),
    precio_unitario DECIMAL(12,2),
    numero_paneles INT DEFAULT 0,
    numero_inversores INT DEFAULT 0,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- ========================================================
-- 9. PLANTILLAS_PROPUESTA (mejorada para propuestas completas)
-- ========================================================
CREATE TABLE plantillas_propuesta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    tipo ENUM('industrial','residencial','comercial') DEFAULT 'industrial',
    contenido_json LONGTEXT COMMENT 'Estructura completa de la propuesta (JSON)',
    imagen_portada VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ========================================================
-- 10. PLANTILLA_IMAGENES (nueva tabla para imágenes de propuestas)
-- ========================================================
CREATE TABLE plantilla_imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plantilla_id INT NOT NULL,
    seccion VARCHAR(100) COMMENT 'Ej: portada, sembrado, certificados, simulacion',
    imagen_url VARCHAR(500) NOT NULL,
    descripcion TEXT,
    orden INT DEFAULT 1,
    FOREIGN KEY (plantilla_id) REFERENCES plantillas_propuesta(id) ON DELETE CASCADE
);

-- ========================================================
-- 11. HISTORIAL_ESTADOS
-- ========================================================
CREATE TABLE historial_estados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entidad ENUM('cotizacion','proyecto','mantenimiento') NOT NULL,
    entidad_id INT NOT NULL,
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50) NOT NULL,
    usuario_id INT NOT NULL,
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    INDEX idx_historial_entidad (entidad, entidad_id)
);

-- ========================================================
-- 12. RESTO DE TABLAS (sin cambios)
-- ========================================================
CREATE TABLE consumos_mensuales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT,
    mes INT,
    ano YEAR,
    consumo_kwh DECIMAL(12,2),
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
);

CREATE TABLE calculo_solar_cotizacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT,
    estado VARCHAR(100),
    insolacion_usada DECIMAL(6,3),
    potencia_panel DECIMAL(10,2),
    numero_paneles INT,
    watts_instalados DECIMAL(12,2),
    capacidad_inversor DECIMAL(10,2),
    produccion_diaria_estimada DECIMAL(10,2),
    produccion_anual_estimada DECIMAL(12,2),
    porcentaje_generacion DECIMAL(5,2),
    factor_conversion_usado DECIMAL(10,4),
    factor_reflexion_usado DECIMAL(10,4),
    fecha_calculo DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
);

CREATE TABLE proyectos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id INT UNIQUE,
    cliente_id INT,
    vendedor_id INT,
    tecnico_id INT,
    direccion_instalacion TEXT,
    ciudad VARCHAR(100),
    rpui VARCHAR(50),
    titular_servicio VARCHAR(150),
    tarifa_electrica ENUM('1F','1A','1B','1C','1D','1E','PDBT','GDBT','GDMTO','GDMTH'),
    produccion_diaria_real DECIMAL(10,2),
    total_vendido DECIMAL(12,2),
    potencia_total_instalada DECIMAL(12,2) DEFAULT 0.00,
    capacidad_inversor_real DECIMAL(10,2) DEFAULT 0.00,
    fecha_inicio DATE,
    fecha_estimada_fin DATE,
    fecha_real_fin DATE,
    estado ENUM('pendiente','en_proceso','instalado','completado','cancelado') DEFAULT 'pendiente',
    notas TEXT,
    financiamiento BOOLEAN DEFAULT FALSE,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE RESTRICT,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(usuario_id) ON DELETE RESTRICT,
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id),
    FOREIGN KEY (updated_by) REFERENCES usuarios(id),
    INDEX idx_proyectos_estado (estado),
    INDEX idx_proyectos_cliente (cliente_id)
);

CREATE TABLE proyecto_materiales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT,
    producto_id INT,
    cantidad DECIMAL(12,2),
    precio_unitario DECIMAL(12,2),
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    notas TEXT,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE archivos_proyecto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT,
    usuario_id INT,
    tipo ENUM('cotizacion_pdf','imagen_instalacion','evidencia_tecnica','contrato','garantia','reporte_mantenimiento','otro'),
    nombre_archivo VARCHAR(255),
    ruta_archivo VARCHAR(500),
    descripcion TEXT,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE tarifas_mantenimiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('preventivo','correctivo','limpieza','garantia'),
    costo_por_panel DECIMAL(10,2),
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mantenimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT,
    tecnico_id INT,
    tipo ENUM('preventivo','correctivo','limpieza','garantia','otro'),
    numero_paneles INT,
    tarifa_id INT,
    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_programada DATETIME,
    fecha_realizada DATETIME,
    estado ENUM('solicitado','programado','en_proceso','completado','cancelado') DEFAULT 'solicitado',
    observaciones TEXT,
    costo DECIMAL(12,2),
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (tecnico_id) REFERENCES usuarios(id),
    FOREIGN KEY (tarifa_id) REFERENCES tarifas_mantenimiento(id),
    FOREIGN KEY (created_by) REFERENCES usuarios(id),
    FOREIGN KEY (updated_by) REFERENCES usuarios(id),
    INDEX idx_mantenimientos_estado (estado)
);

CREATE TABLE financiamientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT UNIQUE,
    porcentaje_anticipo DECIMAL(5,2),
    monto_anticipo DECIMAL(12,2),
    monto_restante DECIMAL(12,2),
    numero_plazos INT,
    interes DECIMAL(5,2),
    fecha_inicio DATE,
    estado ENUM('activo','pagado','atrasado','cancelado') DEFAULT 'activo',
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);

CREATE TABLE pagos_financiamiento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    financiamiento_id INT NOT NULL,
    numero_plazo INT NOT NULL,
    monto_plazo DECIMAL(12,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    fecha_pago DATE DEFAULT NULL,
    monto_pagado DECIMAL(12,2) DEFAULT 0.00,
    estado ENUM('pendiente','pagado','atrasado','cancelado') DEFAULT 'pendiente',
    metodo_pago VARCHAR(50),
    comprobante VARCHAR(255),
    notas TEXT,
    created_by INT,
    updated_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (financiamiento_id) REFERENCES financiamientos(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES usuarios(id),
    FOREIGN KEY (updated_by) REFERENCES usuarios(id),
    UNIQUE KEY (financiamiento_id, numero_plazo)
);

CREATE TABLE comisiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT UNIQUE,
    vendedor_id INT,
    cotizacion_id INT,
    monto_venta DECIMAL(12,2),
    porcentaje_aplicado DECIMAL(5,2),
    monto_comision DECIMAL(12,2) GENERATED ALWAYS AS (monto_venta * porcentaje_aplicado / 100) STORED,
    fecha_venta DATE,
    estado ENUM('pendiente','liquidada','anulada') DEFAULT 'pendiente',
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE RESTRICT,
    FOREIGN KEY (vendedor_id) REFERENCES vendedores(usuario_id) ON DELETE RESTRICT,
    FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id)
);

-- ========================================================
-- TRIGGERS Y STORED PROCEDURE (mantienen la funcionalidad anterior)
-- ========================================================
DELIMITER $$

-- Triggers de historial y precios (sin cambios)
CREATE TRIGGER trg_historial_cotizacion AFTER UPDATE ON cotizaciones FOR EACH ROW
BEGIN IF OLD.estado <> NEW.estado THEN INSERT INTO historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id) VALUES ('cotizacion', NEW.id, OLD.estado, NEW.estado, NEW.updated_by); END IF; END$$

CREATE TRIGGER trg_historial_proyecto AFTER UPDATE ON proyectos FOR EACH ROW
BEGIN IF OLD.estado <> NEW.estado THEN INSERT INTO historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id) VALUES ('proyecto', NEW.id, OLD.estado, NEW.estado, NEW.updated_by); END IF; END$$

CREATE TRIGGER trg_historial_mantenimiento AFTER UPDATE ON mantenimientos FOR EACH ROW
BEGIN IF OLD.estado <> NEW.estado THEN INSERT INTO historial_estados (entidad, entidad_id, estado_anterior, estado_nuevo, usuario_id) VALUES ('mantenimiento', NEW.id, OLD.estado, NEW.estado, NEW.updated_by); END IF; END$$

CREATE TRIGGER trg_congelar_precio_cotizacion BEFORE INSERT ON cotizacion_detalles FOR EACH ROW
BEGIN IF NEW.precio_unitario = 0 OR NEW.precio_unitario IS NULL THEN SET NEW.precio_unitario = (SELECT precio_base FROM productos WHERE id = NEW.producto_id); END IF; END$$

CREATE TRIGGER trg_congelar_precio_proyecto BEFORE INSERT ON proyecto_materiales FOR EACH ROW
BEGIN IF NEW.precio_unitario = 0 OR NEW.precio_unitario IS NULL THEN SET NEW.precio_unitario = (SELECT precio_base FROM productos WHERE id = NEW.producto_id); END IF; END$$

-- Stored Procedure actualizado
CREATE PROCEDURE sp_crear_proyecto_desde_cotizacion(
    IN p_cotizacion_id INT, IN p_tecnico_id INT, IN p_direccion TEXT, 
    IN p_ciudad VARCHAR(100), IN p_rpui VARCHAR(50), IN p_tarifa VARCHAR(20)
)
BEGIN
    DECLARE v_proyecto_id INT; DECLARE v_cliente_id INT; DECLARE v_vendedor_id INT; DECLARE v_total DECIMAL(12,2);
    SELECT cliente_id, vendedor_id, total INTO v_cliente_id, v_vendedor_id, v_total FROM cotizaciones WHERE id = p_cotizacion_id;
    INSERT INTO proyectos (cotizacion_id, cliente_id, vendedor_id, tecnico_id, direccion_instalacion, ciudad, rpui, tarifa_electrica, total_vendido, created_by)
    VALUES (p_cotizacion_id, v_cliente_id, v_vendedor_id, p_tecnico_id, p_direccion, p_ciudad, p_rpui, p_tarifa, v_total, v_vendedor_id);
    SET v_proyecto_id = LAST_INSERT_ID();
    UPDATE cotizaciones SET estado = 'finalizada', proyecto_generado = TRUE WHERE id = p_cotizacion_id;
    INSERT INTO proyecto_materiales (proyecto_id, producto_id, cantidad, precio_unitario)
    SELECT v_proyecto_id, producto_id, cantidad, precio_unitario FROM cotizacion_detalles WHERE cotizacion_id = p_cotizacion_id;
    SELECT CONCAT('✅ Proyecto creado con ID: ', v_proyecto_id) AS mensaje;
END$$

DELIMITER ;

-- ========================================================
-- FIN DE LA BASE DE DATOS
-- ========================================================