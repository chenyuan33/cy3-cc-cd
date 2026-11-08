export const isLightMode = () => {
	const probe = document.createElement('div');
	probe.style.position = 'absolute';
	probe.style.visibility = 'hidden';
	probe.style.pointerEvents = 'none';
	probe.style.width = '0';
	probe.style.height = '0';
	probe.style.backgroundColor = 'light-dark(black, white)';
	document.body.appendChild(probe);
	const lightMode = getComputedStyle(probe).backgroundColor === 'rgb(0, 0, 0)';
	document.body.removeChild(probe);
	return lightMode;
};