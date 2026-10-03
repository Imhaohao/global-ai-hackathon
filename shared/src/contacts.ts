import type { Contact } from "./contract.ts";

export const COOPERATIVE_OFFICER_ID = "cooperative-field-officer";

export const COOPERATIVE_OFFICER: Contact = {
  id: COOPERATIVE_OFFICER_ID,
  name: "Your cooperative field officer",
  role: "Extension officer",
  phone: "",
  verified: false,
  source: "The farmer enters this number once in the app",
};

const KEPHIS_SOURCE = "https://www.kephis.go.ke/kephis-hosts-stakeholders-meeting-enhance-seed-quality-and-seed-certification";
const KALRO_CONTACT_SOURCE = "https://www.kalro.org/contact-us";

export const KNOWN_CONTACTS: Contact[] = [
  {
    id: "kalro-headquarters",
    name: "KALRO headquarters",
    role: "Kenya Agricultural and Livestock Research Organisation, general line",
    phone: "+254722206986",
    verified: true,
    verifiedOn: "2026-10-03",
    source: KALRO_CONTACT_SOURCE,
  },
  {
    id: "kephis-seed-check",
    name: "KEPHIS seed check",
    role: "Scratch the sticker on a certified seed packet and send the code by SMS to this short code",
    phone: "1393",
    verified: true,
    verifiedOn: "2026-10-03",
    source: KEPHIS_SOURCE,
  },
  {
    id: "kalro-contact-centre",
    name: "KALRO contact centre",
    role: "Agro-advisory call centre",
    phone: "0111010100",
    verified: false,
    source: "Candidate number from a teammate's plan. Not found on kalro.org on 2026-10-03",
  },
  {
    id: "kalro-soil-lab",
    name: "KALRO soil lab, NARL Kabete",
    role: "Soil testing: Sh650 basic test, about 3 weeks, 500 g of topsoil. Email cd.narl@kalro.org",
    phone: "0711301517",
    verified: false,
    source: "Farmbiz Africa, checked 13 Oct 2025. Not found on kalro.org on 2026-10-03",
  },
];

export function verifiedContacts(contacts: Contact[] = KNOWN_CONTACTS): Contact[] {
  return contacts.filter((contact) => contact.verified);
}

export function contactsForFarmer(savedOfficerPhone?: string): Contact[] {
  const officerPhone = savedOfficerPhone?.trim() ?? "";
  return [...verifiedContacts(), { ...COOPERATIVE_OFFICER, phone: officerPhone }];
}
