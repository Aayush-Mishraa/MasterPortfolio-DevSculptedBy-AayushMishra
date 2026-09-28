/* Content for the Dev Arcade games. All markup here is static and trusted. */

export const SNIPER_LEVELS = [
  {
    title: "The obvious one",
    brief: "Target the Checkout button.",
    target: "#checkout",
    tip: "IDs are unique by contract, which makes them a solid first choice.",
    html: `<div class="mock-toolbar">
  <button class="btn">Continue shopping</button>
  <button class="btn primary" id="checkout">Checkout</button>
</div>`,
  },
  {
    title: "Built for testing",
    brief: "Target the button that places the order.",
    target: '[data-testid="place-order"]',
    tip: "data-testid attributes exist only for tests, so redesigns rarely break them.",
    html: `<div class="mock-actions">
  <button class="btn">Back</button>
  <button class="btn">Save for later</button>
  <button class="btn primary" data-testid="place-order">Place order</button>
</div>`,
  },
  {
    title: "Two classes are better than one",
    brief: "Target the featured plan card.",
    target: ".plan.featured",
    tip: "Chaining classes (.plan.featured) narrows a match without depending on position.",
    html: `<div class="mock-plans">
  <div class="plan">Starter</div>
  <div class="plan featured">Pro ★</div>
  <div class="plan">Team</div>
</div>`,
  },
  {
    title: "Attributes speak",
    brief: "Target the email input.",
    target: 'input[name="email"]',
    tip: "Form fields have names that the backend depends on, so they're stable to select.",
    html: `<form class="mock-form">
  <input type="text" name="fullName" placeholder="Full name">
  <input type="email" name="email" placeholder="Email">
  <input type="tel" name="phone" placeholder="Phone">
</form>`,
  },
  {
    title: "Scope it",
    brief: "Target the Pricing link in the top nav, not the one in the footer.",
    target: 'nav a[href="/pricing"]',
    tip: "Scope to a landmark (nav, main, footer) when the same element appears more than once.",
    html: `<nav class="mock-nav">
  <a href="/">Home</a>
  <a href="/pricing">Pricing</a>
  <a href="/docs">Docs</a>
</nav>
<footer class="mock-footer">
  <a href="/pricing">Pricing</a>
  <a href="/legal">Legal</a>
</footer>`,
  },
  {
    title: "Icons need names",
    brief: "Target the delete button for the second item.",
    target: 'button[aria-label="Delete Milk"]',
    tip: "Accessible names (aria-label) help screen-reader users and give you readable locators.",
    html: `<ul class="mock-list">
  <li>Bread <button class="icon" aria-label="Delete Bread">🗑</button></li>
  <li>Milk <button class="icon" aria-label="Delete Milk">🗑</button></li>
  <li>Eggs <button class="icon" aria-label="Delete Eggs">🗑</button></li>
</ul>`,
  },
  {
    title: "Rows with identity",
    brief: "Target the Edit button in Ada's row.",
    target: 'tr[data-user="ada"] .edit',
    tip: "Select the row by its data, not its position. :nth-child breaks as soon as sorting changes.",
    html: `<table class="mock-table">
  <tr data-user="grace"><td>Grace</td><td><button class="edit">Edit</button></td></tr>
  <tr data-user="ada"><td>Ada</td><td><button class="edit">Edit</button></td></tr>
  <tr data-user="linus"><td>Linus</td><td><button class="edit">Edit</button></td></tr>
</table>`,
  },
  {
    title: "The boss level",
    brief: "Target the Confirm password field in the sign-up form.",
    target: '#signup input[name="confirm"]',
    tip: "Combine a stable container with a stable attribute to get a short, unique, readable selector.",
    html: `<form id="login" class="mock-form">
  <input type="password" name="password" placeholder="Password">
</form>
<form id="signup" class="mock-form">
  <input type="password" name="password" placeholder="Password">
  <input type="password" name="confirm" placeholder="Confirm password">
</form>`,
  },
];

export const BUG_ROUNDS = [
  {
    lang: "JavaScript",
    title: "Save every user",
    lines: [
      "async function saveAll(users) {",
      "  users.forEach(async (user) => {",
      "    await db.save(user);",
      "  });",
      '  console.log("All saved!");',
      "}",
    ],
    bug: 1,
    explain: "forEach ignores returned promises, so the log runs before any save finishes. Use for…of with await, or await Promise.all(users.map(save)).",
  },
  {
    lang: "JavaScript",
    title: "Last n items",
    lines: [
      "function lastItems(list, n) {",
      "  const out = [];",
      "  for (let i = list.length - n; i <= list.length; i++) {",
      "    out.push(list[i]);",
      "  }",
      "  return out;",
      "}",
    ],
    bug: 2,
    explain: "Off by one: i <= list.length reads one past the end and pushes undefined. It should be i < list.length.",
  },
  {
    lang: "Playwright",
    title: "Login test",
    lines: [
      'test("shows welcome", async ({ page }) => {',
      '  await page.goto("/login");',
      '  await page.fill("#user", "ada");',
      '  page.click("button[type=submit]");',
      '  await expect(page.getByText("Welcome")).toBeVisible();',
      "});",
    ],
    bug: 3,
    explain: "The click isn't awaited, so the test races ahead and becomes flaky. Every Playwright action returns a promise, so await it.",
  },
  {
    lang: "Cypress",
    title: "Dashboard smoke test",
    lines: ['it("loads the dashboard", () => {', '  cy.visit("/dashboard");', "  cy.wait(5000);", '  cy.get(".chart").should("be.visible");', "});"],
    bug: 2,
    explain: "A hard-coded wait is slow when the app is fast and flaky when it's slow. Cypress already retries .should(), so drop the sleep, or wait on a network alias.",
  },
  {
    lang: "JavaScript",
    title: "Permission check",
    lines: ["function canDelete(user, post) {", "  if (user.isAdmin = true) {", "    return true;", "  }", "  return user.id === post.ownerId;", "}"],
    bug: 1,
    explain: "= assigns instead of comparing, which makes everyone an admin. Use === (or just if (user.isAdmin)).",
  },
  {
    lang: "Python",
    title: "Tag helper",
    lines: ["def add_tag(tag, tags=[]):", "    tags.append(tag)", "    return tags"],
    bug: 0,
    explain: "A mutable default argument is created once and shared across calls, so tags leak between calls. Use tags=None and create the list inside.",
  },
  {
    lang: "Jest",
    title: "Cart total",
    lines: ['test("total is calculated", () => {', "  const cart = new Cart();", "  cart.add({ price: 10 }, 2);", "  cart.total();", "});"],
    bug: 3,
    explain: "No assertion, so the test can never fail. It should be expect(cart.total()).toBe(20).",
  },
  {
    lang: "Java",
    title: "Report status",
    lines: ["String status = response.getStatus();", 'if (status == "SUCCESS") {', "    report.pass();", "}"],
    bug: 1,
    explain: "== compares references, not text. Use \"SUCCESS\".equals(status).",
  },
  {
    lang: "Node.js",
    title: "Find user",
    lines: ["const query = \"SELECT * FROM users WHERE email = '\" + email + \"'\";", "const rows = await db.raw(query);", "return rows[0];"],
    bug: 0,
    explain: "String concatenation allows SQL injection. Use parameterised queries: db.raw(\"... WHERE email = ?\", [email]).",
  },
  {
    lang: "JavaScript",
    title: "Christmas countdown",
    lines: ["// Christmas 2026", "const xmas = new Date(2026, 12, 25);", "console.log(xmas.toDateString());"],
    bug: 1,
    explain: "JavaScript months are 0-indexed, so month 12 rolls over to January 2027. December is 11.",
  },
];

export const TYPER_SNIPPETS = [
  {
    id: "playwright",
    label: "Playwright test",
    text: `test("user can log in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
});`,
  },
  {
    id: "pytest",
    label: "pytest",
    text: `import pytest

@pytest.mark.parametrize("a, b, total", [(1, 2, 3), (2, 2, 4)])
def test_add(a, b, total):
    assert add(a, b) == total`,
  },
  {
    id: "sql",
    label: "SQL",
    text: `SELECT status, COUNT(*) AS runs
FROM test_runs
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY runs DESC;`,
  },
  {
    id: "git",
    label: "Git flow",
    text: `git checkout -b fix/flaky-login-test
git add tests/login.spec.ts
git commit -m "test: wait for navigation after sign in"
git push -u origin fix/flaky-login-test`,
  },
  {
    id: "java",
    label: "Java + REST Assured",
    text: `given()
    .header("Authorization", "Bearer " + token)
.when()
    .get("/api/users/42")
.then()
    .statusCode(200)
    .body("name", equalTo("Ada"));`,
  },
];
