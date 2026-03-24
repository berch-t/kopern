// Custom Tool Creation Tutorials — EN/FR
// Displayed on the Tools page via a "Tutorial" button

export const customToolTutorials = {
  en: `# Creating Custom Tools

Custom tools extend your agent's capabilities with deterministic logic. Your agent calls the tool with structured arguments, the code runs in a secure sandbox, and the result is returned to the agent.

## How It Works

\`\`\`
User message → Agent reasons → Agent calls your tool → Sandbox executes code → Result → Agent continues
\`\`\`

### Sandbox Environment

Your code runs in an **isolated sandbox** with these available globals:

| Available | Not Available |
|-----------|---------------|
| \`args\` (tool arguments) | \`fetch\` (no network) |
| \`JSON\`, \`Math\`, \`Date\` | \`require\` / \`import\` |
| \`Array\`, \`Object\`, \`String\` | \`fs\` (no filesystem) |
| \`RegExp\`, \`Map\`, \`Set\` | \`process\`, \`Buffer\` |
| \`parseInt\`, \`parseFloat\` | External libraries |
| \`encodeURIComponent\` | DOM / \`window\` |

**Timeout:** 5 seconds max execution time.

### Tool Structure

Each tool has 3 parts:

1. **Name** — unique identifier (e.g. \`calculate_price\`)
2. **Parameters Schema** — JSON Schema defining the input
3. **Execute Code** — JavaScript that processes \`args\` and returns a result

> **Important:** Your code must return a value. If it returns \`undefined\`, the agent receives \`"null"\`.

---

## Use Case 1: Price Calculator

A tool that calculates prices with tax, discounts, and currency formatting.

**Name:** \`calculate_price\`

**Description:** Calculate total price with tax and optional discount

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "unitPrice": { "type": "number", "description": "Price per unit" },
    "quantity": { "type": "number", "description": "Number of units" },
    "taxRate": { "type": "number", "description": "Tax rate in % (e.g. 20 for 20%)" },
    "discountPercent": { "type": "number", "description": "Discount in % (optional)" },
    "currency": { "type": "string", "description": "Currency symbol (default: €)" }
  },
  "required": ["unitPrice", "quantity", "taxRate"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { unitPrice, quantity, taxRate, discountPercent = 0, currency = "€" } = args;
const subtotal = unitPrice * quantity;
const discount = subtotal * (discountPercent / 100);
const afterDiscount = subtotal - discount;
const tax = afterDiscount * (taxRate / 100);
const total = afterDiscount + tax;

return [
  \`Subtotal: \${subtotal.toFixed(2)} \${currency}\`,
  discountPercent > 0 ? \`Discount (\${discountPercent}%): -\${discount.toFixed(2)} \${currency}\` : null,
  \`Tax (\${taxRate}%): +\${tax.toFixed(2)} \${currency}\`,
  \`**Total: \${total.toFixed(2)} \${currency}**\`
].filter(Boolean).join("\\n");
\`\`\`

---

## Use Case 2: JSON Formatter & Validator

A tool that validates, formats, and analyzes JSON data.

**Name:** \`format_json\`

**Description:** Validate, format, and analyze JSON data

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "input": { "type": "string", "description": "Raw JSON string to validate and format" },
    "indent": { "type": "number", "description": "Indentation spaces (default: 2)" }
  },
  "required": ["input"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { input, indent = 2 } = args;
try {
  const parsed = JSON.parse(input);
  const formatted = JSON.stringify(parsed, null, indent);
  const keys = Object.keys(parsed);
  const type = Array.isArray(parsed) ? \`Array (\${parsed.length} items)\` : \`Object (\${keys.length} keys)\`;

  return \`Valid JSON — \${type}\\n\\nKeys: \${keys.join(", ")}\\n\\n\\\`\\\`\\\`json\\n\${formatted}\\n\\\`\\\`\\\`\`;
} catch (e) {
  return \`Invalid JSON: \${e.message}\`;
}
\`\`\`

---

## Use Case 3: Date Calculator

A tool that calculates durations, adds/subtracts days, and compares dates.

**Name:** \`date_calculator\`

**Description:** Calculate date differences, add/subtract days, get day of week

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "operation": { "type": "string", "enum": ["diff", "add", "info"], "description": "Operation: diff (between 2 dates), add (days to date), info (about a date)" },
    "date": { "type": "string", "description": "Date in YYYY-MM-DD format" },
    "date2": { "type": "string", "description": "Second date for diff operation (YYYY-MM-DD)" },
    "days": { "type": "number", "description": "Number of days to add (negative to subtract)" }
  },
  "required": ["operation", "date"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { operation, date, date2, days = 0 } = args;
const d = new Date(date + "T00:00:00Z");
if (isNaN(d.getTime())) return "Invalid date format. Use YYYY-MM-DD.";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

if (operation === "info") {
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const weekNum = Math.ceil(dayOfYear / 7);
  const isLeap = (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0;
  return [
    \`Date: \${date}\`,
    \`Day: \${weekdays[d.getUTCDay()]}\`,
    \`Month: \${months[d.getUTCMonth()]}\`,
    \`Day of year: \${dayOfYear}\`,
    \`Week: \${weekNum}\`,
    \`Leap year: \${isLeap ? "Yes" : "No"}\`,
  ].join("\\n");
}

if (operation === "add") {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + days);
  return \`\${date} + \${days} days = \${result.toISOString().slice(0, 10)} (\${weekdays[result.getUTCDay()]})\`;
}

if (operation === "diff" && date2) {
  const d2 = new Date(date2 + "T00:00:00Z");
  if (isNaN(d2.getTime())) return "Invalid second date format.";
  const diffMs = Math.abs(d2 - d);
  const diffDays = Math.round(diffMs / 86400000);
  const weeks = Math.floor(diffDays / 7);
  const remaining = diffDays % 7;
  return \`Between \${date} and \${date2}:\\n\${diffDays} days (\${weeks} weeks, \${remaining} days)\`;
}

return "Invalid operation. Use: diff, add, or info.";
\`\`\`

---

## Use Case 4: Text Analyzer

A tool that counts words, characters, sentences, and estimates reading time.

**Name:** \`analyze_text\`

**Description:** Analyze text: word count, reading time, character frequency, keyword density

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "text": { "type": "string", "description": "Text to analyze" },
    "topKeywords": { "type": "number", "description": "Number of top keywords to show (default: 5)" }
  },
  "required": ["text"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { text, topKeywords = 5 } = args;
const words = text.split(/\\s+/).filter(w => w.length > 0);
const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
const paragraphs = text.split(/\\n\\s*\\n/).filter(p => p.trim().length > 0);
const readingTimeMin = Math.ceil(words.length / 200);

const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "is", "it", "le", "la", "les", "de", "du", "des", "et", "en", "un", "une"]);
const freq = {};
words.forEach(w => {
  const lower = w.toLowerCase().replace(/[^a-zA-Zàâäéèêëïîôùûüç]/g, "");
  if (lower.length > 2 && !stopWords.has(lower)) {
    freq[lower] = (freq[lower] || 0) + 1;
  }
});
const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topKeywords);

return [
  \`Characters: \${text.length}\`,
  \`Words: \${words.length}\`,
  \`Sentences: \${sentences.length}\`,
  \`Paragraphs: \${paragraphs.length}\`,
  \`Avg words/sentence: \${sentences.length ? (words.length / sentences.length).toFixed(1) : "N/A"}\`,
  \`Reading time: ~\${readingTimeMin} min\`,
  \`\\nTop keywords:\`,
  ...top.map(([word, count], i) => \`  \${i + 1}. \${word} (\${count}x)\`),
].join("\\n");
\`\`\`

---

## Use Case 5: Markdown Table Generator

A tool that creates formatted Markdown tables from structured data.

**Name:** \`generate_table\`

**Description:** Generate a formatted Markdown table from headers and rows

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "headers": { "type": "array", "items": { "type": "string" }, "description": "Column headers" },
    "rows": { "type": "array", "items": { "type": "array", "items": { "type": "string" } }, "description": "Table rows (array of arrays)" },
    "align": { "type": "string", "enum": ["left", "center", "right"], "description": "Column alignment (default: left)" }
  },
  "required": ["headers", "rows"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { headers, rows, align = "left" } = args;
const colWidths = headers.map((h, i) =>
  Math.max(h.length, ...rows.map(r => (r[i] || "").length))
);

const pad = (str, width) => {
  const s = String(str || "");
  if (align === "right") return s.padStart(width);
  if (align === "center") {
    const left = Math.floor((width - s.length) / 2);
    return " ".repeat(left) + s + " ".repeat(width - s.length - left);
  }
  return s.padEnd(width);
};

const sep = align === "right" ? "---:" : align === "center" ? ":---:" : "---";
const headerRow = "| " + headers.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
const divider = "| " + colWidths.map(() => sep).join(" | ") + " |";
const dataRows = rows.map(r =>
  "| " + headers.map((_, i) => pad(r[i] || "", colWidths[i])).join(" | ") + " |"
);

return [headerRow, divider, ...dataRows].join("\\n");
\`\`\`

---

## Use Case 6: Data Validator

A tool that validates emails, URLs, phone numbers, and other common formats.

**Name:** \`validate_data\`

**Description:** Validate data formats: email, URL, phone, date, credit card, IBAN

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "value": { "type": "string", "description": "Value to validate" },
    "type": { "type": "string", "enum": ["email", "url", "phone", "date", "credit_card", "iban"], "description": "Type of validation" }
  },
  "required": ["value", "type"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { value, type } = args;
const v = value.trim();
const checks = {
  email: () => {
    const valid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);
    const [local, domain] = v.split("@");
    return { valid, details: valid ? \`Local: \${local}, Domain: \${domain}\` : "Invalid format: must be name@domain.tld" };
  },
  url: () => {
    const valid = /^https?:\\/\\/[^\\s]+\\.[^\\s]+/.test(v);
    let details = "Invalid URL format";
    if (valid) {
      const hasHttps = v.startsWith("https://");
      details = \`Protocol: \${hasHttps ? "HTTPS (secure)" : "HTTP (not secure)"}\`;
    }
    return { valid, details };
  },
  phone: () => {
    const digits = v.replace(/[^0-9]/g, "");
    const valid = digits.length >= 8 && digits.length <= 15;
    return { valid, details: valid ? \`\${digits.length} digits, normalized: +\${digits}\` : "Must be 8-15 digits" };
  },
  date: () => {
    const d = new Date(v);
    const valid = !isNaN(d.getTime());
    return { valid, details: valid ? \`Parsed as: \${d.toISOString().slice(0, 10)}\` : "Cannot parse date" };
  },
  credit_card: () => {
    const digits = v.replace(/[^0-9]/g, "");
    let sum = 0;
    for (let i = digits.length - 1, alt = false; i >= 0; i--, alt = !alt) {
      let n = parseInt(digits[i]);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    const valid = sum % 10 === 0 && digits.length >= 13 && digits.length <= 19;
    return { valid, details: valid ? \`Luhn check passed, \${digits.length} digits\` : "Luhn check failed" };
  },
  iban: () => {
    const cleaned = v.replace(/\\s/g, "").toUpperCase();
    const valid = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleaned);
    return { valid, details: valid ? \`Country: \${cleaned.slice(0, 2)}, Length: \${cleaned.length}\` : "Invalid IBAN format" };
  },
};

if (!checks[type]) return \`Unknown type: \${type}\`;
const result = checks[type]();
return \`\${result.valid ? "VALID" : "INVALID"} \${type}\\nValue: \${v}\\n\${result.details}\`;
\`\`\`

---

## Use Case 7: Template Engine

A tool that fills templates with variable values — great for generating emails, messages, or documents.

**Name:** \`fill_template\`

**Description:** Fill a text template with variable values using {{variable}} syntax

**Parameters Schema:**
\`\`\`json
{
  "type": "object",
  "properties": {
    "template": { "type": "string", "description": "Template text with {{variable}} placeholders" },
    "variables": { "type": "object", "description": "Key-value pairs to fill in" }
  },
  "required": ["template", "variables"]
}
\`\`\`

**Execute Code:**
\`\`\`javascript
const { template, variables } = args;
let result = template;
const used = new Set();
const missing = [];

result = result.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (match, key) => {
  if (variables[key] !== undefined) {
    used.add(key);
    return String(variables[key]);
  }
  missing.push(key);
  return match;
});

const unused = Object.keys(variables).filter(k => !used.has(k));
let report = result;
if (missing.length > 0 || unused.length > 0) {
  report += "\\n\\n---\\n";
  if (missing.length) report += \`Missing variables: \${missing.join(", ")}\\n\`;
  if (unused.length) report += \`Unused variables: \${unused.join(", ")}\\n\`;
}
return report;
\`\`\`

---

## Tips

- **Always return a value** — if your code returns \`undefined\`, the agent gets \`"null"\`
- **Use \`args\`** — all tool parameters are available on the \`args\` object
- **Keep it fast** — the sandbox has a 5-second timeout
- **No network** — use GitHub tools (\`read_file\`, \`search_files\`) for file access, not custom tools
- **Test in Playground** — ask your agent to use the tool and verify the output
`,

  fr: `# Cr\u00e9er des Custom Tools

Les custom tools \u00e9tendent les capacit\u00e9s de votre agent avec de la logique d\u00e9terministe. Votre agent appelle le tool avec des arguments structur\u00e9s, le code s'ex\u00e9cute dans un sandbox s\u00e9curis\u00e9, et le r\u00e9sultat est retourn\u00e9 \u00e0 l'agent.

## Fonctionnement

\`\`\`
Message user \u2192 Agent r\u00e9fl\u00e9chit \u2192 Agent appelle votre tool \u2192 Sandbox ex\u00e9cute le code \u2192 R\u00e9sultat \u2192 Agent continue
\`\`\`

### Environnement Sandbox

Votre code s'ex\u00e9cute dans un **sandbox isol\u00e9** avec ces globaux disponibles :

| Disponible | Non disponible |
|------------|----------------|
| \`args\` (arguments du tool) | \`fetch\` (pas de r\u00e9seau) |
| \`JSON\`, \`Math\`, \`Date\` | \`require\` / \`import\` |
| \`Array\`, \`Object\`, \`String\` | \`fs\` (pas de fichiers) |
| \`RegExp\`, \`Map\`, \`Set\` | \`process\`, \`Buffer\` |
| \`parseInt\`, \`parseFloat\` | Librairies externes |
| \`encodeURIComponent\` | DOM / \`window\` |

**Timeout :** 5 secondes maximum d'ex\u00e9cution.

### Structure d'un Tool

Chaque tool a 3 parties :

1. **Nom** \u2014 identifiant unique (ex: \`calculate_price\`)
2. **Sch\u00e9ma de param\u00e8tres** \u2014 JSON Schema d\u00e9finissant les entr\u00e9es
3. **Code d'ex\u00e9cution** \u2014 JavaScript qui traite \`args\` et retourne un r\u00e9sultat

> **Important :** Votre code doit retourner une valeur. S'il retourne \`undefined\`, l'agent re\u00e7oit \`"null"\`.

---

## Use Case 1 : Calculateur de prix

Un tool qui calcule les prix avec taxes, remises et formatage de devise.

**Nom :** \`calculate_price\`

**Description :** Calculer le prix total avec taxe et remise optionnelle

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "unitPrice": { "type": "number", "description": "Prix unitaire" },
    "quantity": { "type": "number", "description": "Nombre d'unit\u00e9s" },
    "taxRate": { "type": "number", "description": "Taux de taxe en % (ex: 20 pour 20%)" },
    "discountPercent": { "type": "number", "description": "Remise en % (optionnel)" },
    "currency": { "type": "string", "description": "Symbole de devise (d\u00e9faut: \u20ac)" }
  },
  "required": ["unitPrice", "quantity", "taxRate"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { unitPrice, quantity, taxRate, discountPercent = 0, currency = "\u20ac" } = args;
const subtotal = unitPrice * quantity;
const discount = subtotal * (discountPercent / 100);
const afterDiscount = subtotal - discount;
const tax = afterDiscount * (taxRate / 100);
const total = afterDiscount + tax;

return [
  \`Sous-total : \${subtotal.toFixed(2)} \${currency}\`,
  discountPercent > 0 ? \`Remise (\${discountPercent}%) : -\${discount.toFixed(2)} \${currency}\` : null,
  \`Taxe (\${taxRate}%) : +\${tax.toFixed(2)} \${currency}\`,
  \`**Total : \${total.toFixed(2)} \${currency}**\`
].filter(Boolean).join("\\n");
\`\`\`

---

## Use Case 2 : Formateur & Validateur JSON

Un tool qui valide, formate et analyse des donn\u00e9es JSON.

**Nom :** \`format_json\`

**Description :** Valider, formater et analyser des donn\u00e9es JSON

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "input": { "type": "string", "description": "Cha\u00eene JSON brute \u00e0 valider et formater" },
    "indent": { "type": "number", "description": "Espaces d'indentation (d\u00e9faut: 2)" }
  },
  "required": ["input"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { input, indent = 2 } = args;
try {
  const parsed = JSON.parse(input);
  const formatted = JSON.stringify(parsed, null, indent);
  const keys = Object.keys(parsed);
  const type = Array.isArray(parsed) ? \`Tableau (\${parsed.length} \u00e9l\u00e9ments)\` : \`Objet (\${keys.length} cl\u00e9s)\`;

  return \`JSON valide \u2014 \${type}\\n\\nCl\u00e9s : \${keys.join(", ")}\\n\\n\\\`\\\`\\\`json\\n\${formatted}\\n\\\`\\\`\\\`\`;
} catch (e) {
  return \`JSON invalide : \${e.message}\`;
}
\`\`\`

---

## Use Case 3 : Calculateur de dates

Un tool qui calcule des dur\u00e9es, ajoute/soustrait des jours et compare des dates.

**Nom :** \`date_calculator\`

**Description :** Calculer des diff\u00e9rences de dates, ajouter/soustraire des jours

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "operation": { "type": "string", "enum": ["diff", "add", "info"], "description": "Op\u00e9ration : diff (entre 2 dates), add (ajouter des jours), info (infos sur une date)" },
    "date": { "type": "string", "description": "Date au format AAAA-MM-JJ" },
    "date2": { "type": "string", "description": "Seconde date pour l'op\u00e9ration diff (AAAA-MM-JJ)" },
    "days": { "type": "number", "description": "Nombre de jours \u00e0 ajouter (n\u00e9gatif pour soustraire)" }
  },
  "required": ["operation", "date"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { operation, date, date2, days = 0 } = args;
const d = new Date(date + "T00:00:00Z");
if (isNaN(d.getTime())) return "Format de date invalide. Utilisez AAAA-MM-JJ.";

const jours = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const mois = ["Janvier", "F\u00e9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\u00fbt", "Septembre", "Octobre", "Novembre", "D\u00e9cembre"];

if (operation === "info") {
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const weekNum = Math.ceil(dayOfYear / 7);
  const isLeap = (d.getFullYear() % 4 === 0 && d.getFullYear() % 100 !== 0) || d.getFullYear() % 400 === 0;
  return [
    \`Date : \${date}\`,
    \`Jour : \${jours[d.getUTCDay()]}\`,
    \`Mois : \${mois[d.getUTCMonth()]}\`,
    \`Jour de l'ann\u00e9e : \${dayOfYear}\`,
    \`Semaine : \${weekNum}\`,
    \`Ann\u00e9e bissextile : \${isLeap ? "Oui" : "Non"}\`,
  ].join("\\n");
}

if (operation === "add") {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + days);
  return \`\${date} + \${days} jours = \${result.toISOString().slice(0, 10)} (\${jours[result.getUTCDay()]})\`;
}

if (operation === "diff" && date2) {
  const d2 = new Date(date2 + "T00:00:00Z");
  if (isNaN(d2.getTime())) return "Format de la seconde date invalide.";
  const diffMs = Math.abs(d2 - d);
  const diffDays = Math.round(diffMs / 86400000);
  const weeks = Math.floor(diffDays / 7);
  const remaining = diffDays % 7;
  return \`Entre \${date} et \${date2} :\\n\${diffDays} jours (\${weeks} semaines et \${remaining} jours)\`;
}

return "Op\u00e9ration invalide. Utilisez : diff, add ou info.";
\`\`\`

---

## Use Case 4 : Analyseur de texte

Un tool qui compte les mots, caract\u00e8res, phrases et estime le temps de lecture.

**Nom :** \`analyze_text\`

**Description :** Analyser un texte : nombre de mots, temps de lecture, mots-cl\u00e9s

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "text": { "type": "string", "description": "Texte \u00e0 analyser" },
    "topKeywords": { "type": "number", "description": "Nombre de mots-cl\u00e9s \u00e0 afficher (d\u00e9faut: 5)" }
  },
  "required": ["text"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { text, topKeywords = 5 } = args;
const words = text.split(/\\s+/).filter(w => w.length > 0);
const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
const paragraphs = text.split(/\\n\\s*\\n/).filter(p => p.trim().length > 0);
const readingTimeMin = Math.ceil(words.length / 200);

const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "is", "it", "le", "la", "les", "de", "du", "des", "et", "en", "un", "une"]);
const freq = {};
words.forEach(w => {
  const lower = w.toLowerCase().replace(/[^a-zA-Z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00e7]/g, "");
  if (lower.length > 2 && !stopWords.has(lower)) {
    freq[lower] = (freq[lower] || 0) + 1;
  }
});
const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, topKeywords);

return [
  \`Caract\u00e8res : \${text.length}\`,
  \`Mots : \${words.length}\`,
  \`Phrases : \${sentences.length}\`,
  \`Paragraphes : \${paragraphs.length}\`,
  \`Mots/phrase (moy.) : \${sentences.length ? (words.length / sentences.length).toFixed(1) : "N/A"}\`,
  \`Temps de lecture : ~\${readingTimeMin} min\`,
  \`\\nMots-cl\u00e9s principaux :\`,
  ...top.map(([word, count], i) => \`  \${i + 1}. \${word} (\${count}x)\`),
].join("\\n");
\`\`\`

---

## Use Case 5 : G\u00e9n\u00e9rateur de tableau Markdown

Un tool qui cr\u00e9e des tableaux Markdown format\u00e9s \u00e0 partir de donn\u00e9es structur\u00e9es.

**Nom :** \`generate_table\`

**Description :** G\u00e9n\u00e9rer un tableau Markdown format\u00e9 \u00e0 partir d'en-t\u00eates et de lignes

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "headers": { "type": "array", "items": { "type": "string" }, "description": "En-t\u00eates de colonnes" },
    "rows": { "type": "array", "items": { "type": "array", "items": { "type": "string" } }, "description": "Lignes du tableau (tableaux de tableaux)" },
    "align": { "type": "string", "enum": ["left", "center", "right"], "description": "Alignement des colonnes (d\u00e9faut: left)" }
  },
  "required": ["headers", "rows"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { headers, rows, align = "left" } = args;
const colWidths = headers.map((h, i) =>
  Math.max(h.length, ...rows.map(r => (r[i] || "").length))
);

const pad = (str, width) => {
  const s = String(str || "");
  if (align === "right") return s.padStart(width);
  if (align === "center") {
    const left = Math.floor((width - s.length) / 2);
    return " ".repeat(left) + s + " ".repeat(width - s.length - left);
  }
  return s.padEnd(width);
};

const sep = align === "right" ? "---:" : align === "center" ? ":---:" : "---";
const headerRow = "| " + headers.map((h, i) => pad(h, colWidths[i])).join(" | ") + " |";
const divider = "| " + colWidths.map(() => sep).join(" | ") + " |";
const dataRows = rows.map(r =>
  "| " + headers.map((_, i) => pad(r[i] || "", colWidths[i])).join(" | ") + " |"
);

return [headerRow, divider, ...dataRows].join("\\n");
\`\`\`

---

## Use Case 6 : Validateur de donn\u00e9es

Un tool qui valide les emails, URLs, t\u00e9l\u00e9phones et autres formats courants.

**Nom :** \`validate_data\`

**Description :** Valider des formats de donn\u00e9es : email, URL, t\u00e9l\u00e9phone, date, carte bancaire, IBAN

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "value": { "type": "string", "description": "Valeur \u00e0 valider" },
    "type": { "type": "string", "enum": ["email", "url", "phone", "date", "credit_card", "iban"], "description": "Type de validation" }
  },
  "required": ["value", "type"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { value, type } = args;
const v = value.trim();
const checks = {
  email: () => {
    const valid = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);
    const [local, domain] = v.split("@");
    return { valid, details: valid ? \`Local : \${local}, Domaine : \${domain}\` : "Format invalide : doit \u00eatre nom@domaine.tld" };
  },
  url: () => {
    const valid = /^https?:\\/\\/[^\\s]+\\.[^\\s]+/.test(v);
    let details = "Format d'URL invalide";
    if (valid) {
      const hasHttps = v.startsWith("https://");
      details = \`Protocole : \${hasHttps ? "HTTPS (s\u00e9curis\u00e9)" : "HTTP (non s\u00e9curis\u00e9)"}\`;
    }
    return { valid, details };
  },
  phone: () => {
    const digits = v.replace(/[^0-9]/g, "");
    const valid = digits.length >= 8 && digits.length <= 15;
    return { valid, details: valid ? \`\${digits.length} chiffres, normalis\u00e9 : +\${digits}\` : "Doit contenir 8-15 chiffres" };
  },
  date: () => {
    const d = new Date(v);
    const valid = !isNaN(d.getTime());
    return { valid, details: valid ? \`Interpr\u00e9t\u00e9 comme : \${d.toISOString().slice(0, 10)}\` : "Impossible d'interpr\u00e9ter la date" };
  },
  credit_card: () => {
    const digits = v.replace(/[^0-9]/g, "");
    let sum = 0;
    for (let i = digits.length - 1, alt = false; i >= 0; i--, alt = !alt) {
      let n = parseInt(digits[i]);
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    }
    const valid = sum % 10 === 0 && digits.length >= 13 && digits.length <= 19;
    return { valid, details: valid ? \`V\u00e9rification Luhn r\u00e9ussie, \${digits.length} chiffres\` : "\u00c9chec de la v\u00e9rification Luhn" };
  },
  iban: () => {
    const cleaned = v.replace(/\\s/g, "").toUpperCase();
    const valid = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/.test(cleaned);
    return { valid, details: valid ? \`Pays : \${cleaned.slice(0, 2)}, Longueur : \${cleaned.length}\` : "Format IBAN invalide" };
  },
};

if (!checks[type]) return \`Type inconnu : \${type}\`;
const result = checks[type]();
return \`\${result.valid ? "VALIDE" : "INVALIDE"} \${type}\\nValeur : \${v}\\n\${result.details}\`;
\`\`\`

---

## Use Case 7 : Moteur de templates

Un tool qui remplit des templates avec des variables \u2014 id\u00e9al pour g\u00e9n\u00e9rer des emails, messages ou documents.

**Nom :** \`fill_template\`

**Description :** Remplir un template texte avec des variables au format {{variable}}

**Sch\u00e9ma de param\u00e8tres :**
\`\`\`json
{
  "type": "object",
  "properties": {
    "template": { "type": "string", "description": "Texte template avec des marqueurs {{variable}}" },
    "variables": { "type": "object", "description": "Paires cl\u00e9-valeur \u00e0 remplir" }
  },
  "required": ["template", "variables"]
}
\`\`\`

**Code d'ex\u00e9cution :**
\`\`\`javascript
const { template, variables } = args;
let result = template;
const used = new Set();
const missing = [];

result = result.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g, (match, key) => {
  if (variables[key] !== undefined) {
    used.add(key);
    return String(variables[key]);
  }
  missing.push(key);
  return match;
});

const unused = Object.keys(variables).filter(k => !used.has(k));
let report = result;
if (missing.length > 0 || unused.length > 0) {
  report += "\\n\\n---\\n";
  if (missing.length) report += \`Variables manquantes : \${missing.join(", ")}\\n\`;
  if (unused.length) report += \`Variables inutilis\u00e9es : \${unused.join(", ")}\\n\`;
}
return report;
\`\`\`

---

## Conseils

- **Retournez toujours une valeur** \u2014 si votre code retourne \`undefined\`, l'agent re\u00e7oit \`"null"\`
- **Utilisez \`args\`** \u2014 tous les param\u00e8tres du tool sont sur l'objet \`args\`
- **Restez rapide** \u2014 le sandbox a un timeout de 5 secondes
- **Pas de r\u00e9seau** \u2014 utilisez les GitHub tools (\`read_file\`, \`search_files\`) pour l'acc\u00e8s aux fichiers, pas les custom tools
- **Testez dans le Playground** \u2014 demandez \u00e0 votre agent d'utiliser le tool et v\u00e9rifiez le r\u00e9sultat
`,
} as const;
