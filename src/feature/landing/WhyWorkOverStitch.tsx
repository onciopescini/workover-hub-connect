/**
 * WhyWorkOverStitch
 * 
 * Grid features card (3-4 col) da why_workover_section/code.html.
 * Design card: bordo sottile, radius XL, shadow soft, hover:glow.
 */
export default function WhyWorkOverStitch() {
  const features = [
    { icon: "🔒", title: "Sicurezza Garantita", desc: "Verifica in 3 step" },
    { icon: "⚡", title: "Prenotazione Istantanea", desc: "Conferma immediata" },
    { icon: "💳", title: "Pagamenti Protetti", desc: "Stripe Connect" },
    { icon: "🌍", title: "Rete Nazionale", desc: "100+ spazi in Italia" },
  ];

  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="container mx-auto px-4 py-[var(--space-section)]">
        <h2 className="text-[length:var(--font-size-h2)] font-bold text-center mb-12">
          Perché scegliere WorkOver?
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-[var(--space-card)] rounded-[var(--radius-xl)] bg-[var(--color-bg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-glow)] transition-all"
            >
              <div className="text-4xl mb-4">{feat.icon}</div>
              <h3 className="text-[length:var(--font-size-h3)] font-semibold mb-2">{feat.title}</h3>
              <p className="text-[var(--color-muted)] text-sm">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
