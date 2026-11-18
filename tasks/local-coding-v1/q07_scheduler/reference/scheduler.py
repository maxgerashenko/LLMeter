import heapq


class CycleError(Exception):
    def __init__(self, cycle):
        super().__init__("dependency cycle: " + " -> ".join(cycle))
        self.cycle = cycle


def _find_cycle(deps):
    """Iterative depth-first search along dependency edges."""
    state = {}  # name -> 1 while on the stack, 2 when finished
    for root in deps:
        if root in state:
            continue
        path = [root]
        iters = [iter(deps[root])]
        state[root] = 1
        while path:
            for nxt in iters[-1]:
                if state.get(nxt) == 1:
                    cycle = path[path.index(nxt):]
                    low = cycle.index(min(cycle))
                    return cycle[low:] + cycle[:low]
                if nxt not in state:
                    state[nxt] = 1
                    path.append(nxt)
                    iters.append(iter(deps[nxt]))
                    break
            else:
                state[path.pop()] = 2
                iters.pop()
    return None


def schedule(tasks, workers):
    if workers < 1:
        raise ValueError("workers must be at least 1")
    info = {}
    for task in tasks:
        name = task["name"]
        if name in info:
            raise ValueError(f"duplicate task name: {name}")
        if task["duration"] < 1:
            raise ValueError(f"bad duration for {name}")
        info[name] = (task["duration"], task.get("priority", 0))
    deps = {}
    for task in tasks:
        wanted = list(dict.fromkeys(task.get("deps") or []))
        for dep in wanted:
            if dep not in info:
                raise ValueError(f"unknown dependency: {dep}")
        deps[task["name"]] = wanted

    cycle = _find_cycle(deps)
    if cycle is not None:
        raise CycleError(cycle)

    waiting = {name: len(d) for name, d in deps.items()}
    dependants = {name: [] for name in deps}
    for name, wanted in deps.items():
        for dep in wanted:
            dependants[dep].append(name)

    ready = [(-info[n][1], n) for n, count in waiting.items() if count == 0]
    heapq.heapify(ready)
    running = []  # (end, name)
    free = workers
    now = 0
    result = []
    while ready or running:
        while ready and free:
            _neg, name = heapq.heappop(ready)
            end = now + info[name][0]
            result.append((name, now, end))
            heapq.heappush(running, (end, name))
            free -= 1
        now = running[0][0]
        while running and running[0][0] == now:
            _end, done = heapq.heappop(running)
            free += 1
            for nxt in dependants[done]:
                waiting[nxt] -= 1
                if waiting[nxt] == 0:
                    heapq.heappush(ready, (-info[nxt][1], nxt))
    result.sort(key=lambda row: (row[1], row[0]))
    return result
