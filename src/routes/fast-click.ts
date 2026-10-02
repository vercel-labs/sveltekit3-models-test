/**
 * Buttons and links fire on mouse press instead of release, so every click lands
 * ~100ms sooner. Touch keeps the native behavior, otherwise scrolling would tap things.
 */
export function fastClick() {
	let pressed = false;

	function down(e: PointerEvent) {
		pressed = false;
		if (e.pointerType !== 'mouse' || e.button !== 0) return;
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab, etc.

		const el = (e.target as Element).closest<HTMLElement>('button:not(:disabled), a[href]');
		if (!el) return;

		pressed = true;
		el.click();
	}

	// the release's own click already happened on press, so swallow it
	function click(e: MouseEvent) {
		if (!pressed || !e.isTrusted || e.detail === 0) return;
		pressed = false;
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	addEventListener('pointerdown', down, true);
	addEventListener('click', click, true);
	return () => {
		removeEventListener('pointerdown', down, true);
		removeEventListener('click', click, true);
	};
}
