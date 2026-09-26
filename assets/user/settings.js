const changePasswordForm = document.getElementById('changePassword');
changePasswordForm.addEventListener('submit', async evt => {
	evt.preventDefault();
	const newPassword = document.getElementById('newPassword').value, confirmPassword = document.getElementById('confirmPassword').value;
	if (newPassword !== confirmPassword) {
		await createAlert(translations.user.passwordNotMatch);
	} else if (await createConfirm(translations.user.confirmPassword)) {
		changePasswordForm.submit();
	}
});