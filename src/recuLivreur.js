// Reçu de paiement d'un livreur, imprimé en double sur une feuille : un exemplaire pour la boutique, un pour le livreur.
// Chaque exemplaire porte les signatures de la caissière et du livreur, avec le montant versé.
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const f = (n) => Number(n || 0).toLocaleString("fr-FR");

export function imprimerRecuLivreur(d) {
  const w = window.open("", "_blank");
  if (!w) { window.alert("Le navigateur a bloqué la fenêtre : autorise les fenêtres pour ce site."); return; }
  const date = new Date(d.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
  const exemplaire = (titre) => `<div class="ex">
    <div class="titre"><span>La Pointure Espagnole${d.boutique ? ` — ${esc(d.boutique)}` : ""}</span><span class="ex-nom">${titre}</span></div>
    <h1>Reçu de paiement n° ${esc(d.numero)}</h1>
    <p>Date : <b>${esc(date)}</b></p>
    <p>Je soussigné(e) <b>${esc(d.livreurNom)}</b>, livreur, reconnais avoir reçu de la boutique la somme de</p>
    <p class="montant">${f(d.montant)} F CFA</p>
    <p>au titre de mes frais avancés et de ma rémunération pour la journée du <b>${new Date(`${d.jourRemise}T12:00:00`).toLocaleDateString("fr-FR")}</b>.</p>
    <p>Moyen de paiement : <b>${esc(d.mode || "Espèces")}</b>${d.reference ? ` — réf. ${esc(d.reference)}` : ""}</p>
    ${d.soldeRestant > 0 ? `<p class="petit">Reste dû après ce paiement : ${f(d.soldeRestant)} F.</p>` : `<p class="petit">Cette journée est entièrement réglée.</p>`}
    <div class="sign"><div>La caissière<br><b>${esc(d.payeParNom || "")}</b><div class="trait"></div></div><div>Le livreur<br><b>${esc(d.livreurNom)}</b><div class="trait"></div></div></div>
  </div>`;
  w.document.write(`<html><head><title>Reçu ${esc(d.numero)}</title><style>
    body{font-family:Arial,sans-serif;font-size:13px;margin:0;padding:18px 36px;color:#000}
    .ex{height:46vh;box-sizing:border-box;padding:6px 0}
    .titre{display:flex;justify-content:space-between;font-size:12px;border-bottom:1px solid #000;padding-bottom:4px}
    .ex-nom{font-weight:bold;text-transform:uppercase}
    h1{font-size:17px;margin:12px 0 8px}
    .montant{font-size:24px;font-weight:bold;text-align:center;border:2px solid #000;padding:8px;margin:10px 0}
    .petit{font-size:11px}
    .sign{display:flex;justify-content:space-around;margin-top:26px;text-align:center}
    .sign>div{width:40%}.trait{border-bottom:1px solid #000;height:46px}
    .coupe{border-top:2px dashed #666;margin:8px 0;text-align:center;font-size:10px;color:#666;padding-top:2px}
    @media print{@page{size:A4;margin:8mm}}
  </style></head><body>${exemplaire("Exemplaire boutique")}<div class="coupe">✂ découper ici</div>${exemplaire("Exemplaire livreur")}</body></html>`);
  w.document.close(); w.focus(); w.print();
}
