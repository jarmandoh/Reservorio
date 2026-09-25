'use strict';

// Las rutas de proveedores exponen los mismos recursos que /api/businesses con
// un único contrato. Para eliminar la duplicación de API (provider.controller.js),
// /api/providers delega en el router canónico de businesses.
module.exports = require('./businesses.routes');
