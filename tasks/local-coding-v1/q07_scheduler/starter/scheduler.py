class CycleError(Exception):
    def __init__(self, cycle):
        super().__init__("dependency cycle: " + " -> ".join(cycle))
        self.cycle = cycle


def schedule(tasks, workers):
    raise NotImplementedError
