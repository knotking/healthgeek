/**
 * Prompt template renderer.
 *
 * Supports the Handlebars subset the prompts in `src/ai/flows` use:
 *
 *   {{{value}}} / {{value}}        field interpolation (dotted paths allowed)
 *   {{#if field}} … {{/if}}        render when the field is truthy
 *   {{#unless field}} … {{/unless}} render when the field is falsy
 *   {{#each list}} … {{/each}}     iterate, with {{{this}}}, @index, @first, @last
 *   {{media url=field}}            attach the data URI in `field` as media
 *
 * Values are inserted verbatim — unlike Handlebars there is no HTML escaping,
 * because the output is a model prompt rather than markup.
 */

export type PromptPart = { type: 'text'; text: string } | { type: 'media'; url: string };

type Node =
  | { kind: 'text'; value: string }
  | { kind: 'var'; path: string }
  | { kind: 'media'; path: string }
  | { kind: 'block'; type: 'if' | 'unless' | 'each'; path: string; children: Node[] };

interface Scope {
  data: unknown;
  parent?: Scope;
  index?: number;
  length?: number;
}

const TAG = /\{\{\{?([^{}]+?)\}?\}\}/g;

export class TemplateError extends Error {}

function parse(template: string): Node[] {
  const root: Node[] = [];
  const stack: { node: Extract<Node, { kind: 'block' }>; siblings: Node[] }[] = [];
  let children = root;
  let cursor = 0;

  const pushText = (value: string) => {
    if (value) children.push({ kind: 'text', value });
  };

  for (const match of template.matchAll(TAG)) {
    pushText(template.slice(cursor, match.index));
    cursor = match.index + match[0].length;

    const body = match[1].trim();

    if (body.startsWith('#if ') || body.startsWith('#unless ') || body.startsWith('#each ')) {
      const [helper, ...rest] = body.slice(1).split(/\s+/);
      const node: Extract<Node, { kind: 'block' }> = {
        kind: 'block',
        type: helper as 'if' | 'unless' | 'each',
        path: rest.join(' ').trim(),
        children: [],
      };
      children.push(node);
      stack.push({ node, siblings: children });
      children = node.children;
      continue;
    }

    if (body.startsWith('/')) {
      const closing = body.slice(1).trim();
      const open = stack.pop();
      if (!open || open.node.type !== closing) {
        throw new TemplateError(`Unexpected {{/${closing}}} in prompt template.`);
      }
      children = open.siblings;
      continue;
    }

    if (body.startsWith('media ')) {
      const url = /url\s*=\s*"?([^"\s]+)"?/.exec(body);
      if (!url) throw new TemplateError(`Could not read a url from {{${body}}}.`);
      children.push({ kind: 'media', path: url[1] });
      continue;
    }

    children.push({ kind: 'var', path: body });
  }

  pushText(template.slice(cursor));

  if (stack.length > 0) {
    throw new TemplateError(`Unclosed {{#${stack[stack.length - 1].node.type}}} in prompt template.`);
  }
  return root;
}

function resolve(path: string, scope: Scope): unknown {
  if (path === 'this' || path === '.') return scope.data;
  if (path === '@index') return scope.index;
  if (path === '@first') return scope.index === 0;
  if (path === '@last') return scope.index !== undefined && scope.index === (scope.length ?? 0) - 1;

  let current: unknown = scope.data;
  for (const segment of path.split('.')) {
    if (current === null || typeof current !== 'object') {
      current = undefined;
      break;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  // Fall back to the enclosing scope so `{{#each}}` bodies can read outer fields.
  if (current === undefined && scope.parent) return resolve(path, scope.parent);
  return current;
}

function truthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return Boolean(value);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function render(nodes: Node[], scope: Scope, out: PromptPart[]): void {
  const emitText = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.type === 'text') last.text += text;
    else out.push({ type: 'text', text });
  };

  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
        emitText(node.value);
        break;
      case 'var':
        emitText(stringify(resolve(node.path, scope)));
        break;
      case 'media': {
        const url = resolve(node.path, scope);
        if (typeof url === 'string' && url.length > 0) out.push({ type: 'media', url });
        break;
      }
      case 'block': {
        const value = resolve(node.path, scope);
        if (node.type === 'if') {
          if (truthy(value)) render(node.children, scope, out);
        } else if (node.type === 'unless') {
          if (!truthy(value)) render(node.children, scope, out);
        } else {
          const items = Array.isArray(value) ? value : [];
          items.forEach((item, index) => {
            render(node.children, { data: item, parent: scope, index, length: items.length }, out);
          });
        }
        break;
      }
    }
  }
}

/** Renders a template into ordered text and media parts. */
export function renderTemplate(template: string, input: unknown): PromptPart[] {
  const parts: PromptPart[] = [];
  render(parse(template), { data: input }, parts);
  return parts
    .map(part => (part.type === 'text' ? { type: 'text' as const, text: part.text } : part))
    .filter(part => part.type !== 'text' || part.text.trim().length > 0);
}
