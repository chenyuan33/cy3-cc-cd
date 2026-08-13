const checkChangePassword = () => {
	const newPassword = document.getElementById('newPassword').value, confirmPassword = document.getElementById('confirmPassword').value;
	if (newPassword !== confirmPassword) {
		alert(__PASSWORD_DOES_NOT_MATCH__);
		return false;
	}
	return confirm(__CHANGE_PASSWORD_CONFIRM__);
}