'use strict';

const express = require('express');
const router = express.Router();

const uxTips = [
  {
    title: 'Simplificar el flujo de reserva',
    description: 'Menos pasos, campos pre-rellenados y confirmación inmediata reducen la fricción y aceleran la conversión.',
  },
  {
    title: 'Feedback en tiempo real',
    description: 'Mostrar validación inline y estados de carga para que el usuario sepa que la aplicación está respondiendo.',
  },
  {
    title: 'Mensajes claros y positivos',
    description: 'Usar un lenguaje directo, amigable y orientado a la acción para ayudar a los usuarios a entender el siguiente paso.',
  },
  {
    title: 'Priorizar móvil',
    description: 'Diseñar primero para móvil con botones grandes, formularios cómodos y tiempos de carga rápidos.',
  },
  {
    title: 'Evitar pérdidas de datos',
    description: 'Preservar los datos del usuario en caso de recarga o navegación accidental usando almacenamiento local o estado persistente.',
  },
  {
    title: 'Accesibilidad como estándar',
    description: 'Asegurar contraste, etiquetas claras y navegación por teclado para que todos los usuarios puedan usar la aplicación.',
  },
  {
    title: 'Reducir fricción en el login',
    description: 'Ofrecer errores útiles y opciones de acceso sencillas para que el usuario pueda entrar sin bloquearse.',
  },
  {
    title: 'Confirmaciones y undo',
    description: 'Mostrar confirmaciones de acciones importantes y permitir deshacer cuando sea posible.',
  },
  {
    title: 'Microinteracciones útiles',
    description: 'Agregar animaciones sutiles y transiciones que indiquen cambios sin distraer al usuario.',
  },
  {
    title: 'Medir y iterar',
    description: 'Instrumentar eventos clave y usar datos reales para priorizar mejoras continuas.',
  },
];

router.get('/', (_req, res) => {
  res.json({ ok: true, data: uxTips });
});

module.exports = router;
