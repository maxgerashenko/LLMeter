from datetime import date, timedelta


def merge_intervals(intervals):
    """Merge overlapping or touching inclusive date intervals."""
    for start, end in intervals:
        if start > end:
            raise ValueError("interval starts after it ends")
    result = []
    one_day = timedelta(days=1)
    for start, end in sorted(intervals):
        if result and start <= result[-1][1] + one_day:
            if end > result[-1][1]:
                result[-1] = (result[-1][0], end)
        else:
            result.append((start, end))
    return result
