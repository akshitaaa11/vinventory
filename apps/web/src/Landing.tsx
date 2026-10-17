import type { CurrentUser } from "./api";
import { Icon, type IconName } from "./icons";
import { SignIn } from "./SignIn";

export function Landing({ user }: { user: CurrentUser | null }) {
  const cta = user ? <a className="button blue large" href="/labs">Go to labs<Icon name="arrow" /></a> : <SignIn large />;
  return <main id="main-content" className="landing">
    <section className="hero container" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow"><span className="tiny-square" /> THE CAMPUS LAB WORKSPACE</p>
        <h1 id="hero-title">Less searching. <br /><span>More making.</span></h1>
        <p className="hero-description">Good ideas start in the lab. VInventory brings lab equipment, inventory, and the people who use it into one shared workspace.</p>
        <div className="hero-actions">{cta}<a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↘</span></a></div>
        <p className="hero-note"><Icon name="shield" />Your college identity. Your lab’s permissions.</p>
      </div>
      <div className="lab-illustration" role="img" aria-label="Lab workflow: discover equipment, organize lab inventory, and keep track of handovers">
        <div className="illustration-heading"><span className="mono">VINVENTORY / THE BIG PICTURE</span><span className="diagram-dots">● ● ●</span></div>
        <div className="circuit-field"><svg viewBox="0 0 400 230" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.2"><path d="M0 55h90l40 40h60M400 40h-60l-35 35h-85M0 180h80l45-45h65M400 175h-90l-30-30h-65M160 0v50l30 30M260 0v35l-40 40M165 230v-45l25-25M260 230v-40l-40-40" /><rect x="164" y="76" width="72" height="72" rx="3" /><rect x="180" y="92" width="40" height="40" rx="1" />{[0,1,2,3,4].map(n=><g key={n}><path d={`M${176+n*12} 66v10M${176+n*12} 148v10M154 ${88+n*12}h10M236 ${88+n*12}h10`} /></g>)}<circle cx="90" cy="55" r="3" /><circle cx="340" cy="40" r="3" /><circle cx="80" cy="180" r="3" /><circle cx="310" cy="175" r="3" /></g></svg><span className="circuit-label mono">IDEAS NEED THE RIGHT TOOLS.</span></div>
        <div className="workflow-row">{([['search','Discover'],['box','Organize'],['check','Keep track']] as [IconName,string][]).map(([icon,label],i)=><div key={label}><span className="workflow-number mono">0{i+1}</span><Icon name={icon}/><span>{label}</span></div>)}</div>
        <div className="illustration-footer"><span className="status-dot" />One workspace. Each lab in control.<Icon name="arrow" /></div>
      </div>
    </section>
    <div className="principles"><div className="container">{([["labs","Built around your labs"],["users","For students & lab teams"],["shield","Powered by VOSS identity"]] as [IconName,string][]).map(([icon,text])=><span key={text}><Icon name={icon}/>{text}</span>)}</div></div>
    <section id="how-it-works" className="section container" aria-labelledby="workflow-title">
      <div className="section-intro"><p className="eyebrow">FROM SHELF TO WORKBENCH</p><h2 id="workflow-title">A clearer picture of your lab.</h2><p>A place for every lab, a record for every item, and a shared understanding of what happens next.</p></div>
      <div className="feature-grid">
        <article><span className="feature-number mono">01 / DISCOVER</span><Icon name="labs"/><h3>Start with the right lab.</h3><p>Explore participating labs in one directory. Find their location and open the workspace that matters to you.</p></article>
        <article><span className="feature-number mono">02 / ORGANIZE</span><Icon name="chip"/><h3>Give equipment a home.</h3><p>Lab teams bring their item records together, with clear ownership and staff-controlled inventory imports.</p></article>
        <article><span className="feature-number mono">03 / ACCOUNTABILITY</span><Icon name="book"/><h3>Built for the full journey.</h3><p>Inventory is the starting point. Borrowing, due dates, and confirmed returns are the next steps in the lending workflow.</p></article>
      </div>
    </section>
    <section id="who-its-for" className="audience-section"><div className="container audience-layout"><div><p className="eyebrow">DIFFERENT ROLES. SHARED PURPOSE.</p><h2>For the people <br />behind every project.</h2><p>From the first experiment to the final prototype, everyone needs a lab they can count on.</p></div><div className="role-list">
      <article><span className="role-icon"><Icon name="users"/></span><div><h3>Students & project teams</h3><p>Discover labs and find where your next project begins.</p></div><span className="mono">01</span></article>
      <article><span className="role-icon"><Icon name="chip"/></span><div><h3>Lab incharges & staff</h3><p>Organize equipment records and manage stock within your assigned labs.</p></div><span className="mono">02</span></article>
      <article><span className="role-icon"><Icon name="shield"/></span><div><h3>Administrators</h3><p>Bring labs and their teams into a consistent, accountable workspace.</p></div><span className="mono">03</span></article>
    </div></div></section>
    <section className="container final-cta"><div><p className="eyebrow">MAKE ROOM FOR WHAT’S NEXT</p><h2>Your next idea starts here.</h2><p>Sign in with your college account and explore VInventory.</p></div>{cta}</section>
  </main>;
}
