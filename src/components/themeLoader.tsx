import { raw } from "hono/html";
import type { FC } from "hono/jsx";

export const ThemeLoader: FC<{ theme: {
	usebgimage: number | boolean, useFrostedGlass: number | boolean,
	bgImageRepeatX: number | boolean, bgImageRepeatY: number | boolean,
	bgImageSizeX: 'auto' | 'cover' | 'contain' | 'custom', bgImageSizeXCustom: number, bgImageSizeXCustomUnit: 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh',
	bgImageSizeY: 'auto' | 'cover' | 'contain' | 'custom', bgImageSizeYCustom: number, bgImageSizeYCustomUnit: 'px' | 'em' | 'rem' | '%' | 'vw' | 'vh',
	light_fgcolor: string, light_bgcolor: string, light_bgimage: string,
	dark_fgcolor: string, dark_bgcolor: string, dark_bgimage: string
}, root: string }> = ({ theme, root }) => <style>
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