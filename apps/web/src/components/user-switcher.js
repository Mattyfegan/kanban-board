"use client";

import { Avatar } from "@kanban/ui";
import { useTransition } from "react";
import { switchUser } from "@/app/actions/identity";

/**
 * The dev user switcher.
 *
 * There is no login, so this is how the app changes who it is acting as.
 * Switching swaps the `kb_user_id` cookie on the server and the whole
 * shell re-renders with the new user's permissions - which is what lets
 * the permission matrix be exercised by hand.
 *
 * The list of users is rendered by the server and passed in, so the client
 * component only handles the click.
 *
 * @param {Object} props
 * @param {Array<{ id: string, name: string, email: string, avatarColor: string }>} props.users
 * @param {string} props.currentUserId
 */
export function UserSwitcher({ users, currentUserId }) {
	const [isPending, startTransition] = useTransition();

	const current = users.find((user) => user.id === currentUserId) ?? users[0];

	if (!current) {
		return null;
	}

	/**
	 * @param {string} userId
	 */
	function handleChange(userId) {
		if (userId === currentUserId) {
			return;
		}

		startTransition(async () => {
			await switchUser({ userId });
		});
	}

	return (
		<div className="flex items-center gap-2">
			<label
				htmlFor="kb-user-switcher"
				className="sr-only text-xs font-semibold tracking-wide text-(--text-muted) uppercase"
			>
				Acting as
			</label>
			<div className="relative flex items-center">
				<Avatar
					name={current.name}
					color={current.avatarColor}
					size="sm"
					className="pointer-events-none absolute left-2"
				/>
				<select
					id="kb-user-switcher"
					value={current.id}
					disabled={isPending}
					onChange={(event) => handleChange(event.target.value)}
					className="h-9 cursor-pointer rounded-full border border-(--border) bg-(--surface-raised) pr-3 pl-9 text-sm text-(--text) transition-colors hover:bg-(--surface-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) disabled:opacity-60"
				>
					{users.map((user) => (
						<option key={user.id} value={user.id}>
							{user.name}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
