// Constantes del sistema (catálogos y listas)

export const INSUMO_CATALOG = [
  // Panel (se puede duplicar y editar para manejar medidas/potencias distintas)
  { codigo:'PV', descripcion:'Módulo fotovoltaico 550 W', unidad:'UD', precio: 0, meta: { kind:'panel', watts: 550, medidas: '' } },
  { codigo:'I1', descripcion:'Inversor', unidad:'UD', precio: 0 },
  { codigo:'E1', descripcion:'Estructura de montaje', unidad:'UD', precio: 0 },
  { codigo:'M1', descripcion:'Conectores MC4 (par)', unidad:'UD', precio: 0 },
  { codigo:'M2', descripcion:'Cable fotovoltaico', unidad:'M', precio: 0 },
  { codigo:'PZ', descripcion:'Caja de protecciones FV', unidad:'UD', precio: 0 },
  { codigo:'MO', descripcion:'Mano de obra especializada', unidad:'SERV', precio: 0 },
  { codigo:'TR', descripcion:'Trámite CFE', unidad:'SERV', precio: 0 },
  { codigo:'FL', descripcion:'Fletes y seguros', unidad:'SERV', precio: 0 },
  { codigo:'ING', descripcion:'Ingeniería', unidad:'SERV', precio: 0 },
];

export const QUOTE_STATUSES = [
  'En proceso',
  'Pendiente de revisión',
  'Enviada al cliente',
  'Aprobada',
  'Rechazada',
  'Proyecto',
  'Cancelada',
];

export const TARIFFS = [
  { key:'dom_m', label:'Doméstica Mensual', periodo:'Mensual', familia:'Doméstica' },
  { key:'dom_b', label:'Doméstica Bimestral', periodo:'Bimestral', familia:'Doméstica' },
  { key:'pdbt_m', label:'PDBT Mensual', periodo:'Mensual', familia:'PDBT' },
  { key:'pdbt_b', label:'PDBT Bimestral', periodo:'Bimestral', familia:'PDBT' },
  { key:'gdmth', label:'GDMTH', periodo:'Mensual', familia:'GDMTH' },
  { key:'gdmto', label:'GDMTO', periodo:'Mensual', familia:'GDMTO' },
];
