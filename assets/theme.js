const ThemeManager = (() => {
	const STORAGE_KEY = 'theme';
	const DEFAULTS = {
		lightMode: 'system',
		background: {
			type: 'color',
			color: 'auto',
			imageUrl: '',
			fit: 'cover',
			overlayOpacity: 0
		},
		carousel: {
			enabled: false,
			images: [],
			random: false,
			interval: 5000
		},
		frostedGlass: {
			enabled: false,
			blurRadius: 10
		},
		editor: 'monaco'
	};

	let config = {};
	let carouselTimer = null;
	let currentCarouselIndex = 0;

	const load = () => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			config = saved ? { ...DEFAULTS, ...JSON.parse(saved) } : { ...DEFAULTS };
		} catch {
			config = { ...DEFAULTS };
		}
		return config;
	};

	const save = () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	};

	const getConfig = () => ({ ...config });

	const setConfig = (path, value) => {
		const keys = path.split('.');
		let obj = config;
		for (let i = 0; i < keys.length - 1; i++) {
			if (!obj[keys[i]]) obj[keys[i]] = {};
			obj = obj[keys[i]];
		}
		obj[keys[keys.length - 1]] = value;
		save();
		apply();
	};

	const applyLightMode = () => {
		const mode = config.lightMode;
		if (mode === 'system') {
			document.documentElement.style.colorScheme = 'light dark';
		} else {
			document.documentElement.style.colorScheme = mode;
		}
		const icon = document.getElementById('lightSwitchIcon');
		if (icon) {
			icon.classList = mode === 'light' ? 'fa-solid fa-sun' :
				mode === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-palette';
		}
		const probe = document.createElement('div');
		probe.style.position = 'absolute';
		probe.style.visibility = 'hidden';
		probe.style.pointerEvents = 'none';
		probe.style.width = '0';
		probe.style.height = '0';
		probe.style.backgroundColor = 'light-dark(black, white)';
		document.body.appendChild(probe);
		const bgColor = getComputedStyle(probe).backgroundColor;
		document.body.removeChild(probe);
		const isDark = bgColor === 'rgb(0, 0, 0)';
		const CodeMirrorTheme = isDark ? 'duotone-light' : 'duotone-dark';
		if (typeof CodeMirrorEditors !== 'undefined') {
			CodeMirrorEditors.forEach(editor => editor.setOption('theme', CodeMirrorTheme));
		}
	};

	const resolveImageUrl = (url) => {
		if (!url) return url;
		const now = new Date();
		const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
		return url
			.replace(/\{y\}/g, now.getFullYear())
			.replace(/\{m\}/g, String(now.getMonth() + 1).padStart(2, '0'))
			.replace(/\{d\}/g, String(now.getDate()).padStart(2, '0'))
			.replace(/\{w\}/g, weekdays[now.getDay()]);
	};

	const applyBackground = () => {
		const root = document.documentElement;
		const bg = config.background;

		if (bg.type === 'image' && bg.imageUrl) {
			const resolvedUrl = resolveImageUrl(bg.imageUrl);
			root.style.setProperty('--bg-image', `url("${resolvedUrl}")`);
			root.style.setProperty('--bg-color', 'transparent');
		} else {
			root.style.setProperty('--bg-image', 'none');
			if (bg.color === 'auto' || !bg.color) {
				root.style.setProperty('--bg-color', 'light-dark(#e3e3e3, #121212)');
			} else {
				root.style.setProperty('--bg-color', bg.color);
			}
		}
		root.style.setProperty('--bg-fit', bg.fit);
		const opacity = (bg.overlayOpacity ?? 0) / 100;
		root.style.setProperty('--overlay-opacity', opacity);
	};

	const applyFrostedGlass = () => {
		const fg = config.frostedGlass;
		document.body.classList.toggle('frosted-glass', fg.enabled);
		document.documentElement.style.setProperty('--header-blur', `${fg.blurRadius}px`);
		document.documentElement.style.setProperty('--nav-blur', `${fg.blurRadius}px`);
		document.documentElement.style.setProperty('--card-blur', `${fg.blurRadius}px`);
	};

	const startCarousel = () => {
		stopCarousel();
		if (!config.carousel.enabled || config.carousel.images.length <= 1) return;

		const applyNextImage = () => {
			if (config.carousel.random) {
				currentCarouselIndex = Math.floor(Math.random() * config.carousel.images.length);
			} else {
				currentCarouselIndex = (currentCarouselIndex + 1) % config.carousel.images.length;
			}
			config.background.imageUrl = config.carousel.images[currentCarouselIndex];
			save();
			applyBackground();
		};

		carouselTimer = setInterval(applyNextImage, config.carousel.interval);
	};

	const stopCarousel = () => {
		if (carouselTimer) {
			clearInterval(carouselTimer);
			carouselTimer = null;
		}
	};

	const applyEditorPreference = () => {
		const event = new CustomEvent('theme:editorChange', { detail: { editor: config.editor } });
		document.dispatchEvent(event);
	};

	const apply = () => {
		applyLightMode();
		applyBackground();
		applyFrostedGlass();
		applyEditorPreference();
		if (config.carousel.enabled) {
			if (config.carousel.images.length > 0 && config.background.type === 'image') {
				if (!config.background.imageUrl || !config.carousel.images.includes(config.background.imageUrl)) {
					config.background.imageUrl = config.carousel.images[0];
					save();
				}
			}
			startCarousel();
		} else {
			stopCarousel();
		}
	};

	const switchLightMode = () => {
		const modes = ['system', 'light', 'dark'];
		const currentIndex = modes.indexOf(config.lightMode);
		config.lightMode = modes[(currentIndex + 1) % modes.length];
		save();
		apply();
	};

	const init = () => {
		load();
		apply();
	};

	return {
		init,
		getConfig,
		setConfig,
		switchLightMode,
		apply,
		load,
		save
	};
})();

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', ThemeManager.init);
} else {
	ThemeManager.init();
}
