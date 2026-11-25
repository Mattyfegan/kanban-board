"use client";

import { COLUMN_COLORS } from "@kanban/config";
import { Button, Dialog, Field, Input, Select } from "@kanban/ui";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	createColumn,
	deleteColumn,
	moveColumn,
	updateColumn,
} from "@/app/actions/columns";

/**
 * The column header.
 *
 * Owns everything about a column that is not a task: the name, the colour,
 * the work-in-progress limit, the "done" flag, the position on the board
 * and the delete.
 *
 * The delete always asks where the tasks should go. The database refuses
 * to delete a column that still holds tasks, and the app will not lose a
 * task to save a click - so the reassignment target is mandatory.
 *
 * @param {Object} props
 * @param {string} props.boardId
 * @param {string} props.columnId
 * @param {string} props.name
 * @param {string | null} props.color
 * @param {number | null} props.wipLimit
 * @param {boolean} props.isDone
 * @param {number} props.taskCount
 * @param {number} props.position - Zero-based position on the board
 * @param {number} props.columnCount - How many columns the board has
 * @param {Array<{ id: string, name: string }>} props.siblings - The other
 *   columns, used as the reassignment target
 * @param {boolean} props.canEdit
 */
export function ColumnHeader({
	columnId,
	name,
	color,
	wipLimit,
	isDone,
	taskCount,
	position,
	columnCount,
	siblings,
	canEdit,
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(null);
	const router = useRouter();

	const overLimit = wipLimit !== null && taskCount > wipLimit;

	/**
	 * @param {React.FormEvent<HTMLFormElement>} event
	 */
	function handleEdit(event) {
		event.preventDefault();

		const form = new FormData(event.currentTarget);
		const nextName = String(form.get("name") ?? "");
		const nextColor = String(form.get("color") ?? "");
		const rawLimit = String(form.get("wipLimit") ?? "").trim();
		const nextDone = form.get("isDone") === "on";

		setError(null);

		startTransition(async () => {
			const result = await updateColumn({
				columnId,
				name: nextName,
				color: nextColor || null,
				wipLimit: rawLimit === "" ? null : Number(rawLimit),
				isDone: nextDone,
			});

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			setIsEditing(false);
			router.refresh();
		});
	}

	/**
	 * @param {React.FormEvent<HTMLFormElement>} event
	 */
	function handleDelete(event) {
		event.preventDefault();

		const form = new FormData(event.currentTarget);
		const reassignTo = String(form.get("reassignTo") ?? "");

		setError(null);

		startTransition(async () => {
			const result = await deleteColumn({
				columnId,
				reassignToColumnId: reassignTo,
			});

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			setIsDeleting(false);
			router.refresh();
		});
	}

	/**
	 * @param {"left" | "right"} direction
	 */
	function handleMove(direction) {
		startTransition(async () => {
			const result = await moveColumn({ columnId, direction });

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<span
					aria-hidden="true"
					className="size-2.5 shrink-0 rounded-full"
					style={color ? { backgroundColor: color } : undefined}
				/>

				<h2 className="truncate text-sm font-semibold text-(--text)">{name}</h2>

				<span className="text-xs text-(--text-muted)">{taskCount}</span>

				{isDone ? (
					<span className="rounded-full bg-(--success-soft) px-1.5 py-0.5 text-[10px] font-semibold text-(--success)">
						Done
					</span>
				) : null}

				{overLimit ? (
					<span
						className="rounded-full bg-(--danger-soft) px-1.5 py-0.5 text-[10px] font-semibold text-(--danger)"
						title={`Over the work-in-progress limit of ${wipLimit}`}
					>
						WIP {taskCount}/{wipLimit}
					</span>
				) : wipLimit !== null ? (
					<span
						className="text-[10px] text-(--text-muted)"
						title={`Work-in-progress limit of ${wipLimit}`}
					>
						WIP {taskCount}/{wipLimit}
					</span>
				) : null}

				{canEdit ? (
					<div className="ml-auto flex items-center gap-0.5">
						<button
							type="button"
							onClick={() => handleMove("left")}
							disabled={isPending || position === 0}
							aria-label={`Move ${name} left`}
							className="rounded-(--radius) p-1 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) disabled:opacity-30 disabled:hover:bg-transparent"
						>
							<ChevronLeft className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => handleMove("right")}
							disabled={isPending || position === columnCount - 1}
							aria-label={`Move ${name} right`}
							className="rounded-(--radius) p-1 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) disabled:opacity-30 disabled:hover:bg-transparent"
						>
							<ChevronRight className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => setIsEditing(true)}
							aria-label={`Edit ${name}`}
							aria-haspopup="dialog"
							className="rounded-(--radius) p-1 text-(--text-muted) hover:bg-(--surface-hover) hover:text-(--text) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
						>
							<Pencil className="size-4" aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => setIsDeleting(true)}
							aria-label={`Delete ${name}`}
							aria-haspopup="dialog"
							className="rounded-(--radius) p-1 text-(--text-muted) hover:bg-(--danger-soft) hover:text-(--danger) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)"
						>
							<Trash2 className="size-4" aria-hidden="true" />
						</button>
					</div>
				) : null}
			</div>

			{error && !isEditing && !isDeleting ? (
				<p className="text-xs text-(--danger)" role="alert">
					{error}
				</p>
			) : null}

			<Dialog
				open={isEditing}
				onClose={() => setIsEditing(false)}
				title={`Edit ${name}`}
				description="Rename the column, recolour it, or set how much work it should hold."
			>
				<form onSubmit={handleEdit} className="flex flex-col gap-4">
					<Field label="Name" htmlFor={`column-name-${columnId}`}>
						<Input
							id={`column-name-${columnId}`}
							name="name"
							defaultValue={name}
							required
							autoFocus
						/>
					</Field>

					<Field label="Colour" htmlFor={`column-color-${columnId}`}>
						<Select
							id={`column-color-${columnId}`}
							name="color"
							defaultValue={color ?? ""}
						>
							<option value="">No colour</option>
							{COLUMN_COLORS.map((entry) => (
								<option key={entry.value} value={entry.value}>
									{entry.label}
								</option>
							))}
						</Select>
					</Field>

					<Field
						label="Work-in-progress limit"
						htmlFor={`column-wip-${columnId}`}
						hint="Leave empty for no limit. The header warns when the column holds more than this."
					>
						<Input
							id={`column-wip-${columnId}`}
							name="wipLimit"
							type="number"
							min="1"
							max="999"
							defaultValue={wipLimit ?? ""}
							placeholder="No limit"
						/>
					</Field>

					<label className="flex items-center gap-2 text-sm text-(--text)">
						<input
							type="checkbox"
							name="isDone"
							defaultChecked={isDone}
							className="size-4 accent-(--accent)"
						/>
						This is the column completed work lands in
					</label>

					{error ? (
						<p className="text-xs text-(--danger)" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsEditing(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save"}
						</Button>
					</div>
				</form>
			</Dialog>

			<Dialog
				open={isDeleting}
				onClose={() => setIsDeleting(false)}
				title={`Delete ${name}`}
				description="The tasks in this column are moved somewhere else. Nothing is thrown away."
				size="lg"
			>
				<form onSubmit={handleDelete} className="flex flex-col gap-4">
					<p className="text-sm text-(--text-muted)">
						{taskCount === 0
							? "This column is empty, so there is nothing to move."
							: `This column holds ${taskCount} task${taskCount === 1 ? "" : "s"}. Choose the column they should move to.`}
					</p>

					<Field
						label="Move the tasks to"
						htmlFor={`column-reassign-${columnId}`}
					>
						<Select
							id={`column-reassign-${columnId}`}
							name="reassignTo"
							required
							defaultValue=""
						>
							<option value="" disabled>
								Choose a column
							</option>
							{siblings.map((sibling) => (
								<option key={sibling.id} value={sibling.id}>
									{sibling.name}
								</option>
							))}
						</Select>
					</Field>

					{error ? (
						<p className="text-xs text-(--danger)" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsDeleting(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" variant="danger" disabled={isPending}>
							{isPending ? "Deleting..." : "Delete column"}
						</Button>
					</div>
				</form>
			</Dialog>
		</div>
	);
}

/**
 * The "add a column" button.
 *
 * @param {Object} props
 * @param {string} props.boardId
 * @param {boolean} props.canEdit
 */
export function AddColumnButton({ boardId, canEdit }) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState(null);
	const router = useRouter();

	if (!canEdit) {
		return null;
	}

	/**
	 * @param {React.FormEvent<HTMLFormElement>} event
	 */
	function handleSubmit(event) {
		event.preventDefault();

		const form = new FormData(event.currentTarget);
		const name = String(form.get("name") ?? "");
		const color = String(form.get("color") ?? "");
		const rawLimit = String(form.get("wipLimit") ?? "").trim();

		setError(null);

		startTransition(async () => {
			const result = await createColumn({
				boardId,
				name,
				color: color || null,
				wipLimit: rawLimit === "" ? null : Number(rawLimit),
				isDone: false,
			});

			if (!result.ok) {
				setError(result.error.message);
				return;
			}

			setIsOpen(false);
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
				<Plus className="size-4" aria-hidden="true" />
				Add column
			</Button>

			<Dialog
				open={isOpen}
				onClose={() => setIsOpen(false)}
				title="Add a column"
				description="Columns are the stages of work. Give it a name and a colour."
			>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<Field label="Name" htmlFor="new-column-name">
						<Input
							id="new-column-name"
							name="name"
							required
							autoFocus
							placeholder="Blocked"
						/>
					</Field>

					<Field label="Colour" htmlFor="new-column-color">
						<Select id="new-column-color" name="color" defaultValue="">
							<option value="">No colour</option>
							{COLUMN_COLORS.map((entry) => (
								<option key={entry.value} value={entry.value}>
									{entry.label}
								</option>
							))}
						</Select>
					</Field>

					<Field
						label="Work-in-progress limit"
						htmlFor="new-column-wip"
						hint="Optional. Leave empty for no limit."
					>
						<Input
							id="new-column-wip"
							name="wipLimit"
							type="number"
							min="1"
							max="999"
							placeholder="No limit"
						/>
					</Field>

					{error ? (
						<p className="text-xs text-(--danger)" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="secondary"
							onClick={() => setIsOpen(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Adding..." : "Add column"}
						</Button>
					</div>
				</form>
			</Dialog>
		</>
	);
}
