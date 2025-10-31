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
    <section className="border-t border-stitch-border bg-stitch-surface">
      <div className="container mx-auto px-4 py-stitch-section">
        <h2 className="text-stitch-h2 font-bold text-center mb-12">
          Perché scegliere WorkOver?
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-stitch-card rounded-stitch-xl bg-stitch-bg border border-stitch-border shadow-stitch-card hover:shadow-stitch-glow transition-all"
            >
              <div className="text-4xl mb-4">{feat.icon}</div>
              <h3 className="text-stitch-h3 font-semibold mb-2">{feat.title}</h3>
              <p className="text-stitch-muted text-sm">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
