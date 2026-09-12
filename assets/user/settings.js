const changePasswordForm = document.getElementById('changePassword');
changePasswordForm.addEventListener('submit', async evt => {
	evt.preventDefault();
	const newPassword = document.getElementById('newPassword').value, confirmPassword = document.getElementById('confirmPassword').value;
	if (newPassword !== confirmPassword) {
		await createAlert(__PASSWORD_DOES_NOT_MATCH__);
	} else if (await createConfirm(__CHANGE_PASSWORD_CONFIRM__)) {
		changePasswordForm.submit();
	}
});