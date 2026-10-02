/**
 * A tiny monochrome highlighter, no dependencies: comments and strings are
 * dimmed, keywords and Svelte block tags are bold. Prefix a line with `!` to
 * mark it as the important one. Returns HTML for a `<pre class="code">`.
 */
const TOKEN =
	/(\/\/.*)|('[^']*'|"[^"]*"|`[^`]*`)|(\{[#/@:]\w+|\b(?:import|from|export|const|async|await|return|as)\b)/g;

const escape = (s: string) =>
	s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export function highlight(code: string) {
	return code
		.split('\n')
		.map((line) => {
			const important = line.startsWith('!');
			if (important) line = line.slice(1);

			let html = '';
			let last = 0;
			for (const m of line.matchAll(TOKEN)) {
				const kind = m[1] ? 'comment' : m[2] ? 'string' : 'keyword';
				html += escape(line.slice(last, m.index)) + `<span class="${kind}">${escape(m[0])}</span>`;
				last = m.index + m[0].length;
			}
			html += escape(line.slice(last));

			return `<span class="line${important ? ' important' : ''}">${html || ' '}</span>`;
		})
		.join('');
}
