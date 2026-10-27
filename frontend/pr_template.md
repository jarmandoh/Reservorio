# PR Template (GitHub Actions)

1. Dentro de la raíz del proyecto, crea la carpeta **.github** si no existe.
2. Dentro, crea el subdirectorio **PULL_REQUEST_TEMPLATE**.
3. Crea el archivo **.md** (por ejemplo, `frontend/.github/PULL_REQUEST_TEMPLATE.md`).
4. Copia el siguiente contenido en el archivo:

```markdown
## Description

- Brief description of the change (max 200 chars)

## Checklist

- [ ] Code follows lint rules.
- [ ] Unit tests pass.
- [ ] Coverage ≥ 80 %.
- [ ] Updated docs if needed.

## Related Issues

- Closes #123
- Ref: PR #45
```

5. Guarda el archivo.
6. Cuando crees un Pull Request, GitHub mostrará automáticamente el template pre‑llenado.
