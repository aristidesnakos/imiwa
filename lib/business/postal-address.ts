/**
 * The published postal address, formatted and checked.
 *
 * `config.business.postalAddress` is published in two places that must agree —
 * every newsletter footer and the privacy policy — and it is the stated
 * contact point for data-erasure requests. So it is formatted in exactly one
 * place, here, and checked in exactly one place, also here: the broadcast
 * script refuses to create a draft while `postalAddressProblems` reports
 * anything, and `pnpm validate:subscribe` asserts the same rules.
 *
 * The rules are the intersection of what the address has to satisfy:
 *
 *  - CAN-SPAM (16 CFR 316.2(p)) accepts a street address, a USPS-registered
 *    PO box, or a private mailbox registered with a commercial mail receiving
 *    agency. The last needs USPS Form 1583 accepted before it counts.
 *  - The address must also name a physical place a person can write to, so a
 *    PO box is refused even though CAN-SPAM alone would accept one.
 *
 * Whether mail sent there actually reaches us cannot be checked by code. It is
 * the operator's half of the contract: docs/runbooks/newsletter.md.
 *
 * Relative imports, not `@/`: this runs under tsx from `scripts/` too.
 */
import type { PostalAddress } from '../../types/config';

const REQUIRED_FIELDS = ['street', 'locality', 'region', 'postalCode', 'country'] as const;

// "PO Box 12", "P.O. Box", "Post Office Box", "POB 12". Deliberately does not
// match "PMB", the designation USPS requires on a mail-receiving-agency box.
const PO_BOX = /\b(?:p\.?\s*o\.?\s*box|post\s+office\s+box|pob)\b/i;

/** The street lines, then the city line, then the country. For a policy page. */
export function postalAddressLines(address: PostalAddress): string[] {
  return [
    [address.street, address.unit].filter(Boolean).join(', '),
    `${address.locality}, ${address.region} ${address.postalCode}`,
    address.country,
  ];
}

/** The whole address on one line. For an email footer. */
export function postalAddressLine(address: PostalAddress): string {
  return postalAddressLines(address).join(', ');
}

/** Every reason this cannot be published as our address. Empty means it can. */
export function postalAddressProblems(address: PostalAddress | null): string[] {
  if (!address) {
    return [
      'config.business.postalAddress is not set, and CAN-SPAM requires a valid physical postal address in every commercial email',
    ];
  }

  const problems: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!address[field]?.trim()) problems.push(`config.business.postalAddress.${field} is empty`);
  }
  for (const field of ['street', 'unit'] as const) {
    if (address[field] && PO_BOX.test(address[field])) {
      problems.push(
        `config.business.postalAddress.${field} looks like a PO Box ("${address[field]}"); the address must name a physical place`
      );
    }
  }
  return problems;
}
