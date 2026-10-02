import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import type { themeInfo } from "../types";

export const ThemeLoader: FC<{ theme: themeInfo, root: string }> = ({ theme, root }) => <style>
	{raw(root + ' {')}
		{theme.usebgimage ? `
			background-repeat: ${theme.bgImageRepeatX
				? theme.bgImageRepeatY ? 'repeat' : 'repeat-x'
				: theme.bgImageRepeatY ? 'repeat-y' : 'no-repeat'};
			background-size:
				${theme.bgImageSizeX === 'custom' ? theme.bgImageSizeXCustom + theme.bgImageSizeXCustomUnit : theme.bgImageSizeX}
				${theme.bgImageSizeY === 'custom' ? theme.bgImageSizeYCustom + theme.bgImageSizeYCustomUnit : theme.bgImageSizeY};
			background-image: light-dark(url(${theme.light_bgimage}), url(${theme.dark_bgimage}));
		` : `
			background-color: light-dark(${theme.light_bgcolor}, ${theme.dark_bgcolor});
			background-image: unset;
		`}
		color: light-dark({theme.light_fgcolor}, {theme.dark_fgcolor});
		--use-frosted-glass: {theme.useFrostedGlass ? 1 : 0};
	{raw('}')}
</style>;