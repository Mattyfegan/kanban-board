"use client";

import { Badge, Button, Dialog, Field, Input, Textarea } from "@kanban/ui";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setBoardArchived, updateBoard } from "@/app/actions/projects";

/**
 * The board settings.
 *
 * One dialog for the three things that change about a board: its name, its
 * description and whether it is archived.
 *
 * The controls are only offered when the current user is an owner. Hiding
 * a control is convenience, not security - the server checks the same
 * thing.
 *
 * @param {Object} props
 * @param {string} props.boardId
 * @param {string} props.name
 * @param {string | null} props.description
 * @param {boolean} props.isArchived
 * @param {boolean} props.canManage
 */
export function BoardSettings({
	boardId,
	name,
	description,
	isArchived,
	canManage,
}) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(null);
	const router = useRouter();

	if (!canManage) {
		return null;
	}

	/**
	 * @param {React.FormEvent<HTMLFormElement>} event
	 */
	function handleSubmit(event) {
		event.preventDefault();

		const form = new FormData(event.currentTarget);
		const nextName = String(form.get("name") ?? "");
		const nextDescription = String(form.get("description") ?? "");

		setError(null);

		startTransition(async () => {
			const result = await updateBoard({
				boardId,
				name: nextName,
				description: nextDescription,
			});

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			setIsOpen(false);
			router.refresh();
		});
	}

	/**
	 * Toggles the archived flag.
	 */
	function handleArchive() {
		setError(null);

		startTransition(async () => {
			const result = await setBoardArchived({
				boardId,
				isArchived: !isArchived,
			});

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			router.refresh();
		});
	}

	return (
		<>
			<Button
				variant="secondary"
				size="sm"
				onClick={() => setIsOpen(true)}
				aria-haspopup="dialog"
			>
				<Pencil className="size-4" aria-hidden="true" />
				Settings
			</Button>

			<Dialog
				open={isOpen}
				onClose={() => setIsOpen(false)}
				title="Board settings"
				description="Rename the board, describe it, or archive it."
			>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Field label="Name" htmlFor="settings-board-name">
						<Input
							id="settings-board-name"
							name="name"
							defaultValue={name}
							required
						/>
					</Field>

					<Field label="Description" htmlFor="settings-board-description">
						<Textarea
							id="settings-board-description"
							name="description"
							defaultValue={description ?? ""}
							placeholder="What is this board for?"
						/>
					</Field>

					{error ? (
						<p className="text-xs text-(--danger)" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex items-center justify-between gap-2">
						<Button
							type="button"
							variant={isArchived ? "secondary" : "danger"}
							size="sm"
							onClick={handleArchive}
							disabled={isPending}
						>
							{isArchived ? (
								<>
									<ArchiveRestore className="size-4" aria-hidden="true" />
									Restore board
								</>
							) : (
								<>
									<Archive className="size-4" aria-hidden="true" />
									Archive board
								</>
							)}
						</Button>

						<div className="flex gap-2">
							<Button
								type="button"
								variant="secondary"
								onClick={() => setIsOpen(false)}
								disabled={isPending}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={isPending}>
								{isPending ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</form>

				{isArchived ? (
					<p className="mt-4 flex items-center gap-2 text-xs text-(--text-muted)">
						<Badge tone="warning">Archived</Badge>
						An archived board stays out of the list until it is restored.
					</p>
				) : null}
			</Dialog>
		</>
	);
}
