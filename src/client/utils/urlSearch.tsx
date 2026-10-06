const listeners = new Set<() => void>();
let installed = false;
let origPush: typeof history.pushState;
let origReplace: typeof history.replaceState;
const notify = () => {
	listeners.forEach(fn => fn());
}
export const subscribeUrlChange = (setSearch: (search: string) => void) => () => {
	const fn = () => setSearch(location.search);
	if (!installed) {
		installed = true;
		origPush = history.pushState;
		origReplace = history.replaceState;
		history.pushState = function (...args) {
			origPush.apply(this, args);
			notify();
		};
		history.replaceState = function (...args) {
			origReplace.apply(this, args);
			notify();
		};
		window.addEventListener('popstate', notify);
	}
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
		if (!installed || listeners.size > 0) return;
		installed = false;
		history.pushState = origPush;
		history.replaceState = origReplace;
		window.removeEventListener('popstate', notify);
	};
}