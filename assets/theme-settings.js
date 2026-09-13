const ThemeSettings = (() => {
	let overlay = null;

	const t = key => translations[key] || key;

	const createOverlay = () => {
		if (overlay) return overlay;
		overlay = document.createElement('div');
		overlay.className = 'theme-settings-overlay';
		overlay.addEventListener('click', e => {
			if (e.target === overlay) close();
		});
		document.body.appendChild(overlay);
		return overlay;
	};

	const renderDialog = () => {
		const config = ThemeManager.getConfig();
		const bg = config.background;
		const fg = config.frostedGlass;
		const carousel = config.carousel;

		overlay.innerHTML = `
			<div class="theme-settings-dialog">
				<button class="theme-settings-close" onclick="ThemeSettings.close()">&times;</button>
				<h2>${t('themeSettings')}</h2>

				<div class="theme-settings-section">
					<h3>${t('themeDarkLightMode')}</h3>
					<div class="theme-settings-row">
						<span class="theme-settings-label">${t('themeFollowSystem')}</span>
						<label class="theme-settings-toggle">
							<input type="checkbox" id="themeFollowSystem" ${config.lightMode === 'system' ? 'checked' : ''}>
							<span class="slider"></span>
						</label>
					</div>
					<div class="theme-settings-row" id="themeManualModeRow" style="display: ${config.lightMode === 'system' ? 'none' : 'flex'}">
						<span class="theme-settings-label">${t('themeMode')}</span>
						<div class="theme-settings-control">
							<select id="themeLightMode">
								<option value="light" ${config.lightMode === 'light' ? 'selected' : ''}>${t('themeLight')}</option>
								<option value="dark" ${config.lightMode === 'dark' ? 'selected' : ''}>${t('themeDark')}</option>
							</select>
						</div>
					</div>
				</div>

				<div class="theme-settings-section">
					<h3>${t('themeBackground')}</h3>
					<div class="theme-settings-row">
						<span class="theme-settings-label">${t('themeBackgroundType')}</span>
						<div class="theme-settings-control">
							<select id="themeBgType">
								<option value="color" ${bg.type === 'color' ? 'selected' : ''}>${t('themeColor')}</option>
								<option value="image" ${bg.type === 'image' ? 'selected' : ''}>${t('themeImage')}</option>
							</select>
						</div>
					</div>
					<div id="themeBgColorRow" style="display: ${bg.type === 'color' ? 'flex' : 'none'}">
						<div class="theme-settings-row">
							<span class="theme-settings-label">${t('themeBackgroundColor')}</span>
							<div class="theme-settings-control">
								<input type="color" id="themeBgColor" value="${bg.color}">
							</div>
						</div>
					</div>
					<div id="themeBgImageRows" style="display: ${bg.type === 'image' ? 'block' : 'none'}">
						<div class="theme-settings-row">
							<span class="theme-settings-label">${t('themeBackgroundFit')}</span>
							<div class="theme-settings-control">
								<select id="themeBgFit">
									<option value="cover" ${bg.fit === 'cover' ? 'selected' : ''}>${t('themeFitCover')}</option>
									<option value="contain" ${bg.fit === 'contain' ? 'selected' : ''}>${t('themeFitContain')}</option>
									<option value="repeat" ${bg.fit === 'repeat' ? 'selected' : ''}>${t('themeFitRepeat')}</option>
									<option value="center" ${bg.fit === 'center' ? 'selected' : ''}>${t('themeFitCenter')}</option>
								</select>
							</div>
						</div>
						<div class="theme-settings-row">
							<span class="theme-settings-label">${t('themeBackgroundImageUrl')}</span>
							<div class="theme-settings-control">
								<input type="text" id="themeBgImageUrl" value="${bg.imageUrl}" placeholder="https://...">
							</div>
						</div>
						<div class="theme-settings-row">
							<span class="theme-settings-label">${t('themeOverlayOpacity')}</span>
							<div class="theme-settings-control">
								<input type="range" id="themeOverlayOpacity" min="0" max="100" value="${bg.overlayOpacity ?? 75}">
								<span id="themeOverlayValue">${bg.overlayOpacity ?? 75}%</span>
							</div>
						</div>
						<div class="theme-settings-row">
							<span class="theme-settings-label">${t('themeCarousel')}</span>
							<label class="theme-settings-toggle">
								<input type="checkbox" id="themeCarouselEnabled" ${carousel.enabled ? 'checked' : ''}>
								<span class="slider"></span>
							</label>
						</div>
						<div id="themeCarouselSettings" style="display: ${carousel.enabled ? 'block' : 'none'}">
							<div class="theme-settings-row">
								<span class="theme-settings-label">${t('themeCarouselRandom')}</span>
								<label class="theme-settings-toggle">
									<input type="checkbox" id="themeCarouselRandom" ${carousel.random ? 'checked' : ''}>
									<span class="slider"></span>
								</label>
							</div>
							<div class="theme-settings-images" id="themeCarouselImages">
								${carousel.images.map((url, i) => `
									<div class="theme-settings-image-item">
										<img src="${url}" onerror="this.src='/favicon.ico'">
										<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:gray">${url}</span>
										<button class="remove-btn" onclick="ThemeSettings.removeCarouselImage(${i})"><i class="fa-solid fa-trash"></i></button>
									</div>
								`).join('')}
							</div>
							<div class="theme-settings-image-add">
								<input type="text" id="themeNewImageUrl" placeholder="${t('themeAddImageUrl')}">
								<button onclick="ThemeSettings.addCarouselImage()">${t('themeAdd')}</button>
							</div>
						</div>
					</div>
				</div>

				<div class="theme-settings-section">
					<h3>${t('themeFrostedGlass')}</h3>
					<div class="theme-settings-row">
						<span class="theme-settings-label">${t('themeFrostedGlassEnable')}</span>
						<label class="theme-settings-toggle">
							<input type="checkbox" id="themeFrostedGlass" ${fg.enabled ? 'checked' : ''}>
							<span class="slider"></span>
						</label>
					</div>
					<div class="theme-settings-row" id="themeBlurRow" style="display: ${fg.enabled ? 'flex' : 'none'}">
						<span class="theme-settings-label">${t('themeBlurRadius')}</span>
						<div class="theme-settings-control">
							<input type="range" id="themeBlurRadius" min="1" max="30" value="${fg.blurRadius}">
							<span id="themeBlurValue">${fg.blurRadius}px</span>
						</div>
					</div>
				</div>

				<div class="theme-settings-section">
					<h3>${t('themeEditor')}</h3>
					<div class="theme-settings-row">
						<span class="theme-settings-label">${t('themeEditorType')}</span>
						<div class="theme-settings-control">
							<select id="themeEditorType">
								<option value="codemirror" ${config.editor === 'codemirror' ? 'selected' : ''}>CodeMirror</option>
								<option value="monaco" ${config.editor === 'monaco' ? 'selected' : ''}>Monaco Editor</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		`;

		bindEvents();
	};

	const bindEvents = () => {
		const $ = id => document.getElementById(id);

		$('themeFollowSystem').addEventListener('change', e => {
			const isSystem = e.target.checked;
			$('themeManualModeRow').style.display = isSystem ? 'none' : 'flex';
			ThemeManager.setConfig('lightMode', isSystem ? 'system' : $('themeLightMode').value);
		});

		$('themeLightMode')?.addEventListener('change', e => {
			ThemeManager.setConfig('lightMode', e.target.value);
		});

		$('themeBgType').addEventListener('change', e => {
			const type = e.target.value;
			$('themeBgColorRow').style.display = type === 'color' ? 'flex' : 'none';
			$('themeBgImageRows').style.display = type === 'image' ? 'block' : 'none';
			ThemeManager.setConfig('background.type', type);
		});

		$('themeBgColor').addEventListener('input', e => {
			ThemeManager.setConfig('background.color', e.target.value);
		});

		$('themeBgFit').addEventListener('change', e => {
			ThemeManager.setConfig('background.fit', e.target.value);
		});

		$('themeBgImageUrl').addEventListener('change', e => {
			ThemeManager.setConfig('background.imageUrl', e.target.value);
		});

		$('themeOverlayOpacity').addEventListener('input', e => {
			const value = parseInt(e.target.value);
			$('themeOverlayValue').textContent = value + '%';
			ThemeManager.setConfig('background.overlayOpacity', value);
		});

		$('themeCarouselEnabled').addEventListener('change', e => {
			const enabled = e.target.checked;
			$('themeCarouselSettings').style.display = enabled ? 'block' : 'none';
			ThemeManager.setConfig('carousel.enabled', enabled);
		});

		$('themeCarouselRandom')?.addEventListener('change', e => {
			ThemeManager.setConfig('carousel.random', e.target.checked);
		});

		$('themeFrostedGlass').addEventListener('change', e => {
			const enabled = e.target.checked;
			$('themeBlurRow').style.display = enabled ? 'flex' : 'none';
			ThemeManager.setConfig('frostedGlass.enabled', enabled);
		});

		$('themeBlurRadius').addEventListener('input', e => {
			const value = parseInt(e.target.value);
			$('themeBlurValue').textContent = value + 'px';
			ThemeManager.setConfig('frostedGlass.blurRadius', value);
		});

		$('themeEditorType').addEventListener('change', e => {
			ThemeManager.setConfig('editor', e.target.value);
		});
	};

	const open = () => {
		createOverlay();
		renderDialog();
		overlay.classList.add('active');
	};

	const close = () => {
		if (overlay) overlay.classList.remove('active');
	};

	const addCarouselImage = () => {
		const input = document.getElementById('themeNewImageUrl');
		const url = input.value.trim();
		if (!url) return;
		const config = ThemeManager.getConfig();
		config.carousel.images.push(url);
		ThemeManager.setConfig('carousel.images', config.carousel.images);
		renderDialog();
	};

	const removeCarouselImage = index => {
		const config = ThemeManager.getConfig();
		config.carousel.images.splice(index, 1);
		ThemeManager.setConfig('carousel.images', config.carousel.images);
		renderDialog();
	};

	return { open, close, addCarouselImage, removeCarouselImage };
})();
