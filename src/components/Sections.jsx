import React, { useState } from 'react';
import Sovereignty from './Sovereignty';

// Get your free key at https://web3forms.com — enter any email, click "Create Access Key"
const WEB3FORMS_KEY = 'dbb1b50d-03f9-40f3-b958-690287029745';

export default function Sections() {
  const [formStatus, setFormStatus] = useState('idle'); // idle | submitting | success | error

  async function handleContactSubmit(e) {
    e.preventDefault();
    setFormStatus('submitting');
    const data = new FormData(e.target);
    data.append('access_key', WEB3FORMS_KEY);
    data.append('subject', 'New Demo Request — Prism Intelligence');
    data.append('from_name', 'Prism Intelligence Website');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        setFormStatus('success');
        e.target.reset();
      } else {
        setFormStatus('error');
      }
    } catch {
      setFormStatus('error');
    }
    window.dispatchEvent(new CustomEvent('prism:ripple'));
  }

  return (
    <div className="scroll-root">
      {/* 0 — Overview hero */}
      <section className="section align-center">
        <div className="card center narrow">
          <div className="eyebrow" data-fade><span className="dot" />Prism Intelligence</div>
          <h1 className="display" data-reveal>Stop looking at data. Start understanding it.</h1>
          <p className="sub" data-fade>
            Prism Intelligence turns scattered operational data into clear decisions. Audits, checklists, and performance signals come together into one system that tells you what’s wrong, why it’s happening, and what to do next.
          </p>
          <div style={{ marginTop: 38 }} className="hint" data-fade>Scroll to see how it works</div>
        </div>
      </section>

      {/* 1 — Problem */}
      <section className="section tall align-center">
        <div className="card center narrow">
          <div className="eyebrow red" data-fade><span className="dot" />01 · Problem</div>
          <h2 className="display" data-reveal>You don’t have a data problem. You have a clarity problem.</h2>
          <p className="sub" data-fade>
            Dashboards are full. Reports keep coming. But decisions are still delayed, debated, or guessed. Prism Intelligence cuts through the noise. It shows what actually matters.
          </p>
        </div>
      </section>

      {/* 2 — Chaos */}
      <section className="section tall align-center">
        <div className="card center narrow">
          <div className="eyebrow red" data-fade><span className="dot" />02 · Chaos</div>
          <h2 className="display" data-reveal>Operations don’t fail loudly. They fail silently.</h2>
          <p className="sub" data-fade>
            Missed SOPs. Inconsistent execution. Small errors repeated daily. These don’t show up clearly—until they become real losses. Prism Intelligence surfaces issues early, before they scale.
          </p>
        </div>
      </section>

      {/* 3 — Breakpoint */}
      <section className="section align-center">
        <div className="card center narrow">
          <div className="eyebrow" data-fade><span className="dot" />03 · Breakpoint</div>
          <h2 className="display" data-reveal>This is where visibility becomes control.</h2>
          <p className="sub" data-fade>
            Prism Intelligence connects your audits, teams, and performance signals into one system. No silos. No fragmented tools. Just one source of truth.
          </p>
        </div>
      </section>

      {/* 4 — Structure */}
      <section className="section tall align-center">
        <div className="card center narrow">
          <div className="eyebrow cyan" data-fade><span className="dot" />04 · Structure</div>
          <h2 className="display" data-reveal>All your data. Finally usable.</h2>
          <p className="sub" data-fade>
            Prism Intelligence organizes your operations into a structured intelligence layer—audit scores, store performance, training gaps, and operational risks. Everything becomes visible, instantly.
          </p>
        </div>
      </section>

      {/* 5 — Insight Engine */}
      <section className="section tall align-center">
        <div className="card center wide">
          <div className="eyebrow" data-fade><span className="dot" />05 · Insight Engine</div>
          <h2 className="display" data-reveal>Not dashboards. Decisions.</h2>
          <p className="sub" data-fade>
            Prism Intelligence analyzes patterns across your operations and tells you what’s going wrong, where it’s happening, what will happen next, and what action to take. This is not reporting. This is operational intelligence.
          </p>
          <ul className="cog-list" data-stagger>
            <li><span className="tag anom">RISK</span><span className="val">Espresso calibration inconsistency across 6 stores</span><span className="pct">+92%</span></li>
            <li><span className="tag">PATTERN</span><span className="val">Milk steaming errors concentrated in evening shifts</span><span className="pct">+88%</span></li>
            <li><span className="tag anom">ALERT</span><span className="val">Cleaning SOP deviation in preparation zones</span><span className="pct">+95%</span></li>
            <li><span className="tag">PREDICTION</span><span className="val">Drop in customer satisfaction in peak-hour stores</span><span className="pct">+90%</span></li>
            <li><span className="tag">OPPORTUNITY</span><span className="val">Higher upsell rates linked to trained staff presence</span><span className="pct">+86%</span></li>
          </ul>
        </div>
      </section>

      {/* 6 — Decision */}
      <section className="section align-center">
        <div className="card center narrow">
          <div className="eyebrow" data-fade><span className="dot" />06 · Decision</div>
          <h2 className="display" data-reveal>Know what to do. Instantly.</h2>
          <p className="sub" data-fade>
            Every insight leads to action—Fix, Train, or Escalate. No overthinking. No delays.
          </p>
          <Sovereignty />
        </div>
      </section>

      {/* 7 — Automation */}
      <section className="section tall align-center">
        <div className="card center narrow">
          <div className="eyebrow" data-fade><span className="dot" />07 · Automation</div>
          <h2 className="display" data-reveal>The system improves with every action.</h2>
          <p className="sub" data-fade>
            Every audit. Every decision. Every outcome. Prism Intelligence learns continuously—making future insights faster and more accurate.
          </p>
        </div>
      </section>

      {/* 8 — About Us */}
      <section className="section about-section" id="about">
        <div className="about-inner">
          <div className="about-header" data-fade>
            <div className="eyebrow"><span className="dot" />08 · About Prism Intelligence</div>
            <h2 className="display" data-reveal>Data doesn’t fix problems. Decisions do.</h2>
          </div>
          <div className="about-body">
            <div className="about-col about-col-main">
              <p className="about-p" data-fade>
                It started with a simple, slightly embarrassing realization. The person behind Prism Intelligence wasn’t lacking data. Far from it. There were dashboards, reports, checklists, audit scores—enough data to make anyone feel important, and completely confused.
              </p>
              <p className="about-p" data-fade>
                Every week looked the same. Something went wrong. Someone made a report about it. Everyone discussed it. And then… nothing really changed. Same problems. Different meetings. Slightly better Excel formatting.
              </p>
              <p className="about-p" data-fade>
                At some point, it got obvious. The issue wasn’t a lack of data, a lack of effort, or even a lack of intelligence. The issue was this: no one could clearly answer, “What should we do next?”
              </p>
              <blockquote className="about-quote" data-fade>
                “Running operations without Prism is like trying to manage a busy café by reading yesterday’s receipts. Technically useful. Completely useless for what actually matters right now.”
                <cite>— Founding principle</cite>
              </blockquote>
              <p className="about-p" data-fade>
                So Prism Intelligence was built to fix exactly that. Not another dashboard. Not another reporting tool. A system that looks at everything happening in your operations and tells you what’s going wrong, where it’s happening, why it’s happening, and what to do about it. No overthinking. No guessing. No “let’s circle back next week.”
              </p>
              <p className="about-p" data-fade>
                Today, it’s still built the same way it started. Not for analysts. Not for presentations. Not for people who enjoy complicated dashboards. It’s built for people in the middle of real operations—where decisions need to be quick, clear, and correct. Because at the end of the day, data doesn’t fix problems. Decisions do. And Prism Intelligence exists to make sure you make the right ones.
              </p>
            </div>
            <div className="about-col about-col-meta" data-fade>
              <div className="about-stat">
                <span className="about-stat-n">2024</span>
                <span className="about-stat-l">Built for operational teams</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-n">90%+</span>
                <span className="about-stat-l">Issue detection accuracy</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-n">&lt;1 min</span>
                <span className="about-stat-l">Insight generation time</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-n">100%</span>
                <span className="about-stat-l">Adaptable to your operations</span>
              </div>
              <div className="about-stat">
                <span className="about-stat-n">India</span>
                <span className="about-stat-l">Built for scale</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9 — Capabilities */}
      <section className="section features-section" id="features">
        <div className="features-inner">
          <div className="features-header" data-fade>
            <div className="eyebrow cyan"><span className="dot" />09 · Capabilities</div>
            <h2 className="display" data-reveal>What Prism Intelligence actually does.</h2>
            <p className="features-sub" data-fade>
              Six core systems. One unified surface. Built for real operations.
            </p>
          </div>
          <div className="features-grid" data-stagger>
            <div className="feat-card">
              <div className="feat-icon">◈</div>
              <h3 className="feat-title">Data Aggregation Engine</h3>
              <p className="feat-desc">Brings together audits, checklists, and operational data into one system. No silos. No duplicate entry. Every signal in one place, correlated across stores, shifts, and teams.</p>
              <ul className="feat-tags">
                <li>Unified Intake</li><li>Cross-Store Correlation</li><li>Zero Duplication</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">⬡</div>
              <h3 className="feat-title">Insight Engine</h3>
              <p className="feat-desc">Detects patterns, risks, and performance gaps automatically. Surfaces what matters instead of burying it in charts. Ranked by confidence, weighted by business impact.</p>
              <ul className="feat-tags">
                <li>Pattern Detection</li><li>Impact Ranking</li><li>Confidence Scored</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">∿</div>
              <h3 className="feat-title">Anomaly Detection</h3>
              <p className="feat-desc">Identifies unusual behavior before it becomes a problem. Adaptive baselines per store, shift, and season—so a real deviation gets flagged while expected variance stays quiet.</p>
              <ul className="feat-tags">
                <li>Adaptive Baselines</li><li>Early Warning</li><li>Context-Aware</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">▣</div>
              <h3 className="feat-title">Action Layer</h3>
              <p className="feat-desc">Converts insights into clear next steps for teams. Fix, train, or escalate—each with the right owner, the right context, and a track record of what worked before.</p>
              <ul className="feat-tags">
                <li>Next-Step Routing</li><li>Owner Assignment</li><li>Outcome Tracking</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">◎</div>
              <h3 className="feat-title">Learning System</h3>
              <p className="feat-desc">Improves accuracy based on real outcomes over time. Every action taken, every issue resolved, feeds back into the model—so tomorrow’s insights are sharper than today’s.</p>
              <ul className="feat-tags">
                <li>Closed-Loop Feedback</li><li>Outcome Memory</li><li>Compounding Accuracy</li>
              </ul>
            </div>
            <div className="feat-card">
              <div className="feat-icon">✦</div>
              <h3 className="feat-title">Manager Interface</h3>
              <p className="feat-desc">Clean, simple interface built for fast decisions. No configuration. No dashboard-building. What needs attention, why, and what to do—shown in plain language.</p>
              <ul className="feat-tags">
                <li>Zero Config</li><li>Plain Language</li><li>Decision-First</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 10 — Contact */}
      <section className="section align-center" id="contacts">
        <div className="card center narrow contacts">
          <div className="eyebrow" data-fade><span className="dot" />10 · Contact</div>
          <h2 className="display" data-reveal>See it in action.</h2>
          <p className="sub" data-fade>
            Want to understand what’s really happening in your operations? We’ll show you.
          </p>

          <form className="contact-form" data-fade onSubmit={handleContactSubmit}>
            <label>
              <span>Name</span>
              <input type="text" name="name" autoComplete="name" required data-hoverable />
            </label>
            <label>
              <span>Email</span>
              <input type="email" name="email" autoComplete="email" required data-hoverable />
            </label>
            <label>
              <span>Company</span>
              <input type="text" name="company" autoComplete="organization" required data-hoverable />
            </label>
            <label>
              <span>Message</span>
              <textarea name="message" rows="3" required data-hoverable />
            </label>
            <button type="submit" className="sv-btn" data-clink disabled={formStatus === 'submitting'}>
              {formStatus === 'submitting' ? 'Sending…' : 'Request Demo →'}
            </button>
            {formStatus === 'success' && (
              <p className="form-feedback form-success">Got it — we'll be in touch within 24 hours.</p>
            )}
            {formStatus === 'error' && (
              <p className="form-feedback form-error">Something went wrong. Try emailing us directly.</p>
            )}
          </form>

          <div className="contact-meta" data-fade>
            <div><span>Email</span><a href="mailto:hello@prismintelligence.in" data-clink>hello@prismintelligence.in</a></div>
          </div>

          <div className="hint" data-fade style={{ marginTop: 28 }}>We’ll respond within 24 hours</div>
        </div>
      </section>
    </div>
  );
}
