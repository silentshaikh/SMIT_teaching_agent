import ast


def parse_code(code: str, language: str) -> dict:
    """Parse source code and return error info."""
    if language == "python":
        try:
            ast.parse(code)
            return {"has_errors": False, "errors": []}
        except SyntaxError as e:
            return {
                "has_errors": True,
                "errors": [{"line": e.lineno, "msg": e.msg}],
            }
    if language == "javascript":
        errors = []
        lines = code.split("\n")
        open_braces = 0
        open_parens = 0
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped or stripped.startswith("//"):
                continue
            open_braces += stripped.count("{") - stripped.count("}")
            open_parens += stripped.count("(") - stripped.count(")")
        if open_braces != 0:
            errors.append({"line": len(lines), "msg": "Unbalanced braces"})
        if open_parens != 0:
            errors.append({"line": len(lines), "msg": "Unbalanced parentheses"})
        return {"has_errors": len(errors) > 0, "errors": errors}
    return {"has_errors": False, "errors": []}
