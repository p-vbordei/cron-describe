import { describe as testDescribe, it, expect } from "vitest";
import { describe, isValid } from "../src/index.js";

testDescribe("valid expressions", () => {
  it("every minute", () => {
    const r = describe("* * * * *");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toBe("every minute");
  });

  it("at fixed time", () => {
    const r = describe("0 9 * * *");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toBe("at 09:00");
  });

  it("step every 5 minutes", () => {
    const r = describe("*/5 * * * *");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.fields.minute).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  });

  it("weekdays", () => {
    const r = describe("0 9 * * 1-5");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toBe("at 09:00 on weekdays");
  });

  it("weekend", () => {
    const r = describe("0 10 * * 0,6");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toBe("at 10:00 on weekends");
  });

  it("DOW name aliases", () => {
    const r = describe("0 9 * * mon-fri");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toBe("at 09:00 on weekdays");
  });

  it("month names", () => {
    const r = describe("0 0 1 jan *");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toContain("January");
  });

  it("dow=7 normalized to 0 (Sunday)", () => {
    const r = describe("0 9 * * 7");
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.fields.dayOfWeek).toEqual([0]);
      expect(r.description).toContain("Sunday");
    }
  });

  it("list of days", () => {
    const r = describe("0 12 * * 1,3,5");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.description).toBe("at 12:00 on Monday, Wednesday and Friday");
  });
});

testDescribe("invalid expressions", () => {
  it.each([
    ["", "expected 5 fields"],
    ["* * * *", "expected 5 fields"],
    ["* * * * * *", "expected 5 fields"],
    ["60 * * * *", "invalid value in minute"],
    ["* 24 * * *", "invalid value in hour"],
    ["* * 32 * *", "invalid value in day-of-month"],
    ["* * * 13 *", "invalid value in month"],
    ["* * * * 8", "invalid value in day-of-week"],
    ["abc * * * *", "invalid value in minute"],
    ["1-60 * * * *", "invalid range in minute"],
    ["5-2 * * * *", "inverted range in minute"],
    ["*/0 * * * *", "step must be > 0"],
    ["*/abc * * * *", "invalid step in minute"],
  ])("rejects %s", (input, snippet) => {
    const r = describe(input);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toContain(snippet);
  });
});

testDescribe("isValid", () => {
  it("returns boolean only", () => {
    expect(isValid("0 9 * * *")).toBe(true);
    expect(isValid("0 25 * * *")).toBe(false);
  });
});
