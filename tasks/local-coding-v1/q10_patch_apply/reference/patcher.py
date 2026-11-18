import re


class PatchError(Exception):
    def __init__(self, hunk):
        super().__init__(f"hunk {hunk} does not apply")
        self.hunk = hunk


_HEADER = re.compile(r"@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")
_MARKER = "\\ No newline at end of file"


def _parse(patch):
    lines = patch.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    hunks = []
    i = 0
    while i < len(lines) and not lines[i].startswith("@@"):
        i += 1
    while i < len(lines):
        line = lines[i]
        if not line.startswith("@@"):
            if line.strip() == "":
                i += 1
                continue
            raise ValueError(f"unexpected text after hunk: {line!r}")
        match = _HEADER.match(line)
        if not match:
            raise ValueError(f"bad hunk header: {line!r}")
        old_start = int(match.group(1))
        old_count = 1 if match.group(2) is None else int(match.group(2))
        new_count = 1 if match.group(4) is None else int(match.group(4))
        i += 1
        body = []  # [kind, text]
        seen_old = seen_new = 0
        while seen_old < old_count or seen_new < new_count:
            if i >= len(lines):
                raise ValueError("hunk is shorter than its header says")
            line = lines[i]
            kind = line[:1] or " "
            if kind not in " -+":
                raise ValueError(f"bad hunk line: {line!r}")
            if kind in " -":
                seen_old += 1
            if kind in " +":
                seen_new += 1
            if seen_old > old_count or seen_new > new_count:
                raise ValueError("hunk is longer than its header says")
            body.append([kind, line[1:] + "\n"])
            i += 1
            if i < len(lines) and lines[i] == _MARKER:
                body[-1][1] = body[-1][1][:-1]
                i += 1
        hunks.append((old_start, old_count, body))
    if not hunks:
        raise ValueError("patch has no hunk")
    return hunks


def _locate(src, old, expected, floor):
    """Index where `old` matches in src, nearest to `expected`, or None."""
    size = len(old)
    last = len(src) - size
    if last < floor:
        return None
    reach = max(abs(expected - floor), abs(last - expected)) + 1
    for distance in range(reach + 1):
        for pos in ((expected,) if distance == 0 else (expected - distance, expected + distance)):
            if floor <= pos <= last and src[pos:pos + size] == old:
                return pos
    return None


def apply_patch(original, patch):
    hunks = _parse(patch)
    # Not str.splitlines: it also splits on other separators.
    src = re.findall(r"[^\n]*\n|[^\n]+", original)
    out = []
    floor = 0   # first original line not yet used
    drift = 0
    for number, (old_start, old_count, body) in enumerate(hunks, 1):
        if old_count == 0:
            pos = min(max(old_start + drift, floor), len(src))
            out.extend(src[floor:pos])
            out.extend(text for kind, text in body if kind == "+")
            floor = pos
            continue
        nominal = old_start - 1
        lead = 0
        while lead < len(body) and body[lead][0] == " ":
            lead += 1
        tail = 0
        while tail < len(body) - lead and body[len(body) - 1 - tail][0] == " ":
            tail += 1
        found = None
        for fuzz in (0, 1, 2):
            cut_head = min(fuzz, lead)
            cut_tail = min(fuzz, tail)
            if fuzz and (cut_head, cut_tail) == (min(fuzz - 1, lead), min(fuzz - 1, tail)):
                continue
            part = body[cut_head:len(body) - cut_tail]
            old = [text for kind, text in part if kind != "+"]
            pos = _locate(src, old, nominal + cut_head + drift, floor)
            if pos is not None:
                found = (pos, part, old, cut_head)
                break
        if found is None:
            raise PatchError(number)
        pos, part, old, cut_head = found
        out.extend(src[floor:pos])
        out.extend(text for kind, text in part if kind != "-")
        floor = pos + len(old)
        drift = pos - (nominal + cut_head)
    out.extend(src[floor:])
    return "".join(out)
