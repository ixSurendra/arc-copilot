/**
 * Email HTML utilities for the TipTap template editor.
 *
 * The visual editor only handles the **content portion** of an email template.
 * Branding elements (logo, primaryColor in styles, footer) use Handlebars
 * syntax that TipTap cannot represent, so they are stripped on load and
 * re-injected on save via `wrapWithEmailBranding()`.
 */

// ---------------------------------------------------------------------------
// Regex patterns for stripping / restoring branding wrappers
// ---------------------------------------------------------------------------

/** Matches the outer email container div (font-family + max-width: 600px) */
const WRAPPER_RE =
  /^\s*<div\s+style="[^"]*font-family:[^"]*max-width:\s*600px[^"]*">\s*([\s\S]*?)\s*<\/div>\s*$/;

/** Logo line: {{#if logoUrl}}<img .../>{{/if}} */
const LOGO_LINE_RE =
  /\{\{#if\s+logoUrl\}\}\s*<img[^>]*\/?>(?:\s*\{\{\/if\}\})/gi;

/** Footer block: {{#if footerText}}<p ...>{{footerText}}</p>{{/if}} */
const FOOTER_BLOCK_RE =
  /\{\{#if\s+footerText\}\}\s*<p[^>]*>\{\{footerText\}\}<\/p>\s*\{\{\/if\}\}/gi;

/** Heading color: style="...color: {{primaryColor}};..." → strip the color */
const HEADING_COLOR_RE =
  /(<h[1-6][^>]*style="[^"]*?)color:\s*\{\{primaryColor\}\};?\s*/gi;

/** CTA button background: background: {{primaryColor}} */
const BUTTON_BG_RE =
  /(<a[^>]*style="[^"]*?)background:\s*\{\{primaryColor\}\};?\s*/gi;

/** Remaining {{#if ...}} / {{/if}} / {{else}} that visual editor can't show */
const BLOCK_HELPERS_RE =
  /\{\{#if\s+\w+\}\}|\{\{\/if\}\}|\{\{else\}\}/g;

// ---------------------------------------------------------------------------
// Helper: only replace {{var}} in text content, not inside HTML attributes
// ---------------------------------------------------------------------------

/**
 * Split HTML into tag vs text segments and only convert `{{var}}` in text.
 * This prevents corrupting attributes like `src="{{logoUrl}}"`.
 */
function replaceVariablesInTextContent(html: string): string {
  // Split by HTML tags — odd indices are tags, even indices are text
  const parts = html.split(/(<[^>]*>)/);
  return parts
    .map((part, i) => {
      // Odd indices are HTML tags — leave them as-is
      if (i % 2 === 1) return part;
      // Even indices are text content — convert {{var}} to chip spans
      return part.replace(
        /\{\{(\w+)\}\}/g,
        '<span data-type="handlebars-variable" data-name="$1">{{$1}}</span>',
      );
    })
    .join('');
}

// ---------------------------------------------------------------------------
// Pre-process: raw Handlebars HTML → TipTap-friendly HTML
// ---------------------------------------------------------------------------

/**
 * Prepare a raw email template for the TipTap visual editor.
 *
 * 1. Strips the email wrapper div
 * 2. Removes branding elements (logo, footer, primaryColor in styles)
 * 3. Strips remaining Handlebars block helpers
 * 4. Converts `{{variable}}` to chip spans for TipTap
 */
export function preprocessHtmlForEditor(html: string): string {
  if (!html) return '';

  let result = html;

  // Strip the email wrapper div if present
  const wrapperMatch = result.match(WRAPPER_RE);
  if (wrapperMatch) {
    result = wrapperMatch[1];
  }

  // Remove branding elements that visual editor cannot represent
  result = result.replace(LOGO_LINE_RE, '');
  result = result.replace(FOOTER_BLOCK_RE, '');
  result = result.replace(HEADING_COLOR_RE, '$1');
  result = result.replace(BUTTON_BG_RE, '$1');

  // Strip any remaining block helpers
  result = result.replace(BLOCK_HELPERS_RE, '');

  // Convert raw {{variableName}} to tagged spans for TipTap parsing.
  // Only replace variables in text content, not inside HTML attributes.
  result = replaceVariablesInTextContent(result);

  return result.trim();
}

// ---------------------------------------------------------------------------
// Post-process: TipTap HTML → email-safe HTML
// ---------------------------------------------------------------------------

/**
 * Post-process TipTap HTML output to make it email-client compatible.
 *
 * - Adds inline styles to semantic HTML elements (p, h1, a, ul, ol, img, hr)
 * - Preserves any existing inline styles from TipTap extensions (Color, TextAlign, etc.)
 *
 * NOTE: Does NOT add the outer wrapper or branding — use `wrapWithEmailBranding()`
 * after this function to produce the final saved HTML.
 */
export function convertToEmailHtml(tiptapHtml: string): string {
  if (!tiptapHtml) return '';

  if (typeof window === 'undefined') return tiptapHtml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(tiptapHtml, 'text/html');

  // Add default styles to paragraphs
  doc.querySelectorAll('p').forEach((p) => {
    if (!p.style.margin) p.style.margin = '0 0 16px 0';
    if (!p.style.lineHeight) p.style.lineHeight = '1.5';
  });

  // Add styles to headings
  doc.querySelectorAll('h1').forEach((h) => {
    if (!h.style.fontSize) h.style.fontSize = '24px';
    if (!h.style.fontWeight) h.style.fontWeight = 'bold';
    if (!h.style.margin) h.style.margin = '0 0 12px 0';
    if (!h.style.lineHeight) h.style.lineHeight = '1.3';
  });

  doc.querySelectorAll('h2').forEach((h) => {
    if (!h.style.fontSize) h.style.fontSize = '20px';
    if (!h.style.fontWeight) h.style.fontWeight = 'bold';
    if (!h.style.margin) h.style.margin = '0 0 10px 0';
    if (!h.style.lineHeight) h.style.lineHeight = '1.3';
  });

  doc.querySelectorAll('h3').forEach((h) => {
    if (!h.style.fontSize) h.style.fontSize = '18px';
    if (!h.style.fontWeight) h.style.fontWeight = 'bold';
    if (!h.style.margin) h.style.margin = '0 0 8px 0';
    if (!h.style.lineHeight) h.style.lineHeight = '1.3';
  });

  // Style links
  doc.querySelectorAll('a').forEach((a) => {
    if (!a.style.color) a.style.color = '#2563eb';
    if (!a.style.textDecoration) a.style.textDecoration = 'underline';
  });

  // Style lists
  doc.querySelectorAll('ul').forEach((ul) => {
    if (!ul.style.paddingLeft) ul.style.paddingLeft = '24px';
    if (!ul.style.margin) ul.style.margin = '0 0 16px 0';
  });

  doc.querySelectorAll('ol').forEach((ol) => {
    if (!ol.style.paddingLeft) ol.style.paddingLeft = '24px';
    if (!ol.style.margin) ol.style.margin = '0 0 16px 0';
  });

  // Style images
  doc.querySelectorAll('img').forEach((img) => {
    if (!img.style.maxWidth) img.style.maxWidth = '100%';
    if (!img.style.height) img.style.height = 'auto';
  });

  // Style horizontal rules
  doc.querySelectorAll('hr').forEach((hr) => {
    hr.style.border = 'none';
    hr.style.borderTop = '1px solid #e4e4e7';
    hr.style.margin = '16px 0';
  });

  return doc.body.innerHTML;
}

// ---------------------------------------------------------------------------
// Branding wrapper: re-inject logo, primaryColor, footer around content
// ---------------------------------------------------------------------------

/**
 * Wrap editor content with the standard email branding structure.
 *
 * Re-injects `{{#if logoUrl}}`, `{{primaryColor}}` on headings/buttons,
 * and `{{#if footerText}}` footer that the visual editor cannot represent.
 */
export function wrapWithEmailBranding(contentHtml: string): string {
  let result = contentHtml;

  // Inject {{primaryColor}} on headings via string manipulation
  // (browser style API rejects Handlebars expressions as invalid CSS values)
  result = result.replace(
    /(<h[1-6]\s+style=")((?:(?!color:)[^"])*")/gi,
    '$1color: {{primaryColor}}; $2',
  );

  // Re-apply CTA button styling to action links (loginUrl, resetUrl).
  // TipTap's Link extension strips all inline styles from <a> tags,
  // so we detect these by href and restore the button appearance.
  const CTA_BUTTON_STYLE =
    'display: inline-block; background: {{primaryColor}}; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;';
  result = result.replace(
    /<a\s+([^>]*?)href="(\{\{loginUrl\}\}|\{\{resetUrl\}\})"([^>]*?)style="[^"]*"([^>]*)>/gi,
    `<a $1href="$2"$3style="${CTA_BUTTON_STYLE}"$4>`,
  );
  // Also handle links where style comes before href
  result = result.replace(
    /<a\s+([^>]*?)style="[^"]*"([^>]*?)href="(\{\{loginUrl\}\}|\{\{resetUrl\}\})"([^>]*)>/gi,
    `<a $1style="${CTA_BUTTON_STYLE}"$2href="$3"$4>`,
  );

  // Build the final wrapped template
  const lines = [
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">',
    '  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}',
    `  ${result}`,
    '  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}',
    '</div>',
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Clean variable spans: TipTap chip nodes → raw {{var}}
// ---------------------------------------------------------------------------

/**
 * Convert TipTap variable chip spans back to plain Handlebars `{{var}}`.
 */
export function cleanVariableSpans(html: string): string {
  return html.replace(
    /<span data-type="handlebars-variable" data-name="\w+">\{\{(\w+)\}\}<\/span>/g,
    '{{$1}}',
  );
}
