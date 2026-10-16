---
type: "query"
date: "2026-10-15T14:06:58.985953+00:00"
question: "¿Conviene dividir el panel de administración?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AdminComponent", "Panel global: estadísticas, embudo de conversión, reseñas y pagos", "admin.selectors.ts", "AdminService"]
---

# Q: ¿Conviene dividir el panel de administración?

## Answer

Sí, conviene dividirlo gradualmente. La comunidad Panel de administración tiene cohesión 0.07198228128460686, señal de responsabilidades poco cohesionadas. AdminComponent concentra carga/edición/borrado de negocios, servicios, reservas, pagos y reseñas, además de estado de autenticación y modales; admin.selectors.ts ya separa algunas funciones de consulta. Mantén AdminComponent como shell de navegación y extrae componentes por áreas (negocios y catálogo, reservas, pagos y reseñas), reutilizando AdminService y selectors. No hace falta un componente por método. Expansión usada desde vocabulario: [admin, component, modal, selector].

## Outcome

- Signal: useful

## Source Nodes

- AdminComponent
- Panel global: estadísticas, embudo de conversión, reseñas y pagos
- admin.selectors.ts
- AdminService