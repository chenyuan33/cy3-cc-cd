export const toTimeDurationString = (time_ms: number) => {
	if (time_ms < 1000) {
		return time_ms + 'ms';
	}
	time_ms /= 1000;
	if (time_ms < 60) {
		return time_ms + 's';
	}
	time_ms /= 60;
	if (time_ms < 60) {
		return time_ms + 'min';
	}
	time_ms /= 60;
	if (time_ms < 24) {
		return time_ms + 'h';
	}
	time_ms /= 24;
	return time_ms + 'd';
};