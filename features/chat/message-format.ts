export type MessageTextPart = { text: string; bold: boolean };

function markerLength(text: string, offset: number, marker: string) {
  let end = offset;
  while (text[end] === marker) end++;
  return end - offset;
}

function codeEnd(text: string, offset: number) {
  const length = markerLength(text, offset, "`");
  let end = offset + length;
  while (end < text.length) {
    if (text[end] !== "`") { end++; continue; }
    const closingLength = markerLength(text, end, "`");
    if (closingLength === length) return end + length;
    end += closingLength;
  }
  return text.length;
}

function closingMarker(text: string, offset: number, length: number) {
  let end = offset + length;
  while (end < text.length) {
    if (text[end] === "\\") { end += 2; continue; }
    if (text[end] === "`") { end = codeEnd(text, end); continue; }
    if (text[end] !== "*") { end++; continue; }
    const closingLength = markerLength(text, end, "*");
    if (closingLength === length && !/\s/.test(text[end - 1])) return end;
    end += closingLength;
  }
  return -1;
}

/** Chat accepts both *bold* and **bold**, leaving unfinished spans literal. */
export function formatMessageText(text: string): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  const append = (value: string, bold = false) => {
    if (!value) return;
    const last = parts.at(-1);
    if (last?.bold === bold) last.text += value;
    else parts.push({ text: value, bold });
  };

  let offset = 0;
  while (offset < text.length) {
    const character = text[offset];
    if (character === "\\" && /[\\*]/.test(text[offset + 1] ?? "")) {
      append(text[offset + 1]);
      offset += 2;
    } else if (character === "`") {
      const end = codeEnd(text, offset);
      append(text.slice(offset, end));
      offset = end;
    } else if (character === "*") {
      const length = markerLength(text, offset, "*");
      const end = length <= 3 && text[offset + length] && !/\s/.test(text[offset + length])
        ? closingMarker(text, offset, length)
        : -1;
      if (end > offset + length) {
        append(text.slice(offset + length, end).replace(/\\([\\*])/g, "$1"), true);
        offset = end + length;
      } else {
        append(text.slice(offset, offset + length));
        offset += length;
      }
    } else {
      let end = offset + 1;
      while (end < text.length && !/[\\*`]/.test(text[end])) end++;
      append(text.slice(offset, end));
      offset = end;
    }
  }
  return parts;
}
