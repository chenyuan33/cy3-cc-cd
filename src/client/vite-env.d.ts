/// <reference types="vite/client" />

import type { messages } from "../i18n"
import type { themeBasicInfo, userInfo } from "../types"

declare global {
	interface Window {
		data: {
			enableAvatar: boolean,
			locale: keyof typeof messages,
			currentUser: userInfo & { email: string | null } | null,
			usingTheme: themeBasicInfo
		}
	}
}