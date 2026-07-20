export const FAMILLES = ["Chaussure", "Sac"];
export const BOUTIQUES = ["Angré", "Koumassi"];

export const INFOS_BOUTIQUE = {
  "Angré": {
    nom: "LA POINTURE ESPAGNOLE",
    ligne2: "ANGRÉ",
    adresse: "Djibi Carrefour Tapis Rouge",
    telephone: "+225 07 48 87 82 89",
  },
  "Koumassi": {
    nom: "LA POINTURE ESPAGNOLE",
    ligne2: "KOUMASSI",
    adresse: "Grand Carrefour, après la paroisse St Etienne",
    telephone: "+225 07 18 41 41 41",
  },
};

export const MESSAGE_FIN_TICKET = "Aucun remboursement n'est effectué après achat. Les articles ne sont ni échangés, ni retournés au-delà de dix (10) jours. Passé ce délai, aucune réclamation ne sera acceptée.\n\nMerci pour votre visite";

export const POINTURES = ["36", "37", "38", "39", "40", "41", "42"];
export const MODES_VENTE = ["Boutique", "Livraison", "Expédition"];
export const MODES_PAIEMENT = [
  { id: "especes", label: "Espèces", liquide: true },
  { id: "moov_money", label: "Moov Money", liquide: false },
  { id: "mtn_money", label: "MTN Money", liquide: false },
  { id: "orange_money", label: "Orange Money", liquide: false },
  { id: "wave", label: "Wave", liquide: false },
  { id: "carte", label: "Carte bancaire", liquide: false },
  { id: "bon_achat", label: "Carte cadeau", liquide: false },
{ id: "avoir", label: "Avoir", liquide: false },
];
export const CIVILITES = ["Monsieur", "Madame", "Mademoiselle"];
export const JOURS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
export const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const COMMUNES = ["Abobo", "Adjamé", "Anyama", "Attécoubé", "Bingerville", "Cocody", "Koumassi", "Marcory", "Plateau", "Port-Bouët", "Songon", "Treichville", "Yopougon"];
export const CLIENT_POINTURES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
export const PAYS_LIST = ["Côte d'Ivoire", "France", "Mali", "Burkina Faso", "Sénégal", "Bénin", "Togo", "Ghana", "Nigeria", "Autre"];

export const QUARTIERS_PAR_COMMUNE = {
  "Abobo": ["Abobo Gare", "Anonkoua-Kouté", "Avocatier", "Baoulé", "Belleville", "Derrière-Rail", "Dokui", "Kennedy", "N'Dotré", "Sagbé", "Sogefiha"],
  "Adjamé": ["220 Logements", "Bracodi", "Liberté", "Marché Gouro", "Mirador", "Williamsville"],
  "Anyama": ["Akoupé-Zeudji", "Centre-ville", "Ebimpé", "Mafessé", "Nouveau Quartier"],
  "Attécoubé": ["Abattoir", "Agban", "Locodjro", "Santé", "Sébroko", "Toit Rouge"],
  "Bingerville": ["Adjinkro", "Centre-ville", "Feh-Kessé", "Résidentiel", "Santé 2"],
  "Cocody": ["II Plateaux", "Angré", "Ambassades", "Attoban", "Blockhauss", "Cité des Arts", "Danga", "Deux Plateaux Vallon", "M'Badon", "Mermoz", "Riviera"],
  "Koumassi": ["Campement", "Divo Quartier", "Grand Marché", "Prodomo", "Remblais", "Sicogi", "Zone Industrielle"],
  "Marcory": ["Aliodan", "Anoumabo", "Biétry", "Résidentiel", "Zone 4"],
  "Plateau": ["Cité Administrative", "Indénié", "Résidentiel", "Sorbonne", "Vallon"],
  "Port-Bouët": ["Adjouffou", "Aéroport", "Gonzagueville", "Jean Folly", "Vridi"],
  "Songon": ["Songon Agban", "Songon Kassemblé", "Songon Té"],
  "Treichville": ["Arras", "Avenue 16", "Belleville", "Biafra", "Zone 3"],
  "Yopougon": ["Andokoi", "Gesco", "Koweit", "Maroc", "Niangon", "Sicogi", "Sideci", "Toits Rouges", "Wassakara"],
};

export function fmt(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}