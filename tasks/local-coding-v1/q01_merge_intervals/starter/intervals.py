from datetime import date


def merge_intervals(intervals):
    """Merge overlapping or touching inclusive date intervals."""
    result = []
    for start, end in intervals:
        if result and start < result[-1][1]:
            result[-1] = (result[-1][0], end)
        else:
            result.append((start, end))
    return result
