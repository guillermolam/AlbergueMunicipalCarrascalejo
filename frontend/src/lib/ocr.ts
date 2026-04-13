/**
 * OCR field types and MRZ/label parsers for Spanish DNI, NIE, and Passport.
 *
 * ⚠️ CLIENT-SIDE OCR HAS BEEN MOVED TO THE BACKEND.
 * No browser Tesseract worker or static OCR assets are shipped anymore.
 * All OCR is performed server-side by the native Rust OCR service (port 8788),
 * called via POST /api/pilgrim/process-document.
 *
 * This file retains:
 *   - Type definitions (ExtractedFields, CvInfo)
 *   - Pure parser functions (parseMrzTD1, parseDni, parsePassport)
 *     — these are not used at runtime (backend handles parsing) but are kept
 *       here for reference, testing, and fallback usage.
 */

export interface ExtractedFields {
  firstName: string; // given name / nombre
  lastName: string; // primer apellido / primary surname
  lastName2: string; // segundo apellido / secondary surname (DNI/NIE only)
  documentNumber: string; // DNI/NIE/passport number
  birthDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD — from MRZ when available
  nationality: string; // 3-letter ISO code, e.g. "ESP"
  gender: string; // "M" | "F" | "X" | ""
}

export type CvInfo = {
  doc_type: string;
  side: string;
  confidence: number;
  has_photo_region?: boolean;
  has_eu_flag?: boolean;
};

/**
 * Parse TD1 (3-line × 30 char) MRZ found on the back of Spanish DNI cards.
 * Line 1: type(2) + country(3) + doc_num(9) + check(1) + optional(15)
 * Line 2: dob(6) + check(1) + sex(1) + expiry(6) + check(1) + nat(3) + optional(11) + check(1)
 * Line 3: primary_id << secondary_id (last << first name)
 */
export function parseMrzTD1(text: string): Partial<ExtractedFields> | null {
  // Strip spaces inside potential MRZ lines, find lines ≥ 20 all-uppercase+< chars
  const mrzLines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, ''))
    .filter((l) => l.length >= 20 && /^[A-Z0-9<]{20,}$/.test(l));

  // Need at least 2 lines
  if (mrzLines.length < 2) return null;

  // Name line: contains << (primary/secondary separator), all CAPS + <
  const nameLine = mrzLines.find((l) => l.includes('<<') && /^[A-Z<]{15,}$/.test(l));
  // DOB line: starts with 6 digits + check digit + M/F/X/<
  const dobLine = mrzLines.find((l) => /^\d{6}\d[MFX<]/i.test(l));
  // Doc line: starts with I or C + 1 char + 3-letter country
  const docLine = mrzLines.find((l) => /^[IC][A-Z<][A-Z]{3}[A-Z0-9<]{5}/i.test(l));

  if (!nameLine && !dobLine) return null;

  let firstName = '',
    lastName = '',
    lastName2 = '',
    documentNumber = '',
    birthDate = '',
    expiryDate = '',
    nationality = 'ESP',
    gender = '';

  if (nameLine) {
    const sep = nameLine.indexOf('<<');
    // Primary id = surnames (single < between primer/segundo apellido)
    // Secondary id = given names
    const surnamesRaw = nameLine.slice(0, sep);
    const firstNameRaw = nameLine.slice(sep + 2);
    // Split primer/segundo apellido at single '<'
    const surnameParts = surnamesRaw.split('<').filter(Boolean);
    lastName = surnameParts[0] ?? '';
    lastName2 = surnameParts.slice(1).join(' ').trim();
    firstName = firstNameRaw.replace(/</g, ' ').trim();
  }

  if (dobLine) {
    const dobRaw = dobLine.slice(0, 6);
    const yy = parseInt(dobRaw.slice(0, 2));
    // Heuristic: year 30+ → 1900s (e.g. 50 → 1950), else 2000s
    birthDate = `${yy >= 30 ? 1900 + yy : 2000 + yy}-${dobRaw.slice(2, 4)}-${dobRaw.slice(4, 6)}`;
    // Position 7: sex character
    const sexChar = dobLine[7];
    gender = sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : sexChar === 'X' ? 'X' : '';
    // Positions 8-13: expiry date YYMMDD
    const expRaw = dobLine.slice(8, 14);
    if (/^\d{6}$/.test(expRaw)) {
      const ey = parseInt(expRaw.slice(0, 2));
      expiryDate = `${2000 + ey}-${expRaw.slice(2, 4)}-${expRaw.slice(4, 6)}`;
    }
    const nat = dobLine.slice(15, 18).replace(/</g, '');
    if (/^[A-Z]{3}$/.test(nat)) nationality = nat;
  }

  if (docLine) {
    // Spanish DNI TD1 layout (positions 0-indexed, each line = 30 chars):
    //  Line 1: type(2) country(3) support_num(9) check(1) optional(15)
    // The optional field (pos 15-29) holds the actual DNI/NIE number for Spanish IDs.
    // Try the optional field first; fall back to the standard doc-number field.
    const optionalRaw = docLine.slice(15, 30).replace(/O/g, '0').replace(/</g, '');
    const dniInOptional =
      optionalRaw.match(/^([XYZ]\d{7}[A-Z])/) || optionalRaw.match(/(\d{8}[A-Z])/);
    if (dniInOptional) {
      documentNumber = dniInOptional[1];
    } else {
      // Generic fallback: standard document number field (positions 5-13)
      documentNumber = docLine.slice(5, 14).replace(/O/g, '0').replace(/</g, '');
    }
  }

  return {
    firstName,
    lastName,
    lastName2,
    documentNumber,
    birthDate,
    expiryDate,
    nationality,
    gender,
  };
}

/** Label-based parser for DNI front, NIE front, and Permiso de Residencia. */
export function parseDniLabels(text: string): ExtractedFields {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const upper = text.toUpperCase();

  // ── Document number ──────────────────────────────────────────────────────────
  let documentNumber = '';
  // "NIE: Y63872519B" or "NIE Y63872519B" label
  const nieLabelM = text.match(/NIE[:\s]+([XYZ]\d{7}[A-Z])\b/i);
  if (nieLabelM) {
    documentNumber = nieLabelM[1];
  }
  // Bare NIE (X/Y/Z + 7 digits + letter)
  if (!documentNumber) {
    const nieM = text.match(/\b([XYZ]\d{7}[A-Z])\b/);
    if (nieM) documentNumber = nieM[1];
  }
  // DNI (8 digits + letter)
  if (!documentNumber) {
    const dniM = text.match(/\b(\d{8}[A-Z])\b/);
    if (dniM) documentNumber = dniM[1];
  }

  // ── Birth date ───────────────────────────────────────────────────────────────
  let birthDate = '';
  // Matches: "18 04 1995", "10/01/1950", "10-01-1950", "10.01.1950"
  const dm =
    text.match(/\b(\d{1,2})\s+(\d{2})\s+(\d{4})\b/) ||
    text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dm) birthDate = `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;

  // ── Nationality ──────────────────────────────────────────────────────────────
  const NAT_RE =
    /\b(ESP|FRA|DEU|ITA|POR|GBR|USA|MEX|ARG|COL|BRA|MAR|ROU|CHN|JPN|NLD|BEL|POL|SVK|CZE|HUN|SWE|NOR|DNK|FIN|AUT|CHE|IRL|LUX|GRC|HRV|BGR|SRB|ALB|TUR|UKR|RUS)\b/;
  const natM = upper.match(NAT_RE);
  let nationality = natM ? natM[1] : 'ESP';

  // ── Names ────────────────────────────────────────────────────────────────────
  let firstName = '',
    lastName = '',
    lastName2 = '',
    gender = '',
    expiryDate = '';

  // Helper: test if a line looks like a pure name (all alpha + spaces/hyphens, no labels)
  const LABEL_NOISE =
    /DNI|NIE|NOMBRE|APELLIDO|SEXO|NACIM|VALID|DOCUM|NUMERO|FECHA|NACION|ESPAÑA|SPAIN|MADRID|DOMICIL|LUGAR|HIJO|PERSONAL|PERMISO|RESIDENCIA|EQUIPO|AUTORIZA/i;
  const isNameLine = (l: string) =>
    /^[A-ZÁÉÍÓÚÜÑ\s\-]{2,}$/.test(l.trim()) && !LABEL_NOISE.test(l) && !/\d/.test(l);

  for (let i = 0; i < lines.length - 1; i++) {
    const lbl = lines[i].toUpperCase().trim();
    const next = lines[i + 1].replace(/[^A-ZÁÉÍÓÚÜÑ\s\-]/gi, '').trim();

    // "PRIMER APELLIDO" → next line is first surname
    if (/PRIMER\s+APELLIDO/.test(lbl) && !lastName) {
      lastName = next;
      continue;
    }
    // "SEGUNDO APELLIDO" → next line is second surname
    if (/SEGUNDO\s+APELLIDO/.test(lbl) && !lastName2) {
      lastName2 = next;
      continue;
    }
    // Generic "APELLIDOS" label (modern Spanish DNI format):
    //   APELLIDOS
    //   LAM          ← primer apellido
    //   MARTIN       ← segundo apellido (check lines[i+2])
    if (/^APELLIDOS?\s*$/.test(lbl) && !lastName) {
      lastName = next;
      // Peek at lines[i+2]: if it also looks like a pure name, it's segundo apellido
      if (!lastName2 && i + 2 < lines.length) {
        const next2 = lines[i + 2].replace(/[^A-ZÁÉÍÓÚÜÑ\s\-]/gi, '').trim();
        if (next2 && isNameLine(next2)) {
          lastName2 = next2;
        }
      }
      continue;
    }
    // "NOMBRE" alone → next line is first name
    if (/^NOMBRE\s*$/.test(lbl) && !firstName) {
      firstName = next;
      continue;
    }
    // "SEXO" or "SEXO NACIONALIDAD" on the same line →
    //   if next line starts with M/F/X (optionally followed by nationality code),
    //   extract both sex and nationality from that line.
    if (/^SEXO(\s+NACIONALIDAD)?$/.test(lbl) && !gender) {
      const nextRaw = lines[i + 1].trim().toUpperCase();
      // e.g. "M" or "M ESP" or "F    ESP"
      const sexNatM = nextRaw.match(/^([MFX])\s*([A-Z]{3})?/);
      if (sexNatM) {
        const sc = sexNatM[1];
        gender = sc === 'M' ? 'M' : sc === 'F' ? 'F' : sc === 'X' ? 'X' : '';
        // If nationality wasn't already set from a regex scan, use this
        if (sexNatM[2] && !nationality) nationality = sexNatM[2];
      } else {
        // Next line might be just "MASCULINO", "FEMENINO", etc.
        const sc2 = nextRaw.replace(/\s.*/, '');
        gender =
          sc2 === 'M' || sc2 === 'MASCULINO' || sc2 === 'MALE'
            ? 'M'
            : sc2 === 'F' || sc2 === 'FEMENINO' || sc2 === 'FEMALE' || sc2 === 'MUJER'
              ? 'F'
              : '';
      }
      continue;
    }
    // "SEXO" standalone
    if (/^SEXO$/.test(lbl) && !gender) {
      const sc = lines[i + 1].trim().toUpperCase().charAt(0);
      gender = sc === 'M' ? 'M' : sc === 'F' ? 'F' : sc === 'X' ? 'X' : '';
      continue;
    }
    // "VALIDEZ" / inline "NÚM SOPORT VALIDEZ" → extract date from next line
    if (/VALIDEZ|VENCIMIENTO|EXPIRY|EXPIRATION/.test(lbl) && !expiryDate) {
      // Date might be on the same label line ("VALIDEZ 03 09 2029") or next line
      const dateSrc = lbl + ' ' + (lines[i + 1] ?? '');
      const em =
        dateSrc.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/) ||
        dateSrc.match(/\b(\d{1,2})\s+(\d{2})\s+(\d{4})\b/);
      if (em) expiryDate = `${em[3]}-${em[2].padStart(2, '0')}-${em[1].padStart(2, '0')}`;
      continue;
    }
    // NIE / Permiso format: "APELLIDOS NOMBRES / SURNAMES FORENAMES" → combined name on next line
    if (/APELLIDOS\s+NOMBRES|SURNAMES\s+FORENAMES/.test(lbl)) {
      const parts = lines[i + 1].trim().split(/\s+/);
      if (parts.length >= 2) {
        const firstIdx = parts.findIndex(
          (p) => p === p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() && p !== p.toUpperCase()
        );
        if (firstIdx > 0) {
          lastName = parts.slice(0, firstIdx).join(' ');
          firstName = parts.slice(firstIdx).join(' ');
        } else {
          firstName = parts[parts.length - 1];
          lastName = parts.slice(0, -1).join(' ');
        }
      }
      continue;
    }
  }

  // ── Inline fallbacks ─────────────────────────────────────────────────────────
  // SEXO M (same line) — e.g. "SEXO M" or "SEXO: M"
  if (!gender) {
    const m = text.match(/SEXO[:\s]+([MFX])\b/i);
    if (m) gender = m[1].toUpperCase();
  }
  // VALIDEZ on same line as date e.g. "VALIDEZ 03 09 2029" or "VALIDEZ: 03/09/2029"
  if (!expiryDate) {
    const vm =
      text.match(/VALIDEZ[:\s]+(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{4})/i) ||
      text.match(/VALIDEZ[:\s]+(\d{1,2})\s+(\d{2})\s+(\d{4})/i);
    if (vm) expiryDate = `${vm[3]}-${vm[2].padStart(2, '0')}-${vm[1].padStart(2, '0')}`;
  }

  // ── Fallback: all-caps lines that look like names ────────────────────────
  const NOISE =
    /(DNI|NIE|ESP|ESPAÑA|SPAIN|FECHA|NACIM|VALID|DOCUM|NÚMERO|NOMBR|APELL|SEXO|NACION|REPÚBL|MADRID|DOMICIL|PROVINCIA|LUGAR|HIJO|PERSONAL|PERMISO|RESIDENCIA|ESTANCIA|TRABAJAR|AUTORIZA|OBSERV|PRORROGA|INVESTIGA)/i;
  if (!lastName || !firstName) {
    const nameLines = lines.filter(
      (l) => /^[A-ZÁÉÍÓÚÜÑ\s\-]{3,}$/.test(l) && !/\d/.test(l) && !NOISE.test(l)
    );
    if (!lastName && nameLines[0]) lastName = nameLines[0];
    if (!firstName && nameLines[1]) firstName = nameLines[1];
  }

  return {
    firstName,
    lastName,
    lastName2,
    documentNumber,
    birthDate,
    expiryDate,
    nationality,
    gender,
  };
}

/** Parse DNI / NIE / Permiso de Residencia text extracted by Tesseract. */
export function parseDni(text: string): ExtractedFields {
  // ── 1. Try TD1 MRZ first (DNI back has 3-line MRZ — most reliable) ────────
  const mrz = parseMrzTD1(text);
  if (mrz?.firstName || mrz?.lastName) {
    // Merge MRZ (most reliable for names/dates/sex) with label scan.
    // Document number: prefer the label-parsed value (actual DNI/NIE number,
    // e.g. "53497500Y") over the MRZ doc-field which for Spanish DNI holds
    // the "número de soporte" (BKK...) in positions 5-13. The MRZ optional
    // field (positions 15-23) may also contain the DNI number — parseMrzTD1
    // already tries that first. Use whichever is a valid DNI/NIE pattern.
    const labelResult = parseDniLabels(text);
    const isDniNie = (n: string) => /^([XYZ]\d{7}[A-Z]|\d{8}[A-Z])$/.test(n);
    const docNum = isDniNie(mrz.documentNumber ?? '')
      ? mrz.documentNumber!
      : isDniNie(labelResult.documentNumber)
        ? labelResult.documentNumber
        : mrz.documentNumber || labelResult.documentNumber;
    return {
      firstName: mrz.firstName || labelResult.firstName,
      lastName: mrz.lastName || labelResult.lastName,
      lastName2: mrz.lastName2 || labelResult.lastName2,
      documentNumber: docNum,
      birthDate: mrz.birthDate || labelResult.birthDate,
      expiryDate: mrz.expiryDate || labelResult.expiryDate,
      nationality: mrz.nationality || labelResult.nationality,
      gender: mrz.gender || labelResult.gender,
    };
  }

  // ── 2. Fall back to label / visual field parsing ────────────────────────
  return parseDniLabels(text);
}

/** Parse Passport (TD3, 2×44) MRZ extracted by Tesseract. */
export function parsePassport(text: string): ExtractedFields {
  let firstName = '',
    lastName = '',
    lastName2 = '',
    documentNumber = '',
    birthDate = '',
    expiryDate = '',
    nationality = 'ESP',
    gender = '';

  // TD3 MRZ line 1 — P<ESPprimerApellido<<segundoApellido<nombre<... (44 chars)
  const m1 = text.match(/P[<A-Z][A-Z]{3}([A-Z<]{39})/);
  if (m1) {
    const sep = m1[1].indexOf('<<');
    if (sep !== -1) {
      // Surnames before '<<', split at single '<' for primer/segundo apellido
      const surnamesRaw = m1[1].slice(0, sep);
      const surnameParts = surnamesRaw.split('<').filter(Boolean);
      lastName = surnameParts[0] ?? '';
      lastName2 = surnameParts.slice(1).join(' ').trim();
      firstName = m1[1]
        .slice(sep + 2)
        .replace(/</g, ' ')
        .trim();
    }
  }

  // TD3 MRZ line 2 — docNum(9)check nat(3) dob(6)check sex(1) expiry(6)check...
  const m2 = text.match(/([A-Z0-9<]{9})\d([A-Z]{3})(\d{6})\d([MFX<])(\d{6})/);
  if (m2) {
    documentNumber = m2[1].replace(/</g, '');
    const nat = m2[2];
    if (/^[A-Z]{3}$/.test(nat)) nationality = nat;
    const dob = m2[3];
    const yy = parseInt(dob.slice(0, 2));
    birthDate = `${yy >= 30 ? 1900 + yy : 2000 + yy}-${dob.slice(2, 4)}-${dob.slice(4, 6)}`;
    const sexChar = m2[4];
    gender = sexChar === 'M' ? 'M' : sexChar === 'F' ? 'F' : sexChar === 'X' ? 'X' : '';
    const exp = m2[5];
    const ey = parseInt(exp.slice(0, 2));
    expiryDate = `${2000 + ey}-${exp.slice(2, 4)}-${exp.slice(4, 6)}`;
  }

  // Fallback to label parsing if MRZ didn't yield names
  if (!firstName && !lastName) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length - 1; i++) {
      if (/APELLIDOS?/i.test(lines[i]) && !lastName)
        lastName = lines[i + 1].replace(/[^A-ZÁÉÍÓÚÜÑ\s\-]/gi, '').trim();
      if (/^NOMBRE\s*$/i.test(lines[i]) && !firstName)
        firstName = lines[i + 1].replace(/[^A-ZÁÉÍÓÚÜÑ\s\-]/gi, '').trim();
    }
  }

  return {
    firstName,
    lastName,
    lastName2,
    documentNumber,
    birthDate,
    expiryDate,
    nationality,
    gender,
  };
}
