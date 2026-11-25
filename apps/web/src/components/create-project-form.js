"use client";

import { Button, Field, Input, Textarea } from "@kanban/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProject } from "@/app/actions/projects";

/**
 * The create-project form.
 *
 * A client component because it holds the field state and reports the
 * result. The action it calls is a server action, so the write goes
 * through the same validation and permission checks as everything else.
 */
export function CreateProjectForm() {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(null);
	const router = useRouter();

	if (!isOpen) {
		return (
			<Button onClick={() => setIsOpen(true)}>
				<span aria-hidden="true">+</span>
				New project
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
			const result = await createProject({ name, description });

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			setIsOpen(false);
			router.push(`/projects/${result.data.id}`);
			router.refresh();
		});
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="w-full max-w-md rounded-(--radius-lg) border border-(--border) bg-(--surface-raised) p-4 shadow-(--shadow-sm)"
		>
			<h2 className="text-sm font-semibold text-(--text)">New project</h2>

			<div className="mt-3 flex flex-col gap-3">
				<Field label="Name" htmlFor="project-name">
					<Input
						id="project-name"
						name="name"
						required
						autoFocus
						placeholder="Atlas Redesign"
					/>
				</Field>

				<Field
					label="Description"
					htmlFor="project-description"
					hint="Optional. What is this project for?"
				>
					<Textarea
						id="project-description"
						name="description"
						placeholder="Ground-up redesign of the marketing site."
					/>
				</Field>

				{error ? (
					<p className="text-xs text-(--danger)" role="alert">
						{error}
					</p>
				) : null}

				<div className="flex gap-2">
					<Button type="submit" disabled={isPending}>
						{isPending ? "Creating..." : "Create project"}
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
