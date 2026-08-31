let ckusedTimeout = null;
const checks = {
	length: x => x.length >= 3 && x.length <= 30,
	used: x => !checks.length(x) || null
}, checkname = async () => {
	const uname = document.getElementById('name').value;
	document.querySelector('button').disabled = true;
	Object.entries(checks).forEach(([name, check]) => {
		const ele = document.getElementById('namecheck-' + name);
		switch (check(uname)) {
			case true:
				ele.className = 'fa-solid fa-check check-success';
				break;
			case false:
				ele.className = 'fa-solid fa-xmark check-failed';
				break;
			default:
				ele.className = 'fa-solid fa-spin fa-spinner check-loading';
				if (name === 'used') {
					clearTimeout(ckusedTimeout);
					ckusedTimeout = setTimeout(async () => {
						if ((await (await fetch('/api/user/search?user=' + uname)).json()).exists) {
							ele.className = 'fa-solid fa-xmark check-failed';
							document.querySelector('button').disabled = true;
						} else {
							ele.className = 'fa-solid fa-check check-success';
							document.querySelector('button').disabled = false;
						}
					}, 1000);
				}
				break;
		}
	});
}, checkpassword = () => {
	if (document.getElementById('password').value === document.getElementById('confirmPassword').value) {
		return true;
	}
	alert(passwordNotMatchText);
	return false;
};
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', checkname);
} else {
	checkname();
}