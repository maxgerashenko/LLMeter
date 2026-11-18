#!/usr/bin/env python3
"""Local coding suite v1: build prompts, grade answers, check the suite.

Standard library only. Usage:

    python3 grade.py prompt q06            # print the exact prompt for a task
    python3 grade.py prompts OUT_DIR       # write all ten prompts to a folder
    python3 grade.py grade ANSWERS_DIR     # grade answers, print JSON
    python3 grade.py selfcheck             # verify the suite itself

ANSWERS_DIR holds one text file per task with the model's raw reply, named
after the task id: q01.txt ... q10.txt. A missing file scores 0.

A task's score is the share of hidden tests gained over the untouched starter
files, so an answer that changes nothing scores 0.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "manifest.json"
TEST_TIMEOUT_SECONDS = 10      # one hidden test
TASK_TIMEOUT_SECONDS = 300     # all hidden tests of one task

INSTRUCTIONS = """You are given a programming task in Python 3 (standard library only).

Reply with every file you create or change, each one complete, in this exact form:

### FILE: path/to/file.py
```python
<full content of the file>
```

Rules:
- Give whole files, never fragments or diffs.
- Use the file paths shown in the task.
- Do not include tests.
- Text outside the file blocks is ignored.
"""

# Runs inside the task's working directory, in a separate process.
RUNNER = r'''
import json, signal, sys, unittest
sys.path.insert(0, ".")
LIMIT = int(sys.argv[1])

class Timeout(BaseException):
    pass

def on_alarm(signum, frame):
    raise Timeout()

class Result(unittest.TestResult):
    def __init__(self):
        super().__init__()
        self.passed = 0
        self.timeouts = 0
    def addError(self, test, err):
        super().addError(test, err)
        if err[0] is Timeout:
            self.timeouts += 1
    def startTest(self, test):
        super().startTest(test)
        signal.alarm(LIMIT)
    def stopTest(self, test):
        signal.alarm(0)
        super().stopTest(test)
    def addSuccess(self, test):
        self.passed += 1

signal.signal(signal.SIGALRM, on_alarm)
try:
    import test_hidden
    suite = unittest.defaultTestLoader.loadTestsFromModule(test_hidden)
except BaseException as exc:  # the answer does not even import
    print(json.dumps({"passed": 0, "ran": 0, "error": repr(exc)[:300]}))
    sys.exit(0)

def flatten(node):
    for item in node:
        if isinstance(item, unittest.TestSuite):
            yield from flatten(item)
        else:
            yield item

result = Result()
for test in flatten(suite):
    if result.timeouts >= 3:  # a looping answer: the rest count as failed
        break
    try:
        test.run(result)
    except Timeout:
        signal.alarm(0)
        result.timeouts += 1
print(json.dumps({"passed": result.passed, "ran": result.testsRun, "error": None}))
'''

FILE_BLOCK = re.compile(
    r"^#{2,4}\s*FILE:\s*`?([^\n`]+?)`?\s*\n+```[^\n]*\n(.*?)^```[ \t]*$",
    re.DOTALL | re.MULTILINE,
)
THINKING = re.compile(r"<think(?:ing)?>.*?</think(?:ing)?>", re.DOTALL)


def load_manifest():
    return json.loads(MANIFEST.read_text(encoding="utf-8"))


def task_dir(task):
    return HERE / task["dir"]


def find_task(manifest, task_id):
    for task in manifest["tasks"]:
        if task["id"] == task_id or task["dir"] == task_id:
            return task
    raise SystemExit(f"unknown task: {task_id}")


def starter_files(task):
    root = task_dir(task) / "starter"
    return sorted(p for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts)


def build_prompt(task):
    """The exact text sent to a model for this task."""
    parts = [INSTRUCTIONS, "## Task\n", (task_dir(task) / "prompt.md").read_text(encoding="utf-8")]
    parts.append("\n## Files\n")
    root = task_dir(task) / "starter"
    for path in starter_files(task):
        rel = path.relative_to(root).as_posix()
        parts.append(f"\n### FILE: {rel}\n```python\n{path.read_text(encoding='utf-8')}```\n")
    return "".join(parts)


def extract_files(reply):
    """Map of relative path -> content from a model reply. Later blocks win."""
    reply = THINKING.sub("", reply).replace("\r\n", "\n")
    files = {}
    for match in FILE_BLOCK.finditer(reply):
        rel = match.group(1).strip().strip("*").strip()
        path = Path(rel)
        if path.is_absolute() or ".." in path.parts or not rel.endswith(".py"):
            continue
        if path.name.startswith("test_"):
            continue
        files[path.as_posix()] = match.group(2)
    return files


def run_hidden_tests(task, files):
    """Overlay `files` on the starter, run the hidden tests, return counts."""
    total = task["tests"]
    with tempfile.TemporaryDirectory(prefix="llmeter-task-") as tmp:
        work = Path(tmp) / "work"
        shutil.copytree(task_dir(task) / "starter", work)
        for rel, content in files.items():
            target = work / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
        shutil.copy(task_dir(task) / "tests" / "test_hidden.py", work / "test_hidden.py")
        runner = Path(tmp) / "runner.py"
        runner.write_text(RUNNER, encoding="utf-8")
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1", PYTHONHASHSEED="0")
        try:
            proc = subprocess.run(
                [sys.executable, str(runner), str(TEST_TIMEOUT_SECONDS)],
                cwd=work, env=env, capture_output=True, text=True,
                timeout=TASK_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired:
            return {"passed": 0, "total": total, "note": "task timed out"}
    last = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else ""
    try:
        data = json.loads(last)
    except ValueError:
        return {"passed": 0, "total": total, "note": "test run crashed"}
    note = data["error"] or ""
    return {"passed": min(data["passed"], total), "total": total, "note": note}


def task_score(task, passed):
    """Share of the hidden tests gained over the untouched starter files.

    The starter already passes `baseline` tests, so an empty answer scores 0
    and an answer that breaks working behaviour cannot go below 0."""
    gained = max(0, passed - task["baseline"])
    return round(gained / (task["tests"] - task["baseline"]), 4)


def grade(answers_dir):
    manifest = load_manifest()
    rows = []
    for task in manifest["tasks"]:
        path = Path(answers_dir) / f"{task['id']}.txt"
        if not path.is_file():
            row = {"passed": 0, "total": task["tests"], "note": "no answer file"}
        else:
            files = extract_files(path.read_text(encoding="utf-8", errors="replace"))
            if not files:
                row = {"passed": 0, "total": task["tests"], "note": "no file block in answer"}
            else:
                row = run_hidden_tests(task, files)
        row.update(id=task["id"], level=task["level"], weight=task["weight"],
                   baseline=task["baseline"], score=task_score(task, row["passed"]))
        rows.append(row)
    return summarise(manifest, rows)


def summarise(manifest, rows):
    def weighted(selected):
        weight = sum(r["weight"] for r in selected)
        return round(100 * sum(r["weight"] * r["score"] for r in selected) / weight, 1) if weight else None

    levels = {}
    for level in ("easy", "medium", "hard"):
        levels[level] = weighted([r for r in rows if r["level"] == level])
    return {
        "suite": manifest["suite"],
        "version": manifest["version"],
        "score": weighted(rows),
        "by_level": levels,
        "tasks": rows,
    }


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frozen_files():
    """Every file whose content defines the suite, relative to this folder."""
    paths = [HERE / "grade.py"]
    for sub in sorted(HERE.iterdir()):
        if sub.is_dir() and re.match(r"q\d\d_", sub.name):
            paths += sorted(p for p in sub.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    return paths


def reference_files(task):
    root = task_dir(task) / "reference"
    return {p.relative_to(root).as_posix(): p.read_text(encoding="utf-8")
            for p in root.rglob("*.py")}


def selfcheck(write_hashes=False):
    manifest = load_manifest()
    ok = True
    for task in manifest["tasks"]:
        ref = run_hidden_tests(task, reference_files(task))
        start = run_hidden_tests(task, {})
        # The prompt must survive the same path a model answer takes.
        reply = "".join(f"### FILE: {rel}\n```python\n{text}```\n\n"
                        for rel, text in reference_files(task).items())
        via_reply = run_hidden_tests(task, extract_files(reply))
        good = (ref["passed"] == ref["total"] == task["tests"]
                and via_reply["passed"] == task["tests"]
                and start["passed"] == task["baseline"])
        ok &= good
        print(f"{task['id']} {task['level']:<6} tests={task['tests']:>3} "
              f"reference={ref['passed']:>3} starter={start['passed']:>3} "
              f"{'ok' if good else 'PROBLEM ' + ref['note'] + start['note']}")
    current = {p.relative_to(HERE).as_posix(): sha256(p) for p in frozen_files()}
    if write_hashes:
        manifest["sha256"] = current
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        print(f"hashes written for {len(current)} files")
    elif manifest.get("sha256") != current:
        changed = sorted(k for k in set(current) | set(manifest.get("sha256", {}))
                         if current.get(k) != manifest.get("sha256", {}).get(k))
        print("FROZEN FILES CHANGED:", ", ".join(changed))
        ok = False
    else:
        print(f"hashes match for {len(current)} files")
    return ok


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="command", required=True)
    one = sub.add_parser("prompt", help="print the prompt for one task")
    one.add_argument("task")
    many = sub.add_parser("prompts", help="write every prompt to a folder")
    many.add_argument("out_dir")
    grader = sub.add_parser("grade", help="grade a folder of answers")
    grader.add_argument("answers_dir")
    check = sub.add_parser("selfcheck", help="verify references, starters and hashes")
    check.add_argument("--write-hashes", action="store_true",
                       help="record file hashes (only when making a new suite version)")
    args = parser.parse_args()

    if args.command == "prompt":
        sys.stdout.write(build_prompt(find_task(load_manifest(), args.task)))
    elif args.command == "prompts":
        out = Path(args.out_dir)
        out.mkdir(parents=True, exist_ok=True)
        for task in load_manifest()["tasks"]:
            (out / f"{task['id']}.md").write_text(build_prompt(task), encoding="utf-8")
        print(f"wrote prompts to {out}")
    elif args.command == "grade":
        print(json.dumps(grade(args.answers_dir), indent=2))
    elif args.command == "selfcheck":
        sys.exit(0 if selfcheck(args.write_hashes) else 1)


if __name__ == "__main__":
    main()
