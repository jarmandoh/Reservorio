# Datos para la historia 3D de `/test`

El contenido del libro se carga como JSON independiente de la escena. El archivo de ejemplo es [`frontend/src/assets/data/test-story.json`](../frontend/src/assets/data/test-story.json); reemplázalo para editar el texto sin tocar Three.js.

Para consumir otro JSON, configura `window.__APP_CONFIG__.storyDataUrl` antes de cargar la aplicación:

```html
<script>
  window.__APP_CONFIG__ = {
    ...window.__APP_CONFIG__,
    storyDataUrl: 'https://ejemplo.com/contenido/test-story.json',
  };
</script>
```

El servidor externo debe permitir solicitudes desde el dominio de la aplicación mediante CORS. La respuesta debe respetar el esquema del JSON de ejemplo: `edition`, `location`, `intro`, `book` y `pages`. La escena admite de 1 a 6 páginas y muestra un mensaje con opción de reintento si la fuente no responde o el JSON no es válido.
