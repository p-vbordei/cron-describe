# cron-describe

[![ci](https://github.com/p-vbordei/cron-describe/actions/workflows/ci.yml/badge.svg)](https://github.com/p-vbordei/cron-describe/actions/workflows/ci.yml)

[![npm](https://img.shields.io/npm/v/cron-describe.svg)](https://www.npmjs.com/package/cron-describe)
[![downloads](https://img.shields.io/npm/dm/cron-describe.svg)](https://www.npmjs.com/package/cron-describe)
[![bundle](https://img.shields.io/bundlejs/size/cron-describe)](https://bundlejs.com/?q=cron-describe)

> Validate 5-field cron expressions and produce human-readable English descriptions. Zero runtime dependencies.

```ts
import { describe, isValid } from "cron-describe";

describe("0 9 * * 1-5");
// {
//   valid: true,
//   description: "at 09:00 on weekdays",
//   fields: {
//     minute: [0],
//     hour: [9],
//     dayOfMonth: [1,2,...,31],
//     month: [1,...,12],
//     dayOfWeek: [1,2,3,4,5],
//   },
// }

describe("0 25 * * *");
// { valid: false, error: "invalid value in hour: 25" }

isValid("*/5 * * * *");  // true
```

## Install

```sh
npm install cron-describe
```

Works with Node 20+, browsers, Bun, Deno. ESM + CJS.

## Why

Two jobs in one small package:

1. **Validate** — does this string look like a real 5-field cron expression? With named months/days, lists, ranges, steps, and proper field-range checks.
2. **Describe** — produce a plain-English sentence a user would understand. Useful for "I'll schedule this for [description]. Confirm?" UIs.

Most cron-parsing libraries either skip validation (accept anything that looks vaguely cron-shaped) or skip description (just give you a boolean). `cron-describe` does both with structured output you can also feed into an occurrence calculator like [cron-next](https://github.com/p-vbordei/cron-next).

## Recipes

### Validate user input before saving

```ts
import { describe } from "cron-describe";

function saveSchedule(input: string) {
  const r = describe(input);
  if (!r.valid) throw new ValidationError(r.error);
  console.log(`Confirmed: ${r.description}`);
  db.save(input);
}
```

### Show user a friendly description

```ts
import { describe } from "cron-describe";

function renderSchedule(cronStr: string): string {
  const r = describe(cronStr);
  return r.valid ? r.description : "(invalid schedule)";
}

renderSchedule("0 9 * * 1-5");   // "at 09:00 on weekdays"
renderSchedule("*/15 * * * *");  // "at 0 minutes past every hour" (every 15 min set)
```

### Use expanded fields with a scheduler

```ts
import { describe } from "cron-describe";

const r = describe("0 9 * * 1,3,5");
if (r.valid) {
  // r.fields.minute === [0]
  // r.fields.hour === [9]
  // r.fields.dayOfWeek === [1, 3, 5]   // Mon, Wed, Fri (Sun=0)
  setupScheduler(r.fields);
}
```

### Round-trip with nl-cron

```ts
import { parse } from "nl-cron";
import { describe } from "cron-describe";

function nlToConfirmedDescription(input: string): string | null {
  const cron = parse(input);
  if (!cron) return null;
  const d = describe(cron.cron);
  return d.valid ? d.description : null;
}

nlToConfirmedDescription("every weekday at 9am");
// "at 09:00 on weekdays"
```

## What's supported

| Syntax | Example |
|---|---|
| Wildcard | `*` |
| Integer | `5` |
| List | `1,3,5` |
| Range | `1-5` |
| Step | `*/5`, `1-10/2`, `5/10` |
| Month name | `jan`, `feb`, ... `dec` |
| Day-of-week name | `sun`, `mon`, ... `sat` |
| Day-of-week `7` | Normalized to `0` (Sunday) |

The Quartz-style seconds field and `?` are **not** supported — this is plain 5-field POSIX cron.

## API

### `describe(input: string): ValidationResult`

```ts
type ValidationResult =
  | {
      valid: true;
      description: string;
      fields: {
        minute: number[];      // 0..59, sorted, deduped
        hour: number[];        // 0..23
        dayOfMonth: number[];  // 1..31
        month: number[];       // 1..12
        dayOfWeek: number[];   // 0..6, Sun=0
      };
    }
  | { valid: false; error: string };
```

`fields` is always fully expanded — `*/5 * * * *` returns `minute: [0, 5, 10, 15, ..., 55]`, not the literal `*/5`. Feed this directly into an occurrence calculator.

### `isValid(input: string): boolean`

Convenience helper when you only care about validity.

## Description style

The English descriptions follow a deterministic pattern, not natural variation:

- Time first: `"at HH:MM"` or `"every minute"`, `"every minute of hour HH"`, `"at MM past every hour"`.
- Day-of-week (when restricted): `"on Monday and Wednesday"`, `"on weekdays"`, `"on weekends"`.
- Day-of-month (when restricted): `"on day-of-month 15"`.
- Month (when restricted): `"in January and February"`.

So you might get: *"at 09:00 on weekdays in January and February"*. Verbose but unambiguous.

## Caveats

- **English only.** No localization. PRs welcome.
- **Day-of-week vs day-of-month "OR semantics"** is normal POSIX cron behavior — when both are restricted, occurrences fire when **either** matches. `describe` doesn't try to encode this in the description (it just lists both restrictions); occurrence calculation should be done with [cron-next](https://github.com/p-vbordei/cron-next).

## License

Apache-2.0 © Vlad Bordei
