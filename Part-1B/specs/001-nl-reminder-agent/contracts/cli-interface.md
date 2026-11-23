# Contract: CLI Interface

**Contract Type**: Command-line interface schema
**Version**: v1 | **Date**: 2026-11-15

This document is the normative contract for the `remind` CLI. Any change to the argument names,
option names, or exit-code semantics constitutes a breaking change and requires a version bump.

---

## Invocation

```
node bin/remind.js <text> --now <ISO-8601> [--timezone <IANA>]
```

Or, once installed globally / via `npm link`:

```
remind <text> --now <ISO-8601> [--timezone <IANA>]
```

---

## Arguments

### Positional: `<text>` (required)

The natural-language reminder request.

| Constraint | Value |
|---|---|
| Type | string |
| Min length | 1 character (after trim) |
| Max length | 2000 characters |
| Encoding | UTF-8 |
| Language | English (v1 scope) |

**Validation failures**: Empty/whitespace → `intent=clarify` (not exit 1); > 2000 chars → exit 1.

---

### Option: `--now <ISO-8601>` (required)

The reference datetime for resolving relative date expressions. The caller (test harness or user) supplies this so that test results are deterministic regardless of system clock.

| Constraint | Value |
|---|---|
| Type | string |
| Format | ISO-8601 datetime with explicit UTC offset |
| Examples | `2026-11-15T09:00:00+05:30`, `2026-11-15T03:30:00Z` |
| Required | Yes |

**Valid examples**:
```
--now "2026-11-15T09:00:00+05:30"
--now "2026-11-15T03:30:00Z"
--now "2026-11-15T09:00:00+00:00"
```

**Invalid examples** (exit 1):
```
--now "2026-11-15"             # missing time and offset
--now "2026-11-15T09:00:00"   # missing UTC offset
--now "not-a-date"             # not ISO-8601
--now ""                       # empty
```

---

### Option: `--timezone <IANA>` (optional)

The IANA timezone string used for resolving relative date expressions and for the UTC offset in the `due` field.

| Constraint | Value |
|---|---|
| Type | string |
| Format | Valid IANA timezone identifier |
| Default | `"Asia/Kolkata"` |
| Examples | `"Asia/Kolkata"`, `"America/New_York"`, `"UTC"`, `"Europe/London"` |

**Invalid values** (exit 1):
```
--timezone "Mars/Olympus"       # not a valid IANA zone
--timezone "IST"                # abbreviation, not IANA zone
--timezone ""                   # empty string
```

---

## Standard Options

| Option | Behaviour |
|---|---|
| `--help`, `-h` | Print usage and exit 0 |
| `--version`, `-V` | Print version and exit 0 |

---

## Exit Codes

| Code | Meaning | Trigger |
|---|---|---|
| `0` | Success — schema-valid JSON output written to stdout | Normal operation |
| `1` | Application error — schema validation failure, pre-flight input validation failure | Invalid input args, schema validation fail, missing required option |
| `4` | Service error — LLM provider unreachable after retries | Timeout, HTTP 429, HTTP 5xx, unknown model, `ECONNREFUSED` |

No other exit codes are used.

---

## stdout / stderr Contract

| Stream | Content when exit 0 | Content when exit 1 or 4 |
|---|---|---|
| `stdout` | Exactly one JSON object conforming to `reminder-output/v1` | Empty (no JSON) |
| `stderr` | Empty | Descriptive error message (human-readable, non-empty) |

The stdout JSON object is always a single line (no trailing newline required, but allowed).

---

## Examples

```bash
# Create a reminder
node bin/remind.js "Call the dentist at 3pm tomorrow" \
  --now "2026-11-15T09:00:00+05:30" \
  --timezone "Asia/Kolkata"
# → {"intent":"create","title":"Call the dentist","due":"2026-11-16T15:00:00+05:30",...}

# Trigger clarification (no time)
node bin/remind.js "Buy milk" \
  --now "2026-11-15T09:00:00+05:30"
# → {"intent":"clarify","clarification_question":"When would you like to be reminded?","due":null,...}

# Trigger service error exit code
node bin/remind.js "Test" --now "2026-11-15T09:00:00+05:30"
# (with LLM_PROVIDER pointing to unreachable endpoint)
# → stderr: "LLM service error: connection refused after 3 attempts"
# → exit code 4

# Invalid timezone
node bin/remind.js "Test" --now "2026-11-15T09:00:00+05:30" --timezone "Bad/Zone"
# → stderr: "Invalid IANA timezone: Bad/Zone"
# → exit code 1
```
