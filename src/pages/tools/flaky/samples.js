/*
  F22: sample input for "Try it with sample data": three JUnit runs of the
  same commit and one Playwright log with retries. Invented test names; the
  error messages are the shapes real runners print.
*/

const junit = (cases) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="e2e">\n  <testsuite name="checkout" tests="${cases.length}">\n${cases
    .map(
      ([name, classname, failure]) =>
        `    <testcase name="${name}" classname="${classname}" time="3.2">${
          failure ? `<failure message="${failure.replace(/"/g, "&quot;")}">${failure}</failure>` : ""
        }</testcase>`
    )
    .join("\n")}\n  </testsuite>\n</testsuites>\n`;

const T1 = "TimeoutError: locator.click: Timeout 10000ms exceeded.\nwaiting for getByRole('button', { name: 'Pay now' })";
const T2 = "Error: expect(received).toHaveLength(expected)\nExpected length: 3\nReceived length: 4\nduplicate key value violates unique constraint \"orders_pkey\"";
const T3 = "page.goto: net::ERR_CONNECTION_RESET at https://staging.example.com/api/rates";

export const SAMPLE_RUNS = [
  {
    name: "run-1.xml",
    text: junit([
      ["pays with a saved card", "checkout.spec.ts", T1],
      ["applies a discount code", "checkout.spec.ts", null],
      ["lists the last three orders", "orders.spec.ts", null],
      ["shows live exchange rates", "rates.spec.ts", null],
      ["signs in with SSO", "auth.spec.ts", null],
    ]),
  },
  {
    name: "run-2.xml",
    text: junit([
      ["pays with a saved card", "checkout.spec.ts", null],
      ["applies a discount code", "checkout.spec.ts", null],
      ["lists the last three orders", "orders.spec.ts", T2],
      ["shows live exchange rates", "rates.spec.ts", T3],
      ["signs in with SSO", "auth.spec.ts", null],
    ]),
  },
  {
    name: "run-3.xml",
    text: junit([
      ["pays with a saved card", "checkout.spec.ts", T1],
      ["applies a discount code", "checkout.spec.ts", null],
      ["lists the last three orders", "orders.spec.ts", null],
      ["shows live exchange rates", "rates.spec.ts", null],
      ["signs in with SSO", "auth.spec.ts", null],
    ]),
  },
  {
    name: "playwright-ci.log",
    text: [
      "Running 6 tests using 2 workers",
      "",
      "  ✓  1 [chromium] › tests/profile.spec.ts:8:3 › Profile › updates the avatar (2.4s)",
      "  ✘  2 [chromium] › tests/profile.spec.ts:21:3 › Profile › saves the birthday (1.9s)",
      "",
      "    Error: expect(locator).toHaveText(expected)",
      "    Expected string: \"31 Dec 1990\"",
      "    Received string: \"1 Jan 1991\"",
      "    Timezone: UTC vs Asia/Kolkata",
      "",
      "  ✓  3 [chromium] › tests/profile.spec.ts:21:3 › Profile › saves the birthday (retry #1) (2.0s)",
      "  ✓  4 [chromium] › tests/search.spec.ts:5:3 › Search › finds a product (1.1s)",
      "",
      "  1 flaky",
      "    [chromium] › tests/profile.spec.ts:21:3 › Profile › saves the birthday",
      "  5 passed (14.2s)",
    ].join("\n"),
  },
];
