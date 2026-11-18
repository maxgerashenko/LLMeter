import re


class ResolutionError(Exception):
    pass


_VERSION = re.compile(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\Z")
_CLAUSE = re.compile(r"(==|!=|>=|<=|>|<|~|\^)?\s*(\S+)\Z")


def _version(text):
    match = _VERSION.match(text) if isinstance(text, str) else None
    if not match:
        raise ValueError(f"bad version: {text!r}")
    return tuple(int(part) for part in match.groups())


def _parse_constraint(text):
    """Return a list of (operator, version) pairs; operator is a comparison."""
    if not isinstance(text, str):
        raise ValueError(f"bad constraint: {text!r}")
    checks = []
    for raw in text.split(","):
        clause = raw.strip()
        if clause == "*":
            continue
        match = _CLAUSE.match(clause)
        if not match:
            raise ValueError(f"bad constraint: {text!r}")
        op, version = match.group(1) or "==", _version(match.group(2))
        if op == "~":
            checks += [(">=", version), ("<", (version[0], version[1] + 1, 0))]
        elif op == "^":
            if version[0]:
                upper = (version[0] + 1, 0, 0)
            elif version[1]:
                upper = (0, version[1] + 1, 0)
            else:
                upper = (0, 0, version[2] + 1)
            checks += [(">=", version), ("<", upper)]
        else:
            checks.append((op, version))
    return checks


_OPS = {
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    ">=": lambda a, b: a >= b,
    "<=": lambda a, b: a <= b,
    ">": lambda a, b: a > b,
    "<": lambda a, b: a < b,
}


def _meets(version, checks):
    return all(_OPS[op](version, wanted) for op, wanted in checks)


def solve(index, root):
    parsed_root = {name: _parse_constraint(text) for name, text in root.items()}
    versions = {}  # name -> list of (version tuple, text, {dep: checks}), newest first
    for name, releases in index.items():
        rows = []
        for text, deps in releases.items():
            rows.append((_version(text), text,
                         {dep: _parse_constraint(c) for dep, c in deps.items()}))
        rows.sort(key=lambda row: row[0], reverse=True)
        versions[name] = rows

    chosen = {}       # name -> (version tuple, text)
    constraints = {}  # name -> list of check lists
    for name, checks in parsed_root.items():
        constraints.setdefault(name, []).append(checks)

    def search():
        pending = [name for name in constraints if name not in chosen]
        if not pending:
            return True
        name = min(pending)
        for version, text, deps in versions.get(name, ()):
            if not all(_meets(version, checks) for checks in constraints[name]):
                continue
            if any(dep in chosen and not _meets(chosen[dep][0], checks)
                   for dep, checks in deps.items()):
                continue
            chosen[name] = (version, text)
            added = []
            for dep, checks in deps.items():
                if dep not in constraints:
                    constraints[dep] = []
                constraints[dep].append(checks)
                added.append(dep)
            if search():
                return True
            for dep in added:
                constraints[dep].pop()
                if not constraints[dep]:
                    del constraints[dep]
            del chosen[name]
        return False

    import sys
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(max(old_limit, 4 * len(index) + 1000))
    try:
        found = search()
    finally:
        sys.setrecursionlimit(old_limit)
    if not found:
        raise ResolutionError("no set of versions meets all constraints")
    return {name: text for name, (_v, text) in chosen.items()}
