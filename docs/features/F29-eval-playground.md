# F29 · AI Eval Playground

**Stage 4 · Effort M · Status: done in code (not merged or deployed).**

## Acceptance criteria
- [x] `/free-tools/ai-eval-playground`: two scenarios (support bot: refunds; docs assistant: API rate limits), each with a question, retrieved context (with an instruction planted in it) and 4–5 chatbot answers (grounded, hallucination, prompt injection, toxic / PII leak / off topic), plus "write your own".
- [x] "Run the evals" prints the suite like a test runner (line by line; all at once with reduced motion): faithfulness (every sentence backed by context, numbers exact), relevance, toxicity, PII (emails, phones, Luhn-valid cards), prompt injection (planted instruction found, and whether the answer obeyed it), format. Verdict: "SIGNED OFF ✓" or "BLOCKED".
- [x] The page says plainly that these graders are deterministic heuristics running in the browser, and how a real eval pack differs. CTA to the AI Feature Eval Pack.

## Checked by hand
Each canned answer fails exactly the evals it should (script in the session scratchpad); grounded answers pass all six.

## Tests owed
Unit: each grader on the canned answers. Playwright: run each answer, custom answer, reduced motion.
