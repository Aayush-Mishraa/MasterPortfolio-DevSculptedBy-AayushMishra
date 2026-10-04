import { MENTORING_BOOKING, MENTORING_PRICES } from "./pricing";

/*
  F28: /mentoring. The sessions, what each covers and how to book. Prices
  and booking links live in ./pricing.js (MENTORING_PRICES, MENTORING_BOOKING).
*/

export const SESSIONS = [
  {
    id: "career-call",
    title: "Career call",
    length: "30 minutes",
    icon: "fa-solid fa-route",
    for: "Manual testers moving into automation, or SDETs deciding what to learn next.",
    covers: ["Where you are and where you want to be", "What to learn next, in order", "How to show it on your résumé and GitHub"],
  },
  {
    id: "mock-interview",
    title: "SDET mock interview",
    length: "60 minutes",
    icon: "fa-solid fa-user-tie",
    featured: true,
    for: "Anyone with an SDET, automation or QA lead interview coming up.",
    covers: [
      "A realistic round: coding, framework design and testing scenarios",
      "Written feedback on each answer, the same day",
      "A study plan for the gaps it shows",
    ],
  },
  {
    id: "framework-review",
    title: "Framework & résumé review",
    length: "60 minutes + written notes",
    icon: "fa-solid fa-magnifying-glass-chart",
    for: "Engineers with a test framework or portfolio they want a senior review of.",
    covers: ["A read of your repo before the call", "Structure, flakiness, CI and naming feedback", "Résumé and LinkedIn notes for SDET roles"],
  },
];

export const MENTORING_FAQ = [
  { q: "Which time zone?", a: "India (IST). Calls are booked in your own time zone on the booking page." },
  { q: "How do I pay from outside India?", a: "Book through Cal.com and pay by card. In India, Razorpay (UPI, cards) and Topmate work too." },
  { q: "What do I need for a mock interview?", a: "A quiet room, a laptop with an editor you like, and the job description you're preparing for, if you have one." },
];

export const sessionPrice = (id) => MENTORING_PRICES[id] || null;

export function sessionLinks(id) {
  const links = MENTORING_BOOKING[id] || {};
  return [
    links.cal && { label: "Book on Cal.com", note: "card, any country", url: links.cal },
    links.razorpay && { label: "Pay with Razorpay", note: "UPI and Indian cards", url: links.razorpay },
    links.topmate && { label: "Book on Topmate", note: "", url: links.topmate },
  ].filter(Boolean);
}

export const formatInr = (price) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(price.amount);
