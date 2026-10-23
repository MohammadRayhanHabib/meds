/**
 * QSI Medicine — single source of truth for public website copy.
 * Content taken from the client's "Proposed Website Structure" document.
 *
 * Items marked TODO(client) must be confirmed by QSI Medicine before launch
 * (see BRD Appendix / source doc section 19). Do NOT publish unverified
 * licence or Pharmacy Council registration numbers.
 */

export const contact = {
  name: "QSI Medicine",
  parent: "Quality Supply International (QSI)",
  addressLines: ["145 North Kafrul", "Kachukhet Bazar, Dhaka Cantonment", "Dhaka-1206, Bangladesh"],
  // TODO(client): confirm real numbers / email / Facebook before launch
  phone: "+880 1XXX-XXXXXX",
  whatsapp: "8801XXXXXXXXX",
  email: "info@qsimedicine.com",
  facebook: "https://facebook.com/",
  hours: [
    { days: "Saturday to Thursday", time: "9:00 AM – 11:00 PM" },
    { days: "Friday", time: "3:00 PM – 11:00 PM" },
  ], // TODO(client): confirm opening hours
  mapEmbed:
    "https://www.google.com/maps?q=Kachukhet+Bazar,+Dhaka+Cantonment,+Dhaka&output=embed",
  mapLink: "https://maps.google.com/?q=Kachukhet+Bazar+Dhaka+Cantonment",
};

export const philosophy = "Quality Supply with Minimum Profit.";
export const fullCommitment =
  "Quality Supply with Minimum Profit to Ensure Excellent Service for Human Being.";

/** Grouped navigation for the header (dropdowns). */
export const navGroups = [
  { label: "Home", to: "/" },
  {
    label: "About",
    items: [
      { to: "/about", label: "Our story & values" },
      { to: "/team", label: "Our team" },
    ],
  },
  {
    label: "Patients",
    items: [
      { to: "/services", label: "Our services" },
      { to: "/medicines", label: "Medicine categories" },
      { to: "/faq", label: "Questions & answers" },
    ],
  },
  { label: "Quality & storage", to: "/quality" },
  { label: "Contact", to: "/contact" },
] as const;

export const nav = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/quality", label: "Quality & storage" },
  { to: "/services", label: "Services" },
  { to: "/medicines", label: "Medicines" },
  { to: "/team", label: "Our team" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

/** Procurement → Customer service. A genuine sequence, so it is numbered. */
export const qualityChain = [
  {
    step: "Procurement",
    body: "We do not buy medicines from the open market. Every product comes through identifiable supply channels.",
  },
  {
    step: "Receiving",
    body: "Staff check product name, manufacturer, batch number, expiry date, packaging condition, quantity and supplier documents.",
  },
  {
    step: "Verification",
    body: "Anything with missing details, damaged packaging or questionable origin is not accepted into stock.",
  },
  {
    step: "Storage",
    body: "General storage is kept at or below 25°C. Products that need cold storage go straight into dedicated refrigerators.",
  },
  {
    step: "Inventory control",
    body: "Stock is organised so products approaching expiry are identified early and expired medicine is never supplied.",
  },
  {
    step: "Dispensing",
    body: "Prescription medicines are dispensed only against a valid prescription, as Bangladesh law requires.",
  },
  {
    step: "Customer service",
    body: "We explain directions for use within our professional scope and refer you to a registered physician when needed.",
  },
];

export const principles = [
  {
    title: "Genuine products",
    body: "Medicines obtained through appropriate and traceable supply channels.",
  },
  {
    title: "Responsible procurement",
    body: "No open-market purchasing, to reduce the risk of unidentified or improperly handled products.",
  },
  {
    title: "Proper storage",
    body: "General storage at or below 25°C, following each manufacturer's requirements.",
  },
  {
    title: "Refrigerated medicines",
    body: "Vaccines, injections and other cold-chain products kept in dedicated refrigerators.",
  },
  {
    title: "Excellent customer service",
    body: "Courtesy, responsibility and respect, within the scope of our professional role.",
  },
];

export const refrigeratedExamples = [
  "Injections",
  "Temperature-sensitive medicines",
  "Biological products",
  "Other products specified by the manufacturer",
];

export const services = [
  {
    title: "Medicine supply",
    body: "A range of genuine medicines and healthcare products from a professionally managed outlet.",
  },
  {
    title: "Prescription medicines",
    body: "Handled in line with applicable laws, regulations and professional requirements. Please bring your prescription.",
  },
  {
    title: "Over-the-counter medicines",
    body: "Common OTC products, supplied where permitted and appropriate.",
  },
  {
    title: "Healthcare products",
    body: "Selected healthcare and personal-care products, depending on availability.",
  },
  {
    title: "Customer assistance",
    body: "Help identifying products, basic medicine information and directions for use.",
  },
  {
    title: "Cold-chain handling",
    body: "Refrigerated storage for medicines that need controlled temperatures.",
  },
  {
    title: "Availability enquiries",
    body: "Call or message us to check whether a specific medicine is in stock before you travel.",
  },
];

export const categories = [
  "Prescription medicines",
  "OTC medicines",
  "Antibiotics and antimicrobials",
  "Injections",
  "Refrigerated and temperature-sensitive medicines",
  "Gastrointestinal medicines",
  "Cardiovascular medicines",
  "Diabetes care",
  "Respiratory medicines",
  "Pain management",
  "Dermatological products",
  "Vitamins and supplements",
  "Paediatric medicines",
  "Women's healthcare",
  "Elderly care",
  "First aid products",
  "Medical and healthcare products",
  "Personal care products",
];

/** Categories that need a prescription or cold storage get a marker. */
export const categoryFlags: Record<string, "rx" | "cold"> = {
  "Prescription medicines": "rx",
  "Antibiotics and antimicrobials": "rx",
  Injections: "cold",
  "Refrigerated and temperature-sensitive medicines": "cold",
};

export const values = [
  { title: "Quality", body: "We prioritise the quality and authenticity of medicines." },
  { title: "Integrity", body: "Transparent and responsible business practices." },
  { title: "Service", body: "Every customer deserves respectful, professional service." },
  { title: "Affordability", body: "Reasonable pricing and minimum profit." },
  { title: "Responsibility", body: "Supplying medicine carries real responsibility." },
  { title: "Trust", body: "Long-term relationships built on dependable service." },
];

export const promise = [
  "Genuine products",
  "Responsible service",
  "Proper storage",
  "Qualified personnel",
  "Reasonable pricing",
  "Respectful behaviour",
];

export const management = [
  {
    role: "Managing Director",
    name: "Wing Commander (Retd.) Md. Shahidul Islam",
    credentials: "BUP, BPP",
    body: "Leads QSI Medicine with an emphasis on disciplined management, integrity, service and organisational accountability.",
  },
  {
    role: "Operations Director",
    name: "Umme Salma ROSY",
    credentials: "",
    body: "Oversees day-to-day operations: coordination, customer service, personnel management and the shop's service standards.",
  },
];

export const structure = [
  "Quality Supply International (QSI)",
  "QSI Medicine",
  "Managing Director",
  "Operations Director",
  "Pharmacy and sales team",
  "Customers and community",
];

export const faqs = [
  {
    q: "Where is QSI Medicine located?",
    a: "145 North Kafrul, Kachukhet Bazar, Dhaka Cantonment, Dhaka-1206, Bangladesh.",
  },
  {
    q: "Is QSI Medicine part of Quality Supply International?",
    a: "Yes. QSI Medicine operates as part of Quality Supply International (QSI).",
  },
  {
    q: "Who is the Managing Director?",
    a: "Wing Commander (Retired) Md. Shahidul Islam, BUP, BPP.",
  },
  { q: "Who manages operations?", a: "Umme Salma ROSY serves as Operations Director." },
  {
    q: "Do you buy medicines from the open market?",
    a: "No. Our procurement policy is not to purchase medicines from the open market.",
  },
  {
    q: "How are medicines stored?",
    a: "According to each product's storage requirements. General storage is kept at around 25°C or below.",
  },
  {
    q: "Do you have refrigerators for medicines?",
    a: "Yes. Dedicated refrigerators are kept for medicines and injections that need cold storage.",
  },
  {
    q: "Do you have qualified pharmacy personnel?",
    a: "Yes. Our pharmacy and sales team includes personnel with the relevant professional credentials.",
  },
  {
    q: "Can I buy prescription medicine without a prescription?",
    a: "No. Except for OTC medicines, Bangladesh DGDA guidance requires a prescription from a registered physician, and we follow it.",
  },
  {
    q: "Can I check whether a medicine is available?",
    a: "Yes. Call or WhatsApp us with the medicine name and we will tell you if it is in stock.",
  },
];

export const disclaimer = [
  "Information on this website is for general purposes only and is not a substitute for professional medical diagnosis, treatment or advice.",
  "Consult a qualified, registered physician for diagnosis and treatment. Use prescription medicines only as directed by a qualified healthcare professional.",
  "QSI Medicine does not encourage self-medication. In a medical emergency, seek emergency medical help immediately.",
];
