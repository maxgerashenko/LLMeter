#!/usr/bin/env python3
"""Run the frozen local coding suite against one model in one runtime.

One call is one run: one model, one runtime, thinking on or off, a fixed
number of parallel requests. The script loads the model (and nothing else),
sends the ten prompts, unloads the model, grades the replies and appends the
result rows to a CSV. Standard library only.

    python3 scripts/run_local_suite.py --runtime tensorfold --model-id M02 \
        --model TensorFold/Qwen3.8-27B-MLX-4bit --thinking off --parallel 4 \
        --context 209715

Run rules: data/local-coding-task-set.md. Suite: tasks/local-coding-v1.
"""

import argparse
import csv
import datetime
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUITE = ROOT / "tasks" / "local-coding-v1"
sys.path.insert(0, str(SUITE))
import grade as suite  # noqa: E402

def find_tensorfold():
    """The engine the TensorFold app itself runs (newest downloaded one),
    or the older copy bundled in the app if none was downloaded."""
    downloaded = sorted(
        Path.home().glob(".vontra/engine-runtimes/tensorfold-engine-*/bin/tensorfold-native"),
        key=lambda p: [int(n) for n in p.parts[-3].split("-")[2].split(".")],
    )
    if downloaded:
        return str(downloaded[-1])
    return "/Applications/TensorFold.app/Contents/Resources/engine/bin/tensorfold-native"


TENSORFOLD = find_tensorfold()
LMS = os.path.expanduser("~/.lmstudio/bin/lms")
TENSORFOLD_PORT = 18434
LMSTUDIO_URL = "http://127.0.0.1:1234"
LMSTUDIO_IDENTIFIER = "llmeter-under-test"

MAX_TOKENS = {"off": 4000, "on": 12000}
# Wall time for one task. A thinking run gets longer, so that a slow model
# (about 15 tokens per second) can still spend its whole token budget.
REQUEST_TIMEOUT_SECONDS = {"off": 300, "on": 900}
LOAD_TIMEOUT_SECONDS = 900
SAMPLING = {"temperature": 0.2, "top_p": 0.95, "top_k": 40}

# Columns of data/local-runtime-results.csv, as the run rules list them. The
# site's Runs page reads this file.
COLUMNS = [
    "date", "model_id", "runtime", "runtime_version", "thinking", "parallel", "context_tokens",
    "task_id", "tests_passed", "tests_total", "score", "wall_seconds", "prompt_tokens",
    "output_tokens", "gen_tok_per_s", "prompt_tok_per_s", "load_seconds", "peak_mem_gb",
    "end_reason", "hardware", "notes",
]
RUNTIME_NAMES = {"tensorfold": "TensorFold", "lmstudio": "LM Studio"}


def sh(args, timeout=120):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout)


def http_json(url, payload=None, timeout=30):
    data = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def running_tensorfold_servers():
    out = sh(["pgrep", "-f", "tensorfold-native serve"]).stdout.split()
    return [int(pid) for pid in out]


def lmstudio_loaded():
    out = sh([LMS, "ps", "--json"]).stdout.strip()
    try:
        return [m.get("identifier") or m.get("modelKey") for m in json.loads(out)]
    except ValueError:
        return [] if "No models are currently loaded" in sh([LMS, "ps"]).stdout else ["unknown"]


class PeakRss(threading.Thread):
    """Samples the resident memory of one process. On Apple GPUs part of the
    model memory is not counted in RSS, so this is a lower bound."""

    def __init__(self, pid):
        super().__init__(daemon=True)
        self.pid, self.peak_kb, self.stop = pid, 0, threading.Event()

    def run(self):
        while not self.stop.wait(2):
            out = sh(["ps", "-o", "rss=", "-p", str(self.pid)]).stdout.strip()
            if out.isdigit():
                self.peak_kb = max(self.peak_kb, int(out))


class TensorFold:
    name = "tensorfold"

    def __init__(self, args, log_path):
        self.args, self.log_path, self.proc, self.rss = args, log_path, None, None
        self.url = f"http://127.0.0.1:{TENSORFOLD_PORT}"
        self.api_model = args.model

    def version(self):
        return sh([TENSORFOLD, "--version"]).stdout.strip()

    def check_isolation(self):
        problems = []
        if running_tensorfold_servers():
            problems.append("a tensorfold-native server is already running")
        if lmstudio_loaded():
            problems.append("LM Studio has a model loaded (run: lms unload --all)")
        return problems

    def start(self):
        a = self.args
        command = [
            TENSORFOLD, "serve", a.model, "--host", "127.0.0.1", "--port", str(TENSORFOLD_PORT),
            "--context", str(a.context), "--parallel", str(a.parallel),
            "--temperature", str(SAMPLING["temperature"]), "--top-p", str(SAMPLING["top_p"]),
            "--top-k", str(SAMPLING["top_k"]), "--max-tokens", str(MAX_TOKENS[a.thinking]),
            "--thinking" if a.thinking == "on" else "--no-thinking",
            "--no-drafts", "--no-update-check",
        ]
        log = open(self.log_path, "w")
        log.write(" ".join(command) + "\n")
        log.flush()
        self.proc = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
        self.rss = PeakRss(self.proc.pid)
        self.rss.start()
        deadline = time.time() + LOAD_TIMEOUT_SECONDS
        while time.time() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError(f"server exited with code {self.proc.returncode}; see {self.log_path}")
            try:
                models = http_json(self.url + "/v1/models", timeout=5)
                ids = [m["id"] for m in models.get("data", [])]
                if ids:
                    self.api_model = ids[0]
                    return
            except (urllib.error.URLError, OSError, ValueError):
                time.sleep(2)
        raise RuntimeError("server did not come up in time")

    def extra_body(self):
        return {}

    def stop(self):
        if self.rss:
            self.rss.stop.set()
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=60)
            except subprocess.TimeoutExpired:
                self.proc.kill()

    def peak_rss_gb(self):
        return round(self.rss.peak_kb / 1024 / 1024, 2) if self.rss and self.rss.peak_kb else ""


class LMStudio:
    name = "lmstudio"

    def __init__(self, args, log_path):
        self.args, self.log_path = args, log_path
        self.url = LMSTUDIO_URL
        self.api_model = LMSTUDIO_IDENTIFIER

    def version(self):
        # The app's version; `lms version` prints only the CLI's commit.
        return sh(["defaults", "read", "/Applications/LM Studio.app/Contents/Info",
                   "CFBundleShortVersionString"]).stdout.strip()

    def check_isolation(self):
        problems = []
        if running_tensorfold_servers():
            problems.append("a tensorfold-native server is running")
        if lmstudio_loaded():
            problems.append("LM Studio already has a model loaded (run: lms unload --all)")
        return problems

    def start(self):
        a = self.args
        command = [LMS, "load", a.model, "-y", "--context-length", str(a.context),
                   "--parallel", str(a.parallel), "--identifier", LMSTUDIO_IDENTIFIER]
        result = sh(command, timeout=LOAD_TIMEOUT_SECONDS)
        Path(self.log_path).write_text(" ".join(command) + "\n" + result.stdout + result.stderr)
        if result.returncode != 0:
            raise RuntimeError(f"lms load failed; see {self.log_path}")
        loaded = lmstudio_loaded()
        if len(loaded) != 1:
            raise RuntimeError(f"expected exactly one loaded model, found {loaded}")

    def extra_body(self):
        # Thinking switch for LM Studio's OpenAI-compatible API.
        return {"reasoning": {"effort": "medium" if self.args.thinking == "on" else "none"},
                "chat_template_kwargs": {"enable_thinking": self.args.thinking == "on"}}

    def stop(self):
        sh([LMS, "unload", "--all"])

    def peak_rss_gb(self):
        return ""


def open_stream(url, body, timeout):
    """Start a streamed chat completion. Asks for token usage in the stream;
    a server that rejects that option is asked again without it."""
    for with_usage in (True, False):
        payload = dict(body, stream=True)
        if with_usage:
            payload["stream_options"] = {"include_usage": True}
        request = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                         headers={"Content-Type": "application/json"})
        try:
            return urllib.request.urlopen(request, timeout=timeout)
        except urllib.error.HTTPError as exc:
            if not with_usage or exc.code not in (400, 422):
                raise


def ask(runtime, task, max_tokens, timeout):
    """Send one task. Returns a dict with the reply and its measurements.

    The reply is read as a stream, so a request that runs out of time still
    keeps the text and the token count produced so far."""
    body = {
        "model": runtime.api_model,
        "messages": [{"role": "user", "content": suite.build_prompt(task)}],
        "max_tokens": max_tokens,
        **SAMPLING,
        **runtime.extra_body(),
    }
    started = time.time()
    deadline = started + timeout
    row = {"id": task["id"], "content": "", "reasoning": "", "end_reason": "error", "notes": "",
           "prompt_tokens": "", "output_tokens": "", "reasoning_tokens": ""}
    content, reasoning, usage, finish, chunks = [], [], {}, None, 0
    try:
        with open_stream(runtime.url + "/v1/chat/completions", body, timeout) as response:
            for raw in response:
                if time.time() > deadline:
                    raise TimeoutError()
                line = raw.decode("utf-8", errors="replace").strip()
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                event = json.loads(data)
                usage = event.get("usage") or usage
                for choice in event.get("choices") or []:
                    delta = choice.get("delta") or {}
                    text = delta.get("content") or ""
                    thought = delta.get("reasoning_content") or delta.get("reasoning") or ""
                    content.append(text)
                    reasoning.append(thought)
                    chunks += bool(text or thought)
                    finish = choice.get("finish_reason") or finish
        if finish:
            row["end_reason"] = "truncated" if finish == "length" else "finished"
        else:
            row["notes"] = "stream ended without a finish reason"
    except TimeoutError:
        row["end_reason"] = "timeout"
    except urllib.error.HTTPError as exc:
        row["notes"] = f"HTTP {exc.code}: {exc.read().decode('utf-8', 'replace')[:200]}"
    except (urllib.error.URLError, OSError, ValueError, KeyError) as exc:
        if "timed out" in str(exc):
            row["end_reason"] = "timeout"
        else:
            row["notes"] = repr(exc)[:200]
    row["content"], row["reasoning"] = "".join(content), "".join(reasoning)
    if usage:
        row["prompt_tokens"] = usage.get("prompt_tokens", "")
        row["output_tokens"] = usage.get("completion_tokens", "")
        details = usage.get("completion_tokens_details") or {}
        row["reasoning_tokens"] = details.get("reasoning_tokens", "")
    elif chunks:
        # No usage record (for example after a timeout): one stream chunk is
        # about one token, so the chunk count stands in for the token count.
        row["output_tokens"] = chunks
        row["notes"] = (row["notes"] + " output_tokens counted from stream chunks").strip()
    row["wall_seconds"] = round(time.time() - started, 1)
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--runtime", choices=["tensorfold", "lmstudio"], required=True)
    parser.add_argument("--model-id", required=True, help="id in data/local-test-models.csv")
    parser.add_argument("--model", required=True, help="model name or path as the runtime knows it")
    parser.add_argument("--thinking", choices=["on", "off"], required=True)
    parser.add_argument("--parallel", type=int, default=1)
    parser.add_argument("--context", type=int, required=True)
    parser.add_argument("--tasks", default="", help="comma-separated task ids (default: all)")
    parser.add_argument("--results", default=str(ROOT / "data" / "local-runtime-results.csv"),
                        help="CSV to append to")
    parser.add_argument("--hardware", default="MacBook Pro M5 Pro, 64 GB")
    parser.add_argument("--runs-dir", default=str(ROOT / "data" / "local-runs"))
    args = parser.parse_args()

    manifest = suite.load_manifest()
    tasks = manifest["tasks"]
    if args.tasks:
        wanted = set(args.tasks.split(","))
        tasks = [t for t in tasks if t["id"] in wanted]

    today = datetime.date.today().isoformat()
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    run_id = f"{stamp}-{args.model_id}-{args.runtime}-think{args.thinking}-p{args.parallel}"
    run_dir = Path(args.runs_dir) / run_id
    answers = run_dir / "answers"
    answers.mkdir(parents=True)
    results_csv = Path(args.results)

    runtime = (TensorFold if args.runtime == "tensorfold" else LMStudio)(args, run_dir / "server.log")
    problems = runtime.check_isolation()
    if problems:
        sys.exit("not isolated: " + "; ".join(problems))

    print(f"[{run_id}] loading {args.model} ...", flush=True)
    load_started = time.time()
    replies = []
    try:
        # Maximum context comes first; parallel requests are halved until the
        # model fits in memory. The number actually used goes into the results.
        while True:
            try:
                runtime.start()
                break
            except RuntimeError as exc:
                runtime.stop()
                if args.parallel == 1:
                    raise
                print(f"[{run_id}] did not load with {args.parallel} parallel ({exc}); "
                      f"retrying with {args.parallel // 2}", flush=True)
                args.parallel //= 2
        load_seconds = round(time.time() - load_started, 1)
        print(f"[{run_id}] loaded in {load_seconds}s; sending {len(tasks)} tasks, "
              f"{args.parallel} at a time", flush=True)
        suite_started = time.time()
        with ThreadPoolExecutor(max_workers=args.parallel) as pool:
            for row in pool.map(lambda t: ask(runtime, t, MAX_TOKENS[args.thinking],
                                              REQUEST_TIMEOUT_SECONDS[args.thinking]), tasks):
                print(f"[{run_id}] {row['id']} {row['end_reason']} {row['wall_seconds']}s "
                      f"out={row.get('output_tokens', '')} {row['notes']}", flush=True)
                replies.append(row)
        suite_seconds = round(time.time() - suite_started, 1)
    finally:
        runtime.stop()

    for row in replies:
        (run_dir / f"{row['id']}.reply.json").write_text(json.dumps(row, indent=2))
        # A truncated, timed-out or failed reply scores 0: no answer file.
        if row["end_reason"] == "finished":
            (answers / f"{row['id']}.txt").write_text(row["content"])

    graded = suite.grade(answers)
    by_id = {t["id"]: t for t in graded["tasks"]}
    selected = [by_id[t["id"]] for t in tasks]
    summary = suite.summarise(manifest, selected)
    summary.update(run_id=run_id, model_id=args.model_id, model=args.model, runtime=args.runtime,
                   thinking=args.thinking, parallel=args.parallel, context_tokens=args.context,
                   load_seconds=load_seconds, suite_seconds=suite_seconds,
                   peak_rss_gb=runtime.peak_rss_gb(), partial=bool(args.tasks))
    (run_dir / "result.json").write_text(json.dumps(summary, indent=2))

    new_file = not results_csv.exists()
    with open(results_csv, "a", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        if new_file:
            writer.writeheader()
        version = runtime.version().split()[-1] if runtime.version() else ""
        for row in replies:
            g = by_id[row["id"]]
            out = row.get("output_tokens") or 0
            writer.writerow({
                "date": today, "model_id": args.model_id, "runtime": RUNTIME_NAMES[args.runtime],
                "runtime_version": version, "thinking": args.thinking, "parallel": args.parallel,
                "context_tokens": args.context, "task_id": row["id"],
                "tests_passed": g["passed"], "tests_total": g["total"],
                "score": g["score"], "wall_seconds": row["wall_seconds"],
                "prompt_tokens": row.get("prompt_tokens", ""), "output_tokens": row.get("output_tokens", ""),
                "gen_tok_per_s": round(out / row["wall_seconds"], 1) if out and row["wall_seconds"] else "",
                # Not measured: the server's resident memory (result.json) leaves
                # out GPU memory, so it is not a peak for the whole model.
                "prompt_tok_per_s": "", "load_seconds": load_seconds, "peak_mem_gb": "",
                "end_reason": row["end_reason"], "hardware": args.hardware,
                "notes": (row["notes"] or g["note"])[:200],
            })

    print(f"[{run_id}] score {summary['score']} by level {summary['by_level']} "
          f"suite {suite_seconds}s load {load_seconds}s")
    for g in selected:
        print(f"  {g['id']} {g['passed']}/{g['total']} score {g['score']} {g['note'][:80]}")


if __name__ == "__main__":
    main()
