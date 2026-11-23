import { useState } from "react";
import { X, Printer, Copy } from "lucide-react";
import { inputStyle, Field } from "../components/Shared.jsx";

// Lot 6 : courrier préparé à partir d'une obligation. Le texte est un modèle neutre et poli, déjà rempli (organisme,
// référence, montant, échéance) ; l'administratrice le relit et le modifie avant de l'imprimer ou de le copier.
const dateFr = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fcfa = (n) => `${Number(n).toLocaleString("fr-FR")} F CFA`;

const MODELES = {
  DELAI: {
    nom: "Demande de délai ou d'échelonnement de paiement",
    objet: (o) => `Demande de délai de paiement${o.reference ? ` – réf. ${o.reference}` : ""}`,
    corps: (o) => `Madame, Monsieur,\n\nNous faisons référence à « ${o.intitule} »${o.reference ? ` (référence ${o.reference})` : ""}${o.montant ? `, d'un montant de ${fcfa(o.montant)}` : ""}, dont l'échéance est fixée au ${dateFr(o.echeance)}.\n\nEn raison de contraintes de trésorerie, nous sollicitons respectueusement un délai supplémentaire, ou à défaut un règlement échelonné, afin de nous acquitter de cette somme dans de bonnes conditions.\n\nNous restons à votre disposition pour convenir d'un calendrier avec vos services et vous remercions par avance de votre compréhension.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
  },
  RENOUVELLEMENT: {
    nom: "Demande de renouvellement ou de délivrance d'une pièce",
    objet: (o) => `Demande de renouvellement – ${o.intitule}`,
    corps: (o) => `Madame, Monsieur,\n\nNous avons l'honneur de solliciter le renouvellement de la pièce suivante : « ${o.intitule} »${o.reference ? ` (référence ${o.reference})` : ""}, qui arrive à échéance le ${dateFr(o.echeance)}.\n\nNous vous prions de bien vouloir nous indiquer la liste des pièces à fournir, les frais éventuels et le délai de traitement, afin que nous puissions déposer notre dossier dans les meilleurs délais.\n\nNous vous remercions de l'attention que vous porterez à cette demande.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
  },
  QUITTANCE: {
    nom: "Confirmation de règlement et demande de quittance",
    objet: (o) => `Règlement effectué – demande de quittance${o.reference ? ` – réf. ${o.reference}` : ""}`,
    corps: (o) => `Madame, Monsieur,\n\nNous vous informons avoir procédé au règlement de « ${o.intitule} »${o.reference ? ` (référence ${o.reference})` : ""}${o.montant ? `, pour un montant de ${fcfa(o.montant)}` : ""}.\n\nNous vous serions reconnaissants de bien vouloir nous délivrer la quittance ou l'attestation correspondante, afin de compléter notre dossier.\n\nNous vous remercions par avance.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
  },
  CONVOCATION: {
    nom: "Réponse à une convocation (confirmation ou demande de report)",
    objet: (o) => `Réponse à votre convocation${o.reference ? ` – réf. ${o.reference}` : ""}`,
    corps: (o) => `Madame, Monsieur,\n\nNous accusons réception de votre convocation « ${o.intitule} »${o.reference ? ` (référence ${o.reference})` : ""}, fixée au ${dateFr(o.echeance)}.\n\n[Choisir et supprimer l'une des deux phrases :]\nNous vous confirmons que nous nous présenterons à la date et à l'heure indiquées.\nNous sollicitons respectueusement un report de ce rendez-vous, pour la raison suivante : …\n\nNous restons à votre disposition pour toute information complémentaire.\n\nVeuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
  },
};

// Modèle proposé d'office selon le type d'obligation.
const PAR_TYPE = { TAXE: "DELAI", AMENDE: "DELAI", CONVOCATION: "CONVOCATION", DOCUMENT: "RENOUVELLEMENT", BAIL: "DELAI", DROITS_AUTEUR: "DELAI", AUTRE: "DELAI" };

export default function CourrierObligation({ o, onFermer }) {
  const [modele, setModele] = useState(PAR_TYPE[o.categorie] || "DELAI");
  const [destinataire, setDestinataire] = useState(o.organisme || "");
  const [lieu, setLieu] = useState("Abidjan");
  const [objet, setObjet] = useState(MODELES[PAR_TYPE[o.categorie] || "DELAI"].objet(o));
  const [corps, setCorps] = useState(MODELES[PAR_TYPE[o.categorie] || "DELAI"].corps(o));
  const [signataire, setSignataire] = useState("La Direction\nLa Pointure Espagnole");
  const [copie, setCopie] = useState(false);
  const changer = (m) => { setModele(m); setObjet(MODELES[m].objet(o)); setCorps(MODELES[m].corps(o)); };
  const texte = () => `${lieu}, le ${dateFr(new Date())}\n\n${destinataire ? `À l'attention de : ${destinataire}\n\n` : ""}Objet : ${objet}\n\n${corps}\n\n${signataire}`;
  const copier = async () => { try { await navigator.clipboard.writeText(texte()); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { window.alert("Copie impossible : sélectionne le texte et copie-le à la main."); } };
  const imprimer = () => {
    const echap = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    const w = window.open("", "_blank");
    if (!w) { window.alert("Le navigateur a bloqué la fenêtre d'impression : autorise les fenêtres pour ce site."); return; }
    w.document.write(`<html><head><title>${echap(objet)}</title><style>body{font-family:Georgia,serif;font-size:14px;line-height:1.6;margin:60px 70px;color:#000}.d{text-align:right}.o{font-weight:bold;margin:24px 0}</style></head><body><p class="d">${echap(lieu)}, le ${echap(dateFr(new Date()))}</p>${destinataire ? `<p>À l'attention de : ${echap(destinataire)}</p>` : ""}<p class="o">Objet : ${echap(objet)}</p><p>${echap(corps)}</p><p style="margin-top:40px">${echap(signataire)}</p></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-2xl max-h-[92vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-display text-xl font-semibold">Courrier — {o.intitule}</h3><button type="button" onClick={onFermer}><X size={18} /></button></div>
        <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>Modèle prérempli : relis-le et adapte-le avant de l'envoyer. Rien n'est enregistré.</p>
        <Field label="Type de courrier"><select value={modele} onChange={(e) => changer(e.target.value)} style={inputStyle}>{Object.entries(MODELES).map(([k, m]) => <option key={k} value={k}>{m.nom}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Destinataire"><input value={destinataire} onChange={(e) => setDestinataire(e.target.value)} style={inputStyle} /></Field>
          <Field label="Lieu"><input value={lieu} onChange={(e) => setLieu(e.target.value)} style={inputStyle} /></Field>
        </div>
        <Field label="Objet"><input value={objet} onChange={(e) => setObjet(e.target.value)} style={inputStyle} /></Field>
        <Field label="Texte"><textarea rows={12} value={corps} onChange={(e) => setCorps(e.target.value)} style={inputStyle} /></Field>
        <Field label="Signature"><textarea rows={2} value={signataire} onChange={(e) => setSignataire(e.target.value)} style={inputStyle} /></Field>
        <div className="flex justify-end gap-2 mt-3">
          <button type="button" onClick={copier} className="px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5" style={{ border: "1px solid #DDD3C4" }}><Copy size={14} /> {copie ? "Copié" : "Copier"}</button>
          <button type="button" onClick={imprimer} className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1.5" style={{ background: "#2B2320", color: "#FBF3EC" }}><Printer size={14} /> Imprimer</button>
        </div>
      </div>
    </div>
  );
}
