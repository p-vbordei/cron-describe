# cron-describe

Validate 5-field cron expressions and produce human-readable English descriptions. Zero runtime dependencies.

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
| Day-of-week 7 = Sunday | `7` normalized to `0` |

The Quartz-style seconds field and `?` are **not** supported — this is plain 5-field cron.

## API

### `describe(input: string): ValidationResult`

Returns one of:

```ts
{ valid: true, description: string, fields: { minute: number[]; hour: number[]; dayOfMonth: number[]; month: number[]; dayOfWeek: number[]; } }
{ valid: false, error: string }
```

`fields` contains the fully expanded value sets, ready to feed an occurrence calculator. `dayOfWeek` is always normalized to `0..6` (Sunday=0).

### `isValid(input: string): boolean`

Convenience helper when you only care about validity.

## License

Apache-2.0 © Vlad Bordei
