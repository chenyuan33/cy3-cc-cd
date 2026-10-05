const updateUseBgImage = () => {
	if (document.getElementById('useBgImage').checked) {
		document.querySelector('form').classList.add('usebgimage');
		document.querySelector('form').classList.remove('usebgcolor');
		Array.from(document.querySelectorAll('.onbgcolor input:not([type="checkbox"])')).forEach(el => el.required = false);
		Array.from(document.querySelectorAll('.onbgimage input:not([type="checkbox"])')).forEach(el => el.required = true);
	} else {
		document.querySelector('form').classList.remove('usebgimage');
		document.querySelector('form').classList.add('usebgcolor');
		Array.from(document.querySelectorAll('.onbgcolor input:not([type="checkbox"])')).forEach(el => el.required = true);
		Array.from(document.querySelectorAll('.onbgimage input:not([type="checkbox"])')).forEach(el => el.required = false);
	}
}, updateBgImageSizeX = () => {
	if (document.getElementById('bgImageSizeX').value === 'custom') {
		document.querySelector('form').classList.add('usebgimagexcustom');
		Array.from(document.querySelectorAll('.onbgimagexcustom input:not([type="checkbox"])')).forEach(el => el.required = true);
	} else {
		document.querySelector('form').classList.remove('usebgimagexcustom');
		Array.from(document.querySelectorAll('.onbgimagexcustom input:not([type="checkbox"])')).forEach(el => el.required = false);
	}
}, updateBgImageSizeY = () => {
	if (document.getElementById('bgImageSizeY').value === 'custom') {
		document.querySelector('form').classList.add('usebgimageycustom');
		Array.from(document.querySelectorAll('.onbgimageycustom input:not([type="checkbox"])')).forEach(el => el.required = true);
	} else {
		document.querySelector('form').classList.remove('usebgimageycustom');
		Array.from(document.querySelectorAll('.onbgimageycustom input:not([type="checkbox"])')).forEach(el => el.required = false);
	}
}
document.addEventListener('DOMContentLoaded', () => {
	updateUseBgImage();
	updateBgImageSizeX();
	updateBgImageSizeY();
});