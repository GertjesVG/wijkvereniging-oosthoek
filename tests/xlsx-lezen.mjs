// Leest een .xlsx (zip + XML) terug voor de tests, zonder extra pakket: elk bestand uit de zip (stored of deflate, met
// CRC-controle) en per werkblad de celwaarden als rijen tekst. Ook een controle dat elk XML-deel goed gevormd is.
import assert from "node:assert/strict";
import { crc32, inflateRawSync } from "node:zlib";

export function unzip(bytes) {
  const buf = Buffer.from(bytes);
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, "geen zip: einde van de inhoudsopgave ontbreekt");
  const count = buf.readUInt16LE(end + 10);
  let at = buf.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(at), 0x02014b50, "kapotte inhoudsopgave");
    const method = buf.readUInt16LE(at + 10);
    const crc = buf.readUInt32LE(at + 16);
    const size = buf.readUInt32LE(at + 20);
    const nameLength = buf.readUInt16LE(at + 28);
    const extra = buf.readUInt16LE(at + 30);
    const comment = buf.readUInt16LE(at + 32);
    const offset = buf.readUInt32LE(at + 42);
    const name = buf.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    assert.equal(buf.readUInt32LE(offset), 0x04034b50, `kapotte lokale kop: ${name}`);
    const start = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const raw = buf.subarray(start, start + size);
    const data = method === 0 ? raw : inflateRawSync(raw);
    assert.equal(crc32(data), crc, `CRC klopt niet: ${name}`);
    files.set(name, data.toString("utf8"));
    at += 46 + nameLength + extra + comment;
  }
  return files;
}

const unescape = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// Eenvoudige controle op goed gevormde XML: elke open tag wordt in de juiste volgorde gesloten.
export function assertWellFormed(xml, name) {
  const stack = [];
  for (const [, close, tag, selfClose] of xml.replace(/<\?xml[^>]*\?>/, "").matchAll(/<(\/?)([A-Za-z_][\w:.-]*)(?:\s[^<>]*?)?(\/?)>/g)) {
    if (selfClose) continue;
    if (close) assert.equal(stack.pop(), tag, `${name}: </${tag}> sluit niet de juiste tag`);
    else stack.push(tag);
  }
  assert.deepEqual(stack, [], `${name}: niet gesloten tags`);
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml), `${name}: ongeldige &`);
}

// { bladnaam: [[cel, cel, ...], ...] } met lege cellen als "".
export function readXlsx(bytes) {
  const files = unzip(bytes);
  for (const [name, text] of files) if (name.endsWith(".xml") || name.endsWith(".rels")) assertWellFormed(text, name);
  const workbook = files.get("xl/workbook.xml");
  const names = [...workbook.matchAll(/<sheet name="([^"]+)"/g)].map((m) => unescape(m[1]));
  const sheets = {};
  names.forEach((sheetName, i) => {
    const xml = files.get(`xl/worksheets/sheet${i + 1}.xml`);
    const rows = [];
    for (const [, rowXml] of xml.matchAll(/<row [^>]*>(.*?)<\/row>/g)) {
      const row = [];
      for (const [, ref, attrs, body] of rowXml.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/g)) {
        let col = 0;
        for (const ch of ref) col = col * 26 + ch.charCodeAt(0) - 64;
        while (row.length < col - 1) row.push("");
        const text = body ? (/<t[^>]*>(.*?)<\/t>/s.exec(body)?.[1] ?? /<v>(.*?)<\/v>/.exec(body)?.[1] ?? "") : "";
        row.push(unescape(text));
        if (/t="(?:s|str)"/.test(attrs)) throw new Error("onverwacht celtype");
      }
      rows.push(row);
    }
    sheets[sheetName] = { rows, xml };
  });
  return sheets;
}
