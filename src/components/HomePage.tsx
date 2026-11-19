import { useEffect, useRef, useState } from "react";
import { site, services, serviceArea, financing, reviews, type ServiceKey } from "../config/site";
import { track } from "../lib/whop-track";
import { EstimateForm } from "./EstimateForm";
import { BookingSection } from "./BookingSection";

export function HomePage() {
  const [selected, setSelected] = useState<ServiceKey>("repair");
  const trackedServices = useRef(new Set<string>());

  useEffect(() => {
    document.title = `${site.companyName} | Roof Repair, Replacement & Inspection`;
  }, []);

  // service_viewed fires once per service card the visitor actually scrolls to.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = entry.target.getAttribute("data-service");
          if (entry.isIntersecting && key && !trackedServices.current.has(key)) {
            trackedServices.current.add(key);
            track("service_viewed", { event_id: `service:${key}` });
          }
        }
      },
      { threshold: 0.5 },
    );
    document.querySelectorAll("[data-service]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="container row between">
          <strong className="brand">{site.companyName}</strong>
          <nav className="nav">
            <a href="#services">Services</a>
            <a href="#book">Book</a>
            <a href="#reviews">Reviews</a>
            <a href="#contact" className="btn btn-small">Get estimate</a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <p className="eyebrow">{site.licenseLine}</p>
          <h1>{site.tagline}</h1>
          <p className="lead">Repairs, full replacements, and written inspections for homeowners in {serviceArea.cities[0]} and nearby.</p>
          <div className="row wrap">
            <a href="#contact" className="btn btn-primary">Request an estimate</a>
            <a href="#book" className="btn btn-ghost">See pricing</a>
          </div>
          <p className="rating">★ {reviews.averageRating} from {reviews.count} reviews</p>
        </div>
      </section>

      <section id="services" className="section">
        <div className="container">
          <h2>Services</h2>
          <div className="cards">
            {services.map((s) => (
              <article key={s.key} className="card" data-service={s.key}>
                <h3>{s.title}</h3>
                <p>{s.blurb}</p>
                <ul>{s.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                <p className="price-hint">{s.startingAt}</p>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    setSelected(s.key);
                    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Request {s.title.toLowerCase()}
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <BookingSection />

      <section className="section">
        <div className="container split">
          <div>
            <h2>{financing.headline}</h2>
            <p>{financing.body}</p>
            <p className="muted small">{financing.providers.join(" · ")}</p>
            <p className="muted small">{financing.disclaimer}</p>
          </div>
          <div>
            <h2>{serviceArea.headline}</h2>
            <p>{serviceArea.intro}</p>
            <ul className="chips">{serviceArea.cities.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        </div>
      </section>

      <section id="reviews" className="section alt">
        <div className="container">
          <h2>What homeowners say</h2>
          <div className="cards">
            {reviews.items.map((r) => (
              <figure key={r.name} className="card">
                <blockquote>“{r.text}”</blockquote>
                <figcaption className="muted">{r.name}, {r.city}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="section">
        <div className="container split">
          <div>
            <h2>Request an estimate</h2>
            <p>Tell us about the roof and we'll follow up with next steps. Or call <a href={`tel:${site.phone}`}>{site.phone}</a>.</p>
          </div>
          <div>
            <EstimateForm defaultService={selected} />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <p>© {new Date().getFullYear()} {site.companyName}. {site.licenseLine}</p>
        </div>
      </footer>
    </>
  );
}
