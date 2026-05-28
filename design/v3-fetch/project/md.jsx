// Lightweight markdown renderer — enough for the spec.md preview

function renderMarkdown(src) {
  // strip frontmatter
  let fm = null;
  let body = src;
  const fmMatch = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    fm = fmMatch[1];
    body = src.slice(fmMatch[0].length);
  }

  const lines = body.split("\n");
  const out = [];
  let i = 0;

  const inline = (s) =>
    s
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  while (i < lines.length) {
    const ln = lines[i];

    if (/^#\s+/.test(ln)) { out.push(`<h1>${inline(ln.slice(2))}</h1>`); i++; continue; }
    if (/^##\s+/.test(ln)) { out.push(`<h2>${inline(ln.slice(3))}</h2>`); i++; continue; }
    if (/^###\s+/.test(ln)) { out.push(`<h3>${inline(ln.slice(4))}</h3>`); i++; continue; }

    if (/^---\s*$/.test(ln)) { out.push("<hr/>"); i++; continue; }

    if (/^>\s?/.test(ln)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // table
    if (/^\|.*\|$/.test(ln) && /^\|.*\|$/.test(lines[i + 1] || "") && /-+/.test(lines[i + 1] || "")) {
      const header = ln.split("|").slice(1, -1).map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map(c => c.trim()));
        i++;
      }
      out.push(
        "<table><thead><tr>" + header.map(h => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>"
        + rows.map(r => "<tr>" + r.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>").join("")
        + "</tbody></table>"
      );
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        let t = lines[i].replace(/^[-*]\s+/, "");
        if (/^\[ \]\s+/.test(t)) t = `<span style="color:var(--text-faint)">☐</span> ` + t.slice(4);
        else if (/^\[x\]\s+/i.test(t)) t = `<span style="color:var(--good)">☑</span> ` + t.slice(4);
        items.push(`<li>${inline(t)}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (ln.trim() === "") { i++; continue; }

    // paragraph (consume until blank)
    const buf = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#|>|\||---)/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    if (buf.length) {
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    } else {
      // Guard against any line that no parser claimed AND the paragraph
      // guard refused (e.g. emphasis at start of line like `*foo*`):
      // force progress so we never spin.
      out.push(`<p>${inline(lines[i])}</p>`);
      i++;
    }
  }

  let html = "";
  if (fm) html += `<div class="frontmatter">${fm.replace(/\n/g, "<br/>")}</div>`;
  html += out.join("\n");
  return html;
}

window.renderMarkdown = renderMarkdown;
