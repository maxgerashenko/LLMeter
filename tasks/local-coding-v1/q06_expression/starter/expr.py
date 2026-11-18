class ExprError(Exception):
    def __init__(self, message, pos):
        super().__init__(f"{message} (at {pos})")
        self.message = message
        self.pos = pos


def evaluate(expression, variables=None):
    raise NotImplementedError
