export default {
	browserNotification: {
		title: {
			notification: 'New Notification',
			privateMessage: {
				detail: 'New Private Message From {sender}',
				summary: 'New Private Message'
			}
		},
		body: {
			notification: 'You have a new notification. Go check it out!',
			privateMessage: {
				detail: 'You have a new private message from {sender}. Go check it out!',
				summary: 'You have a new private message. Go check it out!'
			}
		},
	},
	serverConnectStatus: {
		connecting: 'Connecting to server',
		connected: 'Connected to server',
		failed: 'Failed to connect to server',
	},
	renderer: {
		noscript: 'Please do NOT disable scripts, or the webpage will have problems.',
		theme: 'Switch Light Mode'
	},
	md: {
		strong: 'Bold',
		italic: 'Italic',
		delete: 'Strikethrough'
	},
	loading: 'Loading...',
	home: {
		name: 'Home',
		checkIn: {
			name: 'Check in',
			resetTime: 'You can check in again on {date}.',
			button: 'Click to check in',
			good: 'Good:',
			bad: 'Bad:',
			everythingGood: 'Everything is good',
			everythingBad: 'Everything is bad',
			count: 'You have checked in {count} times.',
			referenceOnly: 'For entertainment only',
			status: {
				'-3': 'Great misfortune',
				'-2': 'Misfortune',
				'-1': 'Minor misfortune',
				'0': 'Neutral',
				'1': 'Minor fortune',
				'2': 'Fortune',
				'3': 'Great fortune',
			},
			afterLogin: `{login} to check in`,
			alreadyCheckedIn: 'You have already checked in today.'
		},
		recentDiscussions: 'Recent discussions',
		recentAnnouncements: 'Recent announcements'
	},
	userInfo: {
		username: 'Username',
		password: 'Password',
		email: 'Email',
		uid: 'User ID',
		registeredAt: 'Registered at'
	},
	user: {
		user: 'User',
		register: 'Register',
		registerUsernameLength: 'Username must be between 3 and 30 characters.',
		registerUsernameExists: 'Username already exists.',
		login: 'Login',
		registerToLogin: 'Already have an account? {link}',
		registerToLoginLink: 'Login here!',
		loginToRegister: 'No account? {link}',
		loginToRegisterLink: 'Register here!',
		confirmPassword: 'Confirm password',
		passwordNotMatch: 'Passwords do not match.',
		settings: {
			name: 'User settings',
			browserNotification: {
				name: 'Browser Notification',
				permissionDenied: 'This feature has been disabled and is currently unavailable. Please go to your browser settings to allow notifications from this site, then return here to configure the settings.',
				permissionUngranted: 'This feature is not enabled and is currently unavailable. Please click this button and grant this website permission to send notifications:',
				permissionRequest: 'Request Notification Permissions',
				notification: {
					label: 'Notification Center',
					detail: 'Full Content',
					summary: 'Show only new notification',
					no: 'Don\'t notify'
				},
				privateMessage: {
					label: 'Private Message',
					detail: 'Full Content',
					senderOnly: 'Show only sender',
					summary: 'Show only new private message',
					no: 'Don\'t notify'
				}
			},
			username: {
				name: 'Username Settings',
				changeColorLight: 'Username Color in Light Mode',
				changeColorDark: 'Username Color in Dark Mode'
			},
			security: {
				name: 'Security Settings',
				changePassword: {
					name: 'Change Password',
					old: 'Old Password',
					new: 'New Password',
					confirm: 'Confirm Password',
					doesNotMatch: 'New password doesn\'t match!',
					changeConfirm: 'Sure to change password?',
					changedSuccessfully: 'Password changed successfully'
				},
				changeEmail: {
					name: 'Change email',
					current: 'Your current email is {email}',
					currentUnset: 'No email set yet',
					verify: 'Within ten minutes, use email {email} to send an email to <a href="mailto:verify@cqiming.com">verify@cqiming.com</a> with any subject, and the body <strong>must</strong> be (no extra content) the number below. After sending, <strong>wait ten seconds for the cache to refresh</strong> then click verify.',
					verifySuccessfully: 'Email successfully linked'
				}
			},
		},
		notification: {
			name: 'Notification center',
			types: {
				'feed-reply': '{user}\'s {feed} replied to {target}.',
				'discussion-reply-replied': '{user}\'s {reply} replied to {parentReply} in {discussion}.',
				'ticket-reply-replied': '{user}\'s {reply} replied to {parentReply} in {ticket}.',
				'ticket-status-changed': '{ticket} status has been set to {status}.',
				'permission-changed': 'Your permissions have been changed by {operator} for the following reason:{comment}{changeList}',
				'name-violation': 'Your username has been {set} by {operator}:{comment}',
				'warn': '{operator} has warned you for the following reason:{comment}',
				'at': '{user} mentioned you {link}',
				'unknown': 'Unknown notification type'
			},
			atHere: 'here',
			yourFeed: 'your feed',
			yourDiscussion: 'your discussion',
			yourTicket: 'your ticket',
			yourReply: 'your reply',
			nothing: 'No notifications yet.',
			autoReadAll: 'Automatically mark all messages as read'
		},
		profile: {
			title: '{username}\'s Profile',
			home: 'Profile',
			feed: 'Posted Feeds',
			discussion: 'Posted Discussions',
			theme: 'Created Themes',
			judgement: 'Penalty Records',
			admin: 'Manage'
		},
		tag: 'Tag',
		tagAdmin: 'Admin',
		unknown: 'Unknown user',
		usernameViolation: 'Violating username {uid}',
		toggleUsernameViolation: 'Toggle username violation status'
	},
	problem: {
		list: 'Problem List',
		id: 'Problem ID',
		title: 'Problem Title',
		content: 'Description',
		post: 'Post Problem',
		edit: 'Edit Problem',
		back: 'Back to Problem'
	},
	chat: {
		name: 'Private messages',
		recent: 'Recent messages',
	},
	feed: 'Feed',
	feeds: 'Feeds',
	discussion: {
		name: 'Discussion',
		post: 'Post discussion',
		categoryName: {
			announcement: 'Announcement',
			general: 'General',
			academic: 'Academic',
		},
		itemDescription: '{user} · {category} · {createdAt}',
		replyItemDescription: '{user} · {createdAt}'
	},
	ticket: {
		name: 'Tickets',
		post: {
			name: 'Post Ticket',
			similar: 'Before creating a ticket, you may want to take a look at the following tickets that may be similar:'
		},
		categoryName: {
			suggestion: 'Suggestion',
			bugReport: 'Bug report',
			userReport: 'Report user',
			checkinAdd: 'Add check-in type',
			other: 'Other'
		},
		statusName: {
			new: 'Pending',
			inProgress: 'In progress',
			pending: 'On hold',
			infoNeeded: 'Info needed',
			resolved: 'Resolved',
			closed: 'Closed',
		},
		itemDescription: '{user} · {category} · {createdAt} · {status} · Assignee: {assignee}',
		replyItemDescription: '{user} · {createdAt}',
		setStatusTo: 'Ticket status set to {status}',
		setAssigneeTo: 'Ticket assignee set to {assignee}',
		setStatus: 'Set ticket status to',
		setAssignee: 'Set ticket assignee to'
	},
	ide: {
		name: 'Online IDE',
		noLanguageSupported: 'There aren\'t any programming languages available.'
	},
	onlineJudge: {
		stdin: 'Standard Input',
		stdout: 'Standard Output',
		stderr: 'Standard Error',
		run: 'Run',
		language: 'Language',
		timeLimit: 'Time Limit',
		memoryLimit: 'Memory Limit',
		expectedOutput: 'Expected Output',
		actualOutput: 'Actual Output',
		judgeResult: {
			Judging: 'Judging',
			Compilation_Error: 'Compilation Error',
			Accepted: 'Accepted',
			Wrong_Answer: 'Wrong Answer',
			Runtime_Error: 'Runtime Error',
			Time_Limit_Exceeded: 'Time Limit Exceeded',
			Memory_Limit_Exceeded: 'Memory Limit Exceeded'
		}
	},
	judgement: {
		name: 'Access Renewal',
		description: 'We are publishing here the recent administrative logs regarding changes to user privileges (such as account suspensions and mutes) and the status of usernames that have violated the rules, in order to enhance the transparency of our administrative processes and serve as a warning to users.',
		noRecords: 'No operation records.',
	},
	file: {
		name: 'File Upload',
		goToFolder: 'Create or go to a folder:',
		fileName: 'File Name',
		size: 'File Size / Bytes',
		folderEmpty: 'The folder is empty now.'
	},
	theme: {
		name: 'Theme',
		notFound: 'Theme Not Found',
		list: 'Theme Store',
		themeColor: 'Theme Color',
		themeName: 'Theme Name',
		numberOfUsers: 'Number of Users',
		create: 'Create Theme',
		edit: 'Edit Theme',
		saveAsNew: 'Save as New Theme',
		reset: 'Reset Theme',
		useBgImage: 'Use Background Image',
		editor: 'Set the Editor to Use',
		bgImageRepeat: {
			x: 'Repeat Background Image Horizontally',
			y: 'Repeat Background Image Vertically'
		},
		bgImageSize: {
			x: 'Background Image Size (Width)',
			y: 'Background Image Size (Height)',
			auto: 'Auto',
			cover: 'Cover',
			contain: 'Contain',
			custom: 'Custom'
		},
		bgImageSizeCustom: {
			x: 'Custom Background Image Size (Width)',
			y: 'Custom Background Image Size (Height)'
		},
		lengthUnits: {
			px: 'Pixels',
			em: 'EMS',
			rem: 'Root EMS',
			'%': 'Percentage',
			'vw': 'View Width',
			'vh': 'View Height'
		},
		useFrostedGlass: 'Use Frosted Glass Effect',
		lightTheme: 'Light Theme',
		darkTheme: 'Dark Theme',
		fgcolor: 'Foreground Color',
		bgcolor: 'Background Color',
		bgimage: 'Background Image'
	},
	admin: {
		name: 'Admin',
		domainRenew: 'Domain Renew',
		ticketQuickReply: 'Quick Replies for Tickets'
	},
	error: {
		somethingWentWrong: 'Something went wrong',
		missingParams: 'Missing parameter',
		alreadyLoggedIn: 'You are already logged in.',
		notLoggedIn: 'Not logged in',
		loginRequired: 'Please <a href="/user/login">log in</a> first.',
		emailVerifyRequired: 'Please <a href="/user/settings">verify your email</a> first.',
		banned: 'You have been banned',
		muted: 'You have been muted',
		categoryNotFound: 'Category not found',
		statusNotFound: 'Status not found',
		accessDenied: 'Access denied.',
		notFound: 'Page not found.',
		usernameRequired: 'Username is required',
		passwordRequired: 'Password is required',
		emailRequired: 'Email is required',
		categoryRequired: 'Category is required',
		titleRequired: 'Title is required',
		contentRequired: 'Content is required',
		invalidPassword: 'Invalid password',
		invalidEmail: 'Invalid email',
		noSuchUsername: 'No such username.',
		emailUsed: 'This email has been used.',
		verifyFailed: 'Verification failed'
	},
	id: 'ID',
    title: 'Title',
    content: 'Content',
	creator: 'Creator',
	operator: 'Operator',
	category: 'Category',
    categories: 'Categories',
    status: 'Status',
    allCategories: 'All categories',
    allStatuses: 'All statuses',
	nothing: 'Nothing here yet.',
	noReplies: 'No replies yet.',
	go: 'Go',
	filter: 'Filter',
	send: 'Send',
	post: 'Post',
	postAfterLogin: '{link} to post',
	postAfterEmailVerify: '{link} to post',
	reply: 'Reply',
	replyAfterLogin: '{link} to reply',
	replyAfterEmailVerify: '{link} to reply',
	replyTo: 'Reply To:',
	afterLoginLink: 'Login',
	afterEmailVerifyLink: 'Verify your email',
	postSuccessfully: 'Post Successfully',
	next: 'Next',
	edit: 'Edit',
	save: 'Save',
	ok: 'OK',
	cancel: 'Cancel',
	warn: 'Warn',
	readStatus: {
		read: 'Read',
		unread: 'Unread',
		markRead: 'Mark as read',
		markUnread: 'Mark as unread',
		markReadAll: 'Mark all as read'
	},
	permission: {
		name: 'Permission',
		granted: 'Granted permission',
		revoked: 'Revoked permission',
		changed: 'Changed permission',
		grantPermission: 'Grant Permission',
		revokePermission: 'Revoke Permission',
		grant: 'Grant',
		revoke: 'Revoke',
		'1': 'Visit the site',
		'2': 'Speak freely',
		'4': 'Access admin panel',
		'8': 'Use Private Messages',
		'16': 'Use File Upload Feature'
	},
	usernameViolation: {
		set: 'Set as Violating Username',
		unset: 'Unset as Violating Username',
		setted: 'has been marked as violating username',
		unsetted: 'has been unmarked as violating username'
	},
    goToPage: 'Go to page',
    replies: 'Replies',
    viewDetail: 'View detail',
    verify: 'Verify',
	reason: 'Reason',
    noReason: 'Reason not provided',
    copiedSuccessfully: 'Copied successfully',
    searchUsernameOrUid: 'Search username or UID',
	userNotExists: 'User Not Exists',
	currentChoice: 'Current Choice:',
    none: 'None',
    doNotModify: 'Do not modify',
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete? This cannot be undone!',
    createdAt: 'Created at',
	updatedAt: 'Updated At',
	operations: 'Operations',
	apply: 'Apply',
    setPin: 'Set pin value',
	setPinSuccessfully: 'Successfully set the pin value',
    deleted: 'Deleted',
    selectConversation: 'Select a conversation',
    userNotFound: 'User "{username}" not found',
	upload: 'Upload',
	userSpace: 'User {user}\'s Personal Space',
	new: 'New',
	language: 'Language',
	action: 'Action',
	comment: 'Comment',
	operationSuccessful: 'Operation successful',
	deletedSuccessful: 'Deleted successful',
	appliedSuccessful: 'Applied successful',
	createdSuccessful: 'Created successful',
	savedSuccessful: 'Saved successful',
	sendedSuccessful: 'Sended successful'
};