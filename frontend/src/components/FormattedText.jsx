import React from "react";

export function extractExternalUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s<>"'()[\]]+/i);
  return match?.[0].replace(/[.,;:!?]+$/, "") || "";
}

function normalizeMarkdownLinks(value) {
  return value.replace(/\[([^\]]+)\]\(([\s\S]*?)\)/g, (markdown, label, target) => {
    const url = extractExternalUrl(target) || extractExternalUrl(label);
    if (!url) return label;

    const cleanLabel = label.replace(/\s+/g, " ").trim();
    return `[${cleanLabel}](${url})`;
  });
}

function renderInline(value, keyPrefix) {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*\n]+)\*|https?:\/\/[^\s<>]+)/g;
  const nodes = [];
  let cursor = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) {
      nodes.push(value.slice(cursor, match.index));
    }

    const key = `${keyPrefix}-${match.index}`;
    if (match[2] && match[3]) {
      nodes.push(
        <a key={key} href={match[3]} target="_blank" rel="noreferrer">
          {match[2]}
        </a>,
      );
    } else if (match[4] || match[5]) {
      nodes.push(<strong key={key}>{match[4] || match[5]}</strong>);
    } else if (match[6]) {
      nodes.push(<code key={key}>{match[6]}</code>);
    } else if (match[7]) {
      nodes.push(<em key={key}>{match[7]}</em>);
    } else {
      const url = extractExternalUrl(match[0]);
      nodes.push(
        <a key={key} href={url} target="_blank" rel="noreferrer">
          {url}
        </a>,
      );
    }

    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes.flatMap((node, index) =>
    typeof node === "string"
      ? node.split("\n").flatMap((line, lineIndex) =>
          lineIndex === 0
            ? [line]
            : [<br key={`${keyPrefix}-br-${index}-${lineIndex}`} />, line],
        )
      : [node],
  );
}

function FormattedText({ children, className = "" }) {
  const source = normalizeMarkdownLinks(String(children || "").replace(/\r\n?/g, "\n"));
  if (!source.trim()) return null;

  const blocks = source.split(/\n\s*\n/).filter((block) => block.trim());

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^\s*[-*]\s+/.test(line));

        if (isList) {
          return (
            <ul key={`block-${blockIndex}`}>
              {lines.map((line, lineIndex) => (
                <li key={`line-${lineIndex}`}>
                  {renderInline(line.replace(/^\s*[-*]\s+/, ""), `list-${blockIndex}-${lineIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`block-${blockIndex}`}>
            {renderInline(block, `paragraph-${blockIndex}`)}
          </p>
        );
      })}
    </div>
  );
}

export default FormattedText;
