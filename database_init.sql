PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE users (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT NOT NULL,
					password TEXT NOT NULL,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				, email TEXT, email_verify_code INT, email_verify_time TIMESTAMP, username_violation INTEGER NOT NULL DEFAULT 0, permission BIGINT NOT NULL DEFAULT 3, checkin_date TIMESTAMP, checkin_count INTEGER, checkin_today_status INTEGER, checkin_today_good1 INTEGER, checkin_today_good2 INTEGER, checkin_today_bad1 INTEGER, checkin_today_bad2 INTEGER, name_color_light TEXT NOT NULL DEFAULT "0066cc", name_color_dark TEXT NOT NULL DEFAULT "66b2ff");
CREATE TABLE feed (
			id INTEGER PRIMARY KEY,
			parent_id INTEGER,
			uid INTEGER NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		, deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)));
INSERT INTO "feed" ("id","parent_id","uid","content","created_at","deleted") VALUES(0,0,0,'','0000-01-01 00:00:00',0);
CREATE TABLE notification (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uid INTEGER NOT NULL,
		type TEXT NOT NULL,
		read INTEGER NOT NULL DEFAULT 0,
		payload TEXT,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(uid) REFERENCES users(id)
	);
CREATE TABLE discussion (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uid INTEGER NOT NULL,
		category TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, pin INTEGER NOT NULL DEFAULT 0,
		FOREIGN KEY (uid) REFERENCES users(id)
	);
CREATE TABLE discussion_reply (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		discussion_id INTEGER NOT NULL,
		parent_id INTEGER,
		uid INTEGER NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (discussion_id) REFERENCES discussion(id),
		FOREIGN KEY (uid) REFERENCES users(id)
	);
CREATE TABLE ticket (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uid INTEGER NOT NULL,
		assignee_uid INTEGER,
		category TEXT NOT NULL,
		status TEXT NOT NULL DEFAULT "new",
		title TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (uid) REFERENCES users(id)
	);
CREATE TABLE ticket_reply (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ticket_id INTEGER NOT NULL,
		parent_id INTEGER,
		uid INTEGER NOT NULL,
		content TEXT,
		set_status TEXT,
		set_assignee NUMBER,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (ticket_id) REFERENCES ticket(id),
		FOREIGN KEY (uid) REFERENCES users(id)
	);
CREATE TABLE checkin_texts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title_en TEXT, good_en TEXT, bad_en TEXT,
		title_zh TEXT, good_zh TEXT, bad_zh TEXT
	);
CREATE TABLE IF NOT EXISTS private_messages (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		sender INTEGER NOT NULL,
		receiver INTEGER NOT NULL,
		content TEXT NOT NULL,
		read INTEGER NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (sender) REFERENCES users (id),
		FOREIGN KEY (receiver) REFERENCES users (id)
	);
CREATE INDEX idx_ticket_created_at ON ticket(created_at DESC);
CREATE INDEX idx_ticket_uid_created_at ON ticket(uid, created_at DESC);
CREATE INDEX idx_ticket_category_created_at ON ticket(category, created_at DESC);
CREATE INDEX idx_ticket_uid_category_created_at ON ticket(uid, category, created_at DESC);
CREATE INDEX idx_discussion_pin_created_at ON discussion(pin DESC, created_at DESC);
CREATE INDEX idx_discussion_uid_pin_created_at ON discussion(uid, pin DESC, created_at DESC);
CREATE INDEX idx_discussion_category_pin_created_at ON discussion(category, pin DESC, created_at DESC);
CREATE INDEX idx_discussion_uid_category_pin_created_at ON discussion(uid, category, pin DESC, created_at DESC);
CREATE INDEX idx_ticket_status_created_at ON ticket(status, created_at DESC);
CREATE INDEX idx_ticket_status_uid_created_at ON ticket(status, uid, created_at DESC);
CREATE INDEX idx_ticket_status_category_created_at ON ticket(status, category, created_at DESC);
CREATE INDEX idx_ticket_status_uid_category_created_at ON ticket(status, uid, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_receiver_created_at ON private_messages (sender, receiver, created_at DESC);