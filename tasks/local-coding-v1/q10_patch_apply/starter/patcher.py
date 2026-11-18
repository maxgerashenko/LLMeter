class PatchError(Exception):
    def __init__(self, hunk):
        super().__init__(f"hunk {hunk} does not apply")
        self.hunk = hunk


def apply_patch(original, patch):
    raise NotImplementedError
