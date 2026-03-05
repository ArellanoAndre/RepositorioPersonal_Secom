CREATE DATABASE  IF NOT EXISTS `secom` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `secom`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: secom
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `comisiones`
--

DROP TABLE IF EXISTS `comisiones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comisiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `vendedor_id` int NOT NULL,
  `cotizacion_id` int NOT NULL,
  `monto_venta` decimal(12,2) NOT NULL,
  `porcentaje_aplicado` decimal(5,2) NOT NULL,
  `monto_comision` decimal(12,2) GENERATED ALWAYS AS (((`monto_venta` * `porcentaje_aplicado`) / 100)) STORED,
  `fecha_venta` date NOT NULL,
  `fecha_liquidacion` date DEFAULT NULL,
  `estado` enum('pendiente','liquidada','anulada') DEFAULT 'pendiente',
  `notas` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_comision_proyecto` (`proyecto_id`),
  KEY `vendedor_id` (`vendedor_id`),
  KEY `cotizacion_id` (`cotizacion_id`),
  CONSTRAINT `comisiones_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comisiones_ibfk_2` FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores` (`usuario_id`) ON DELETE CASCADE,
  CONSTRAINT `comisiones_ibfk_3` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comisiones`
--

LOCK TABLES `comisiones` WRITE;
/*!40000 ALTER TABLE `comisiones` DISABLE KEYS */;
/*!40000 ALTER TABLE `comisiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `consumos_mensuales`
--

DROP TABLE IF EXISTS `consumos_mensuales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consumos_mensuales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `mes` int NOT NULL,
  `ano` year NOT NULL,
  `consumo_kwh` decimal(12,2) DEFAULT '0.00',
  `generacion_kwh` decimal(12,2) DEFAULT '0.00',
  `facturacion` decimal(12,2) DEFAULT '0.00',
  `ahorro` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_consumo_mensual` (`cotizacion_id`,`mes`,`ano`),
  CONSTRAINT `consumos_mensuales_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consumos_mensuales`
--

LOCK TABLES `consumos_mensuales` WRITE;
/*!40000 ALTER TABLE `consumos_mensuales` DISABLE KEYS */;
/*!40000 ALTER TABLE `consumos_mensuales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizacion_detalles`
--

DROP TABLE IF EXISTS `cotizacion_detalles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizacion_detalles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS ((`cantidad` * `precio_unitario`)) STORED,
  PRIMARY KEY (`id`),
  KEY `cotizacion_id` (`cotizacion_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `cotizacion_detalles_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cotizacion_detalles_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizacion_detalles`
--

LOCK TABLES `cotizacion_detalles` WRITE;
/*!40000 ALTER TABLE `cotizacion_detalles` DISABLE KEYS */;
/*!40000 ALTER TABLE `cotizacion_detalles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cotizaciones`
--

DROP TABLE IF EXISTS `cotizaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cotizaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `vendedor_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `paquete_id` int DEFAULT NULL,
  `factor_paquete` decimal(10,2) DEFAULT '1.00',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('borrador','cotizada','aceptada','rechazada','finalizada') DEFAULT 'borrador',
  `watts_instalados` decimal(12,2) DEFAULT '0.00',
  `produccion_diaria_estimada` decimal(10,2) DEFAULT '0.00',
  `consumo_diario` decimal(10,2) DEFAULT '0.00',
  `porcentaje_cobertura` decimal(5,2) DEFAULT '0.00',
  `retorno_inversion` decimal(6,2) DEFAULT NULL,
  `subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
  `iva` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `notas` text,
  `financiamiento` tinyint(1) DEFAULT '0',
  `proyecto_generado` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `vendedor_id` (`vendedor_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `paquete_id` (`paquete_id`),
  CONSTRAINT `cotizaciones_ibfk_1` FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores` (`usuario_id`) ON DELETE CASCADE,
  CONSTRAINT `cotizaciones_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `cotizaciones_ibfk_3` FOREIGN KEY (`paquete_id`) REFERENCES `paquetes` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cotizaciones`
--

LOCK TABLES `cotizaciones` WRITE;
/*!40000 ALTER TABLE `cotizaciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `cotizaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `detalle_proyecto`
--

DROP TABLE IF EXISTS `detalle_proyecto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_proyecto` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `proveedor` varchar(150) DEFAULT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `unidad_costeo` enum('unidad','panel','watt','instalacion','inversor','otro') NOT NULL,
  `precio_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS ((`cantidad` * `precio_unitario`)) STORED,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `detalle_proyecto_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `detalle_proyecto`
--

LOCK TABLES `detalle_proyecto` WRITE;
/*!40000 ALTER TABLE `detalle_proyecto` DISABLE KEYS */;
/*!40000 ALTER TABLE `detalle_proyecto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `financiamientos`
--

DROP TABLE IF EXISTS `financiamientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `financiamientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `porcentaje_anticipo` decimal(5,2) NOT NULL,
  `monto_anticipo` decimal(12,2) NOT NULL,
  `monto_restante` decimal(12,2) NOT NULL,
  `numero_plazos` int NOT NULL,
  `interes` decimal(5,2) DEFAULT '0.00',
  `fecha_inicio` date NOT NULL,
  `estado` enum('activo','pagado','atrasado','cancelado') DEFAULT 'activo',
  PRIMARY KEY (`id`),
  UNIQUE KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `financiamientos_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `financiamientos`
--

LOCK TABLES `financiamientos` WRITE;
/*!40000 ALTER TABLE `financiamientos` DISABLE KEYS */;
/*!40000 ALTER TABLE `financiamientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mantenimientos`
--

DROP TABLE IF EXISTS `mantenimientos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mantenimientos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `proyecto_id` int NOT NULL,
  `tecnico_id` int DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_programada` datetime DEFAULT NULL,
  `fecha_realizada` datetime DEFAULT NULL,
  `tipo` enum('preventivo','garantia','correctivo','otro') NOT NULL,
  `estado` enum('solicitado','programado','en_proceso','completado','cancelado') DEFAULT 'solicitado',
  `observaciones` text,
  `costo` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  KEY `tecnico_id` (`tecnico_id`),
  CONSTRAINT `mantenimientos_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mantenimientos_ibfk_2` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mantenimientos`
--

LOCK TABLES `mantenimientos` WRITE;
/*!40000 ALTER TABLE `mantenimientos` DISABLE KEYS */;
/*!40000 ALTER TABLE `mantenimientos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paquete_productos`
--

DROP TABLE IF EXISTS `paquete_productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paquete_productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paquete_id` int NOT NULL,
  `producto_id` int NOT NULL,
  `cantidad_base` decimal(10,2) NOT NULL DEFAULT '1.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_paquete_producto` (`paquete_id`,`producto_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `paquete_productos_ibfk_1` FOREIGN KEY (`paquete_id`) REFERENCES `paquetes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `paquete_productos_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paquete_productos`
--

LOCK TABLES `paquete_productos` WRITE;
/*!40000 ALTER TABLE `paquete_productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `paquete_productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `paquetes`
--

DROP TABLE IF EXISTS `paquetes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `paquetes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `paquetes`
--

LOCK TABLES `paquetes` WRITE;
/*!40000 ALTER TABLE `paquetes` DISABLE KEYS */;
/*!40000 ALTER TABLE `paquetes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `marca` varchar(100) DEFAULT NULL,
  `proveedor` varchar(150) DEFAULT NULL,
  `modelo` varchar(50) DEFAULT NULL,
  `capacidad` decimal(10,2) DEFAULT NULL,
  `precio_base` decimal(12,2) DEFAULT '0.00',
  `imagen_url` varchar(255) DEFAULT NULL,
  `categoria` enum('panel','inversor','estructura','cableado','PiezaAluminio','otros') NOT NULL,
  `unidad_costeo` enum('unidad','panel','watt','instalacion','inversor','otro') NOT NULL DEFAULT 'unidad',
  `activo` tinyint(1) DEFAULT '1',
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proyectos`
--

DROP TABLE IF EXISTS `proyectos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proyectos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cotizacion_id` int NOT NULL,
  `cliente_id` int NOT NULL,
  `vendedor_id` int NOT NULL,
  `tecnico_id` int DEFAULT NULL,
  `direccion_instalacion` text NOT NULL,
  `ciudad` varchar(100) NOT NULL,
  `tarifa_electrica` enum('1F','1A','1B','1C','1D','1E','PDBT','GDBT','GDMTO','GDMTH') DEFAULT '1F',
  `rpui` varchar(50) DEFAULT NULL,
  `cantidad_paneles` int DEFAULT '0',
  `produccion_diaria_real` decimal(10,2) DEFAULT '0.00',
  `total_vendido` decimal(12,2) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_estimada_fin` date DEFAULT NULL,
  `fecha_real_fin` date DEFAULT NULL,
  `estado` enum('pendiente','en_proceso','instalado','completado','cancelado') DEFAULT 'pendiente',
  `notas` text,
  `financiamiento` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `cotizacion_id` (`cotizacion_id`),
  KEY `cliente_id` (`cliente_id`),
  KEY `vendedor_id` (`vendedor_id`),
  KEY `tecnico_id` (`tecnico_id`),
  CONSTRAINT `proyectos_ibfk_1` FOREIGN KEY (`cotizacion_id`) REFERENCES `cotizaciones` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `proyectos_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `proyectos_ibfk_3` FOREIGN KEY (`vendedor_id`) REFERENCES `vendedores` (`usuario_id`) ON DELETE CASCADE,
  CONSTRAINT `proyectos_ibfk_4` FOREIGN KEY (`tecnico_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proyectos`
--

LOCK TABLES `proyectos` WRITE;
/*!40000 ALTER TABLE `proyectos` DISABLE KEYS */;
/*!40000 ALTER TABLE `proyectos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','vendedor','tecnico','cliente') NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `ciudad` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendedores`
--

DROP TABLE IF EXISTS `vendedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendedores` (
  `usuario_id` int NOT NULL,
  `porcentaje_comision` decimal(5,2) NOT NULL DEFAULT '5.00',
  PRIMARY KEY (`usuario_id`),
  CONSTRAINT `vendedores_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendedores`
--

LOCK TABLES `vendedores` WRITE;
/*!40000 ALTER TABLE `vendedores` DISABLE KEYS */;
/*!40000 ALTER TABLE `vendedores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'secom'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-04 20:25:33
