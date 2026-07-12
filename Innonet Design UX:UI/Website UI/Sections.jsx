// Sections.jsx — Stats, Projects, Events, Testimonials, FAQ, Final CTA, Footer

const StatsStrip = () => (
  <section className="stats">
    <div className="container stats-inner">
      <div className="stat">
        <span className="stat-num">487</span>
        <span className="stat-label">Active builders</span>
      </div>
      <div className="stat">
        <span className="stat-num">38</span>
        <span className="stat-label">Live projects</span>
      </div>
      <div className="stat">
        <span className="stat-num">12</span>
        <span className="stat-label">Cities connected</span>
      </div>
      <div className="stat">
        <span className="stat-num">2.4k</span>
        <span className="stat-label">Connections made</span>
      </div>
    </div>
  </section>
);

const ProjectThumb = ({ variant }) => {
  // simple abstract SVG thumbs — different for each project
  if (variant === 'a') return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id="pa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3232FF"/>
          <stop offset="100%" stopColor="#7C3AED"/>
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill="url(#pa)"/>
      <g opacity="0.5" stroke="#fff" strokeWidth="0.5" fill="none">
        {Array.from({length:12}).map((_,i)=> <circle key={i} cx="160" cy="100" r={i*16}/>)}
      </g>
      <circle cx="160" cy="100" r="14" fill="#fff"/>
    </svg>
  );
  if (variant === 'b') return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
      <rect width="320" height="200" fill="#0A0A0F"/>
      <g stroke="#3232FF" strokeWidth="1" fill="none">
        {Array.from({length:8}).map((_,i)=>(
          <path key={i} d={`M0 ${40+i*20} Q 160 ${20+i*15} 320 ${60+i*18}`} opacity={0.2 + i*0.08}/>
        ))}
      </g>
    </svg>
  );
  if (variant === 'c') return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
      <rect width="320" height="200" fill="#1A1A1F"/>
      <g fill="#3232FF">
        <rect x="40" y="40" width="60" height="60"/>
        <rect x="120" y="80" width="40" height="40" opacity="0.6"/>
        <rect x="180" y="40" width="80" height="120" opacity="0.4"/>
        <rect x="60" y="130" width="40" height="40" opacity="0.3"/>
      </g>
    </svg>
  );
  return (
    <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style={{width:'100%',height:'100%'}}>
      <defs>
        <radialGradient id="pd"><stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#3232FF"/></radialGradient>
      </defs>
      <rect width="320" height="200" fill="url(#pd)"/>
      <g fill="#fff" opacity="0.6">
        {Array.from({length:30}).map((_,i)=>{
          const x = (i*37)%320, y = (i*53)%200;
          return <circle key={i} cx={x} cy={y} r={(i%3)+1}/>;
        })}
      </g>
    </svg>
  );
};

const FeaturedProjects = () => (
  <section className="section">
    <div className="container">
      <div className="section-head row">
        <div>
          <span className="eyebrow">Showcase</span>
          <h2>Projects shipped this month</h2>
        </div>
        <a className="btn btn-ghost btn-md">Browse all projects →</a>
      </div>
      <div className="projects-grid">
        <article className="project-card is-feature">
          <div className="project-thumb"><ProjectThumb variant="a"/></div>
          <div className="project-tag-row">
            <span className="tag is-primary">Featured</span>
            <span className="tag">AI/ML</span>
            <span className="tag">Education</span>
          </div>
          <h3 className="project-title">AI Tutor v0.2 — graph-based recall</h3>
          <p className="project-desc">Every concept now links to its prerequisites and the projects that exercise it. Built by 4 students across 2 cities, shipped in 6 weeks.</p>
          <div className="project-meta">
            <div className="project-author">
              <span className="av">M</span>
              <span>Mei Chen + 3</span>
            </div>
            <div className="project-stats">
              <span>★ 142</span>
              <span>↗ 28</span>
            </div>
          </div>
        </article>

        <article className="project-card">
          <div className="project-thumb"><ProjectThumb variant="b"/></div>
          <div className="project-tag-row">
            <span className="tag">Hardware</span>
            <span className="tag">IoT</span>
          </div>
          <h3 className="project-title">Beyond the Bottle</h3>
          <p className="project-desc">Sensor-fitted reusables that auto-track refills.</p>
          <div className="project-meta">
            <div className="project-author">
              <span className="av" style={{background:'linear-gradient(135deg,#7C3AED,#3232FF)'}}>A</span>
              <span>Alex Rivera</span>
            </div>
            <div className="project-stats"><span>★ 86</span></div>
          </div>
        </article>

        <article className="project-card">
          <div className="project-thumb"><ProjectThumb variant="c"/></div>
          <div className="project-tag-row">
            <span className="tag">Data</span>
            <span className="tag">Graphs</span>
          </div>
          <h3 className="project-title">Citymap Civic Data</h3>
          <p className="project-desc">Open dashboard for neighborhood-scale data.</p>
          <div className="project-meta">
            <div className="project-author">
              <span className="av" style={{background:'linear-gradient(135deg,#06B6D4,#3232FF)'}}>R</span>
              <span>Rai Patel</span>
            </div>
            <div className="project-stats"><span>★ 64</span></div>
          </div>
        </article>

        <article className="project-card">
          <div className="project-thumb"><ProjectThumb variant="d"/></div>
          <div className="project-tag-row">
            <span className="tag">Design</span>
            <span className="tag">Tools</span>
          </div>
          <h3 className="project-title">Inkframe — sketch sync</h3>
          <p className="project-desc">Browser whiteboard with offline-first sync.</p>
          <div className="project-meta">
            <div className="project-author">
              <span className="av" style={{background:'linear-gradient(135deg,#7A7AFF,#7C3AED)'}}>N</span>
              <span>Noor Ahmed</span>
            </div>
            <div className="project-stats"><span>★ 51</span></div>
          </div>
        </article>

        <article className="project-card">
          <div className="project-thumb"><ProjectThumb variant="b"/></div>
          <div className="project-tag-row">
            <span className="tag">Bio</span>
            <span className="tag">Open</span>
          </div>
          <h3 className="project-title">Foldspace</h3>
          <p className="project-desc">Crowd-validated protein folds for students.</p>
          <div className="project-meta">
            <div className="project-author">
              <span className="av" style={{background:'linear-gradient(135deg,#06B6D4,#7A7AFF)'}}>K</span>
              <span>Kit Tanaka</span>
            </div>
            <div className="project-stats"><span>★ 39</span></div>
          </div>
        </article>
      </div>
    </div>
  </section>
);

const events = [
  { month: 'Mar', day: '14', title: 'Hack Shanghai 2026', when: '48 hours · Mar 14–16', where: 'WeWork Weihai · Shanghai', mode: 'In-person', count: 240, faces: ['M','A','R','N'] },
  { month: 'Mar', day: '22', title: 'Builder Office Hours', when: 'Sun · 4pm CST', where: 'Online · Discord', mode: 'Online', count: 84, faces: ['J','K','M'] },
  { month: 'Apr', day: '05', title: 'Hardware Demo Night', when: 'Sat · 6pm CST', where: 'XNode Lab · Pudong', mode: 'In-person', count: 62, faces: ['A','K'] },
  { month: 'Apr', day: '19', title: 'AI safety reading group', when: 'Sat · 10am CST', where: 'Online · Zoom', mode: 'Online', count: 48, faces: ['R','M','N'] },
];

const Events = () => (
  <section className="section">
    <div className="container">
      <div className="section-head row">
        <div>
          <span className="eyebrow">Coming up</span>
          <h2>Hackathons and events</h2>
        </div>
        <a className="btn btn-ghost btn-md">See full calendar →</a>
      </div>
      <div className="events-list">
        {events.map((e, i) => (
          <div className="event-row" key={i}>
            <div className="event-date">
              <span className="month">{e.month}</span>
              <span className="day">{e.day}</span>
            </div>
            <div className="event-info">
              <h3>{e.title}</h3>
              <div className="meta">
                <span>{e.when}</span>
                <span>·</span>
                <span>{e.where}</span>
                <span>·</span>
                <span style={{color:'var(--color-primary)'}}>{e.mode}</span>
              </div>
            </div>
            <div className="event-attendees">
              <div className="stack">
                {e.faces.map((f, j) => (
                  <span key={j} className="av" style={{background: ['linear-gradient(135deg,#7A7AFF,#3232FF)','linear-gradient(135deg,#7C3AED,#3232FF)','linear-gradient(135deg,#06B6D4,#3232FF)','linear-gradient(135deg,#3232FF,#7C3AED)'][j%4]}}>{f}</span>
                ))}
              </div>
              <span className="count">{e.count} going</span>
            </div>
            <a className="event-cta">RSVP →</a>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const testimonials = [
  { quote: "Found my co-founder here. We met at a Hack Shanghai event two weekends after I made my profile.", name: "Mei Chen", role: "Builder · Shanghai", initial: "M" },
  { quote: "I was the only person at my school working on hardware. Now I have 12 collaborators across three cities.", name: "Alex Rivera", role: "Founder · arc", initial: "A", grad: 'linear-gradient(135deg,#7C3AED,#3232FF)' },
  { quote: "The graph view actually shows me what to learn next based on what people I admire are building.", name: "Rai Patel", role: "Engineer · 17", initial: "R", grad: 'linear-gradient(135deg,#06B6D4,#3232FF)' },
];

const Testimonials = () => (
  <section className="section">
    <div className="container">
      <div className="section-head">
        <span className="eyebrow">Builders, in their words</span>
        <h2>The shortest path to your collaborators.</h2>
        <p>InnoNet is built for young builders who don't want to wait until college to find their people.</p>
      </div>
      <div className="testimonial-grid">
        {testimonials.map((t, i) => (
          <article className="testimonial-card" key={i}>
            <span className="quote-mark">"</span>
            <p className="testimonial-quote">{t.quote}</p>
            <div className="testimonial-author">
              <span className="av" style={t.grad ? {background: t.grad} : {}}>{t.initial}</span>
              <div className="meta">
                <span className="name">{t.name}</span>
                <span className="role">{t.role}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

const faqData = [
  { q: "Who is InnoNet for?", a: "Builders aged 14–22 working on real projects — students, self-taught hackers, dropouts, hobbyists. We optimize the network for people who ship." },
  { q: "How is this different from LinkedIn or Discord?", a: "We're a graph, not a feed. Every connection has structure: skill, project, event. Discovery is intent-driven, not algorithmic." },
  { q: "Is it free?", a: "Yes. Always free for individual builders. We may charge organizers running large events for premium tooling later." },
  { q: "Where is it available?", a: "Global, with the densest networks currently in Shanghai, Beijing, Singapore, Tokyo, and Bangalore. Build your local pod with a few friends and we'll highlight you." },
  { q: "I'm a parent / educator. Is it safe?", a: "Profiles are real-name and verified. Public events have a clear organizer and venue. We have a zero-spam policy and active moderators." },
  { q: "Can I host an event?", a: "Yes — anyone can host. You get RSVP tools, a project board, and a guest-list shared with the whole network." }
];

const FAQ = () => {
  const [open, setOpen] = React.useState(0);
  return (
    <section className="section">
      <div className="container">
        <div className="faq-grid">
          <div>
            <span className="eyebrow">Questions</span>
            <h2 style={{font:"700 36px/1.15 var(--font-display)",margin:"12px 0 16px",letterSpacing:"-0.02em"}}>Common questions before you sign up.</h2>
            <p style={{color:"var(--color-fg-secondary)",margin:0,fontSize:15,lineHeight:1.55}}>
              If you don't see your question, write to <a style={{color:"var(--color-primary)"}}>hello@innonet.club</a> — we read every email.
            </p>
          </div>
          <div className="faq-list">
            {faqData.map((f, i) => (
              <div key={i} className={`faq-item${open === i ? ' is-open' : ''}`}>
                <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTA = () => (
  <section className="final-cta">
    <div className="container final-cta-inner">
      <span className="eyebrow"><span className="pulse"></span>Joining waitlist · 487 ahead of you</span>
      <h2>Build with people<br/>who actually ship.</h2>
      <p>Get early access. We're letting in 50 new builders every Friday.</p>
      <form className="final-cta-form" onSubmit={e => e.preventDefault()}>
        <input type="email" placeholder="you@school.edu" required/>
        <button className="btn btn-primary btn-md" type="submit">Get early access</button>
      </form>
      <span className="t-caption" style={{color:"var(--color-fg-muted)",fontSize:12}}>No spam. We'll only email when your invite is ready.</span>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand">
          <img src="assets/logo.svg" alt="InnoNet"/>
          <p>From ideas to impact, faster. A network built for young builders who actually ship.</p>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <ul>
            <li><a>Discover</a></li>
            <li><a>Communities</a></li>
            <li><a>Events</a></li>
            <li><a>Network graph</a></li>
            <li><a>Pricing</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Company</h4>
          <ul>
            <li><a>About</a></li>
            <li><a>Blog</a></li>
            <li><a>Press</a></li>
            <li><a>Careers</a></li>
            <li><a>Contact</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Resources</h4>
          <ul>
            <li><a>Host an event</a></li>
            <li><a>Builder guide</a></li>
            <li><a>Brand kit</a></li>
            <li><a>Status</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 InnoNet · Shanghai · Built by builders</span>
        <div className="links">
          <a>Privacy</a>
          <a>Terms</a>
          <a>Code of conduct</a>
        </div>
      </div>
    </div>
  </footer>
);

window.StatsStrip = StatsStrip;
window.FeaturedProjects = FeaturedProjects;
window.Events = Events;
window.Testimonials = Testimonials;
window.FAQ = FAQ;
window.FinalCTA = FinalCTA;
window.Footer = Footer;
