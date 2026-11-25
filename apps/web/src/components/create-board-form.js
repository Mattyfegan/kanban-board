"use client";

import { Button, Field, Input, Textarea } from "@kanban/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBoard } from "@/app/actions/projects";

/**
 * The create-board form.
 *
 * @param {Object} props
 * @param {string} props.projectId
 */
export function CreateBoardForm({ projectId }) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(null);
	const router = useRouter();

	if (!isOpen) {
		return (
			<Button onClick={() => setIsOpen(true)}>
				<span aria-hidden="true">+</span>
				New board
			</Button>
		);
	}

	/**
	 * @param {React.FormEvent<HTMLFormElement>} event
	 */
	function handleSubmit(event) {
		event.preventDefault();

		const form = new FormData(event.currentTarget);
		const name = String(form.get("name") ?? "");
		const description = String(form.get("description") ?? "");

		setError(null);

		startTransition(async () => {
			const result = await createBoard({ projectId, name, description });

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			setIsOpen(false);
			router.refresh();
		});
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="w-full max-w-md rounded-(--radius-lg) border border-(--border) bg-(--surface-raised) p-4 shadow-(--shadow-sm)"
		>
			<h2 className="text-sm font-semibold text-(--text)">New board</h2>
			<p className="mt-1 text-xs text-(--text-muted)">
				The board starts with the default columns: Backlog, To Do, In Progress,
				Review and Done.
			</p>

			<div className="mt-3 flex flex-col gap-3">
				<Field label="Name" htmlFor="board-name">
					<Input
						id="board-name"
						name="name"
						required
						autoFocus
						placeholder="Website Redesign"
					/>
				</Field>

				<Field label="Description" htmlFor="board-description">
					<Textarea
						id="board-description"
						name="description"
						placeholder="The marketing site rebuild."
					/>
				</Field>

				{error ? (
					<p className="text-xs text-(--danger)" role="alert">
						{error}
					</p>
				) : null}

				<div className="flex gap-2">
					<Button type="submit" disabled={isPending}>
						{isPending ? "Creating..." : "Create board"}
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={() => setIsOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
				</div>
			</div>
		</form>
	);
}
