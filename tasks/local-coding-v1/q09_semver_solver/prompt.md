Write `solver.py` with a function `solve(index, root)` and an exception class `ResolutionError`. It picks one version for every package that is needed, so that all version constraints hold.

**Input.**

- `index` maps package name -> version string -> dependencies. Dependencies map a package name to a constraint string. Example: `{"app": {"1.0.0": {"lib": "^1.2.0"}}, "lib": {"1.2.0": {}, "1.3.1": {}}}`.
- `root` maps package name -> constraint string: the packages requested directly.
- A version is `MAJOR.MINOR.PATCH`, three non-negative whole numbers, compared number by number (`1.10.0` is newer than `1.9.9`).

**Constraints.** A constraint is one or more clauses separated by commas; all clauses must hold. Spaces around clauses and between an operator and its version are ignored. Clauses:

| Clause | Meaning |
| --- | --- |
| `*` | any version |
| `==1.2.3`, `!=1.2.3`, `>=1.2.3`, `<=1.2.3`, `>1.2.3`, `<1.2.3` | comparison |
| `1.2.3` (no operator) | same as `==1.2.3` |
| `~1.2.3` | `>=1.2.3` and `<1.3.0` |
| `^1.2.3` | `>=1.2.3` and below the next change of the left-most non-zero number: `^1.2.3` is `<2.0.0`, `^0.2.3` is `<0.3.0`, `^0.0.3` is `<0.0.4`, `^0.0.0` is `<0.0.1` |

A constraint or version that does not follow these rules raises `ValueError`. Validate every constraint and version in `index` and `root` before solving, so the error does not depend on the search order.

**Search order.** The result must be exactly the one this procedure finds:

1. Keep a set of chosen versions and the set of all constraints that apply so far (from `root` and from the dependencies of every chosen version).
2. If every package that has a constraint is chosen, stop: that is the answer.
3. Otherwise take the package with a constraint and no chosen version whose name sorts first.
4. Try its versions from newest to oldest. A version is acceptable if it meets every constraint on that package so far, and its own dependencies do not contradict any version already chosen. Choose the first acceptable version, add its dependencies to the constraints, and continue from step 2.
5. If that leads to no answer, undo it and try the next older version. If no version works (or the package is not in `index`), go back to the previous choice and try its next version.

**Output.** A dict of package name -> chosen version string, containing exactly the packages chosen (no extra packages). An empty `root` gives `{}`.

**Errors.** If the search ends without an answer, raise `ResolutionError`.

**Performance.** The procedure above, implemented directly, is fast enough. Do not enumerate every combination of versions before checking constraints. Dependency chains can be a few hundred packages long.
