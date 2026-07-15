def run_linter(code: str, language: str) -> list:
    """Run linter checks on source code and return list of issues."""
    issues = []
    lines = code.split("\n")

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped:
            continue

        if language == "javascript":
            if stripped.startswith("//"):
                continue
            if "\t" in line:
                issues.append({"message": "Tabs detected, use spaces", "line": i})
            if len(stripped) > 100:
                issues.append({"message": f"Line too long ({len(stripped)} chars)", "line": i})
            if stripped.startswith("var "):
                issues.append({"message": "Use const or let instead of var", "line": i})
        elif language == "python":
            if stripped.startswith("#"):
                continue
            if "\t" in line:
                issues.append({"message": "Tabs detected, use spaces", "line": i})
            if len(stripped) > 100:
                issues.append({"message": f"Line too long ({len(stripped)} chars)", "line": i})
            if stripped.endswith(";"):
                issues.append({"message": "Unnecessary semicolon", "line": i})

    return issues
