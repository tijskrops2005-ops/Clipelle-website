/**
 * Who runs Clipelle: the details Dutch law asks a commercial website to show (name, address,
 * Chamber of Commerce and VAT number). Source: Clipelle brand style guide v1.1, section 11
 * (October 2026). Shown in the footer, on the contact page and in the terms and privacy statement.
 * The phone number from the guide is left out on purpose: it is not required and is personal.
 * Change these values only here.
 */
export const company = {
  /** The person or entity that operates Clipelle (the brand owner in the style guide). */
  operator: "Tijs Krops",
  street: "Sluitgatweg 10",
  postcode: "8308 RE",
  city: "Nagele",
  country: { en: "the Netherlands", nl: "Nederland" },
  kvk: "97223344",
  vat: "NL005256557B94",
} as const;

/** One line for legal text: "Clipelle is operated by …, address. KvK …, VAT …". */
export function companyLine(locale: "en" | "nl") {
  const c = company;
  return locale === "nl"
    ? `Clipelle wordt geëxploiteerd door ${c.operator}, ${c.street}, ${c.postcode} ${c.city}, ${c.country.nl}. KvK ${c.kvk}, btw ${c.vat}.`
    : `Clipelle is operated by ${c.operator}, ${c.street}, ${c.postcode} ${c.city}, ${c.country.en}. Chamber of Commerce (KvK) ${c.kvk}, VAT ${c.vat}.`;
}
