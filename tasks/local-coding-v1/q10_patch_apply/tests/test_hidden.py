import difflib
import random
import unittest

from patcher import PatchError, apply_patch

BASE = "a\nb\nc\nd\ne\nf\ng\nh\ni\nj\n"
MARK = "\\ No newline at end of file\n"


class ExactHunks(unittest.TestCase):
    def test_replace_with_file_headers(self):
        patch = "--- a/x\n+++ b/x\n@@ -2,3 +2,3 @@\n b\n-c\n+C\n d\n"
        self.assertEqual(apply_patch(BASE, patch), BASE.replace("c", "C"))

    def test_header_with_trailing_text_and_leading_noise(self):
        patch = "diff --git a/x b/x\nindex 1..2\n@@ -2,3 +2,3 @@ def f():\n b\n-c\n+C\n d\n"
        self.assertEqual(apply_patch(BASE, patch), BASE.replace("c", "C"))

    def test_count_left_out_means_one(self):
        self.assertEqual(apply_patch(BASE, "@@ -3 +3 @@\n-c\n+C\n"), BASE.replace("c", "C"))

    def test_two_hunks_use_original_line_numbers(self):
        patch = "@@ -1,2 +1,4 @@\n a\n+x\n+y\n b\n@@ -8,2 +10,2 @@\n-h\n+H\n i\n"
        self.assertEqual(apply_patch(BASE, patch), "a\nx\ny\nb\nc\nd\ne\nf\ng\nH\ni\nj\n")

    def test_pure_deletion(self):
        self.assertEqual(apply_patch(BASE, "@@ -3,2 +2,0 @@\n-c\n-d\n"), "a\nb\ne\nf\ng\nh\ni\nj\n")

    def test_insert_after_line(self):
        self.assertEqual(apply_patch(BASE, "@@ -2,0 +3,2 @@\n+x\n+y\n"),
                         "a\nb\nx\ny\nc\nd\ne\nf\ng\nh\ni\nj\n")

    def test_insert_at_start(self):
        self.assertEqual(apply_patch(BASE, "@@ -0,0 +1 @@\n+top\n"), "top\n" + BASE)

    def test_insert_at_end(self):
        self.assertEqual(apply_patch(BASE, "@@ -10,0 +11 @@\n+k\n"), BASE + "k\n")

    def test_create_from_empty(self):
        self.assertEqual(apply_patch("", "@@ -0,0 +1,2 @@\n+a\n+b\n"), "a\nb\n")

    def test_delete_everything(self):
        self.assertEqual(apply_patch("a\nb\n", "@@ -1,2 +0,0 @@\n-a\n-b\n"), "")

    def test_blank_lines_after_last_hunk_ignored(self):
        self.assertEqual(apply_patch(BASE, "@@ -3 +3 @@\n-c\n+C\n\n\n"), BASE.replace("c", "C"))

    def test_empty_line_in_body_is_empty_context(self):
        self.assertEqual(apply_patch("a\n\nb\n", "@@ -1,3 +1,3 @@\n a\n\n-b\n+B\n"), "a\n\nB\n")

    def test_only_newline_is_a_line_ending(self):
        original = "a\x0cb\r\nc d\ne\n"
        patch = "@@ -1,3 +1,3 @@\n a\x0cb\r\n-c d\n+C\n e\n"
        self.assertEqual(apply_patch(original, patch), "a\x0cb\r\nC\ne\n")


class FinalNewline(unittest.TestCase):
    def test_both_sides_without_newline(self):
        patch = "@@ -1,2 +1,2 @@\n a\n-b\n" + MARK + "+B\n" + MARK
        self.assertEqual(apply_patch("a\nb", patch), "a\nB")

    def test_add_final_newline(self):
        patch = "@@ -1,2 +1,2 @@\n a\n-b\n" + MARK + "+b\n"
        self.assertEqual(apply_patch("a\nb", patch), "a\nb\n")

    def test_remove_final_newline(self):
        patch = "@@ -1,2 +1,2 @@\n a\n-b\n+b\n" + MARK
        self.assertEqual(apply_patch("a\nb\n", patch), "a\nb")

    def test_context_without_newline(self):
        patch = "@@ -1,2 +1,2 @@\n-a\n+A\n b\n" + MARK
        self.assertEqual(apply_patch("a\nb", patch), "A\nb")

    def test_newline_difference_rejects(self):
        with self.assertRaises(PatchError) as ctx:
            apply_patch("a\nb", "@@ -1,2 +1,2 @@\n a\n-b\n+B\n")
        self.assertEqual(ctx.exception.hunk, 1)

    def test_marker_expected_but_file_has_newline(self):
        patch = "@@ -1,2 +1,2 @@\n a\n-b\n" + MARK + "+B\n"
        with self.assertRaises(PatchError):
            apply_patch("a\nb\n", patch)


class OffsetsAndFuzz(unittest.TestCase):
    PAIRS = "x\ny\nx\ny\nx\ny\n"

    def test_offset_later(self):
        original = "n1\nn2\nn3\n" + BASE
        patch = "@@ -2,3 +2,3 @@\n b\n-c\n+C\n d\n"
        self.assertEqual(apply_patch(original, patch), "n1\nn2\nn3\n" + BASE.replace("c", "C"))

    def test_offset_earlier(self):
        patch = "@@ -9,2 +9,2 @@\n b\n-c\n+C\n"
        self.assertEqual(apply_patch(BASE, patch), BASE.replace("c", "C"))

    def test_exact_position_wins(self):
        self.assertEqual(apply_patch(self.PAIRS, "@@ -3,2 +3,2 @@\n x\n-y\n+Z\n"),
                         "x\ny\nx\nZ\nx\ny\n")

    def test_earlier_wins_a_tie(self):
        self.assertEqual(apply_patch(self.PAIRS, "@@ -4,2 +4,2 @@\n x\n-y\n+Z\n"),
                         "x\ny\nx\nZ\nx\ny\n")

    def test_nearest_wins(self):
        original = "x\ny\n1\n2\n3\n4\n5\nx\ny\n"
        self.assertEqual(apply_patch(original, "@@ -6,2 +6,2 @@\n x\n-y\n+Z\n"),
                         "x\ny\n1\n2\n3\n4\n5\nx\nZ\n")

    def test_drift_carries_to_next_hunk(self):
        original = "n1\nn2\nn3\na\nb\nc\n" + self.PAIRS
        patch = "@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n@@ -6,2 +6,2 @@\n x\n-y\n+Z\n"
        self.assertEqual(apply_patch(original, patch),
                         "n1\nn2\nn3\na\nB\nc\nx\ny\nx\nZ\nx\ny\n")

    def test_hunk_cannot_go_before_previous_hunk(self):
        patch = "@@ -3,2 +3,2 @@\n x\n-y\n+Z\n@@ -1,2 +1,2 @@\n x\n-y\n+W\n"
        with self.assertRaises(PatchError) as ctx:
            apply_patch("x\ny\nx\ny\n", patch)
        self.assertEqual(ctx.exception.hunk, 2)

    def test_second_hunk_skips_used_lines(self):
        patch = "@@ -1,2 +1,2 @@\n x\n-y\n+Z\n@@ -1,2 +1,2 @@\n x\n-y\n+W\n"
        self.assertEqual(apply_patch(self.PAIRS, patch), "x\nZ\nx\nW\nx\ny\n")

    def test_fuzz_one_ignores_outer_context(self):
        patch = "@@ -1,3 +1,3 @@\n WRONG\n-b\n+B\n c\n"
        self.assertEqual(apply_patch("a\nb\nc\nd\n", patch), "a\nB\nc\nd\n")

    def test_fuzz_two(self):
        patch = "@@ -2,4 +2,4 @@\n b\n-c\n+C\n X\n Y\n"
        self.assertEqual(apply_patch("a\nb\nc\nd\ne\n", patch), "a\nb\nC\nd\ne\n")

    def test_fuzz_keeps_originals_lines_not_the_patchs(self):
        patch = "@@ -1,5 +1,5 @@\n A?\n b\n-c\n+C\n d\n E?\n"
        self.assertEqual(apply_patch("a\nb\nc\nd\ne\n", patch), "a\nb\nC\nd\ne\n")

    def test_exact_match_far_away_beats_fuzzy_match_nearby(self):
        original = "q\nb\nc\nz\n1\n2\n3\na\nb\nc\nd\n"
        patch = "@@ -1,4 +1,4 @@\n a\n b\n-c\n+C\n d\n"
        self.assertEqual(apply_patch(original, patch), "q\nb\nc\nz\n1\n2\n3\na\nb\nC\nd\n")

    def test_fuzz_with_offset(self):
        original = "n1\nn2\na\nb\nc\nd\n"
        patch = "@@ -1,3 +1,3 @@\n WRONG\n-b\n+B\n c\n"
        self.assertEqual(apply_patch(original, patch), "n1\nn2\na\nB\nc\nd\n")

    def test_fuzz_three_is_too_much(self):
        patch = "@@ -1,7 +1,7 @@\n X\n Y\n Z\n-d\n+D\n e\n f\n g\n"
        with self.assertRaises(PatchError):
            apply_patch("a\nb\nc\nd\ne\nf\ng\n", patch)

    def test_fuzz_never_ignores_removed_lines(self):
        with self.assertRaises(PatchError) as ctx:
            apply_patch("a\nb\nc\n", "@@ -2,2 +2,2 @@\n-WRONG\n+B\n c\n")
        self.assertEqual(ctx.exception.hunk, 1)

    def test_failing_hunk_number(self):
        patch = "@@ -1,2 +1,2 @@\n a\n-b\n+B\n@@ -5,2 +5,2 @@\n e\n-nope\n+F\n"
        with self.assertRaises(PatchError) as ctx:
            apply_patch(BASE, patch)
        self.assertEqual(ctx.exception.hunk, 2)


class MalformedPatches(unittest.TestCase):
    def bad(self, patch):
        with self.assertRaises(ValueError):
            apply_patch(BASE, patch)

    def test_no_hunk(self):
        self.bad("--- a/x\n+++ b/x\n")

    def test_empty_patch(self):
        self.bad("")

    def test_bad_header(self):
        self.bad("@@ -x,1 +1,1 @@\n-a\n+A\n")

    def test_body_too_short(self):
        self.bad("@@ -1,3 +1,3 @@\n a\n-b\n+B\n")

    def test_unknown_prefix(self):
        self.bad("@@ -1,2 +1,2 @@\n a\n*b\n")

    def test_text_after_complete_hunk(self):
        self.bad("@@ -1 +1 @@\n-a\n+A\n b\n")

    def test_whole_patch_checked_before_applying(self):
        self.bad("@@ -1 +1 @@\n-nope\n+A\n@@ -3 +3 @@\n-c\n")


class RoundTrip(unittest.TestCase):
    def roundtrip(self, seed, context):
        rng = random.Random(seed)
        for _ in range(60):
            old = [f"line {rng.randrange(40)}\n" for _ in range(rng.randrange(0, 40))]
            new = list(old)
            for _ in range(rng.randrange(1, 6)):
                where = rng.randrange(len(new) + 1)
                if new and rng.random() < 0.5:
                    del new[min(where, len(new) - 1)]
                else:
                    new.insert(where, f"new {rng.randrange(1000)}\n")
            if old == new:
                continue
            patch = "".join(difflib.unified_diff(old, new, "a", "b", n=context))
            self.assertEqual(apply_patch("".join(old), patch), "".join(new), patch)

    def test_roundtrip_three_lines_of_context(self):
        self.roundtrip(1, 3)

    def test_roundtrip_one_line_of_context(self):
        self.roundtrip(2, 1)

    def test_roundtrip_no_context(self):
        self.roundtrip(3, 0)
