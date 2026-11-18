`records.py` defines a `Record` class with a `from_dict` constructor. Add a second constructor, `Record.from_csv_row(row)`, in the same style.

Specification:

- `row` is one line of CSV text with exactly four fields in this order: `name, qty, price, active`. A trailing line ending (`\n` or `\r\n`) is allowed.
- Fields may be quoted with double quotes, and a quoted field may contain commas (standard CSV rules).
- Leading and trailing whitespace around each field value is removed.
- If the row does not have exactly four fields, raise `RecordError("row", ...)`.
- Each field is validated exactly as `from_dict` validates it, and failures raise `RecordError` with the same field name as `from_dict` uses. The fields are checked in the order name, qty, price, active, and the first failure is the one reported.
- Do not duplicate the validation rules: `from_dict` must keep working as before.

Do not change the existing public behaviour of `Record`, `RecordError` or `from_dict`.
