import React, { useState } from "react";
import ToolPage, { ToolCta, ToolHero } from "./ToolPage";
import EmailCapture from "./EmailCapture";
import { CHECKLIST, CHECKLIST_COUNT, CHECKLIST_VERSION } from "../../data/checklist";
import { toolBySlug } from "../../data/tools";

/*
  F20: the Release Readiness Checklist. The page shows two checks from each
  section; the full 50-point PDF comes by email (magnet "checklist"), and the
  download link also appears here at once.
*/

const TOOL = toolBySlug("release-readiness-checklist");
const PREVIEW = 2;

export default function ReleaseChecklist({ theme }) {
  const [download, setDownload] = useState(null);

  return (
    <ToolPage theme={theme} className="ft-cl">
      <ToolHero
        tool={TOOL}
        title={`The ${CHECKLIST_COUNT}-point Release Readiness Checklist`}
        lead="The checks I run before signing off a release, in ten sections: scope, tests, CI gates, environments, devices, performance, security, accessibility, rollout and monitoring. One page per section, printable, free."
      >
        <div className="ft-hero__actions">
          <a href="#get" className="hm-btn hm-btn--primary">
            Get the PDF <i className="fa-solid fa-arrow-down" aria-hidden="true" />
          </a>
          <a href="#preview" className="hm-btn hm-btn--ghost">
            Preview the checks
          </a>
        </div>
      </ToolHero>

      <section className="hm-section" id="preview" aria-labelledby="ft-cl-preview">
        <div className="hm-shell">
          <h2 className="ft-h2" id="ft-cl-preview">
            What&apos;s inside
          </h2>
          <p className="ft-muted">
            {CHECKLIST.length} sections, {CHECKLIST_COUNT} checks ({CHECKLIST_VERSION}). Two from each section below.
          </p>
          <ul className="ft-cl__sections">
            {CHECKLIST.map((section, index) => (
              <li key={section.title} className="hm-card ft-cl__section">
                <h3>
                  {index + 1}. {section.title} <span>{section.items.length} checks</span>
                </h3>
                <ul>
                  {section.items.slice(0, PREVIEW).map((item) => (
                    <li key={item}>
                      <i className="fa-regular fa-square-check" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                  <li className="ft-cl__locked">+ {section.items.length - PREVIEW} more in the PDF</li>
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hm-section" id="get" aria-labelledby="ft-cl-get">
        <div className="hm-shell ft-two">
          <div className="ft-prose">
            <h2 className="ft-h2" id="ft-cl-get">
              Get the full checklist
            </h2>
            <p>
              Enter your email and the PDF link arrives in a minute. You&apos;ll also get the link right here. Print it,
              paste the checks into your release ticket, or turn the ones that matter into CI gates.
            </p>
            <p className="ft-muted">
              How to use it: anything you can&apos;t tick is either a risk you accept in writing, or a reason to wait. The
              point isn&apos;t 50 ticks; it&apos;s no surprises.
            </p>
          </div>
          <div className="hm-card ft-panel">
            <div className="ft-panel__body">
              <EmailCapture
                magnet="checklist"
                button="Email me the PDF"
                onDone={(result) => setDownload(result && result.download ? result.download : null)}
              />
              {download && (
                <p className="ft-cl__download">
                  <a href={download} className="hm-btn hm-btn--ghost">
                    <i className="fa-solid fa-file-arrow-down" aria-hidden="true" /> Download now
                  </a>
                  <span className="ft-muted">The link works for 7 days.</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <ToolCta
        eyebrow="Release coming up?"
        title="Get a second pair of eyes on it."
        text="A Release Review is a 60-minute call where we go through this checklist against your actual release and agree what has to happen before you ship."
        to="/services/release-review"
        label="Book a Release Review"
      />
    </ToolPage>
  );
}
