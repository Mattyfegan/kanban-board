import { cn } from "./utils.js";

/**
 * A modal dialog.
 *
 * Built on the native `<dialog>` element and the `showModal()` API, which
 * brings focus trapping, the backdrop, `Escape` to dismiss and the inert
 * background for free - all of the behaviour WCAG 2.2 asks for, without a
 * dependency.
 *
 * The element is always rendered and controlled imperatively through the
 * `open` prop, so the dialog's state lives in one place.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is showing
 * @param {() => void} [props.onClose] - Called when the dialog asks to close
 * @param {string} [props.title] - Accessible name of the dialog
 * @param {string} [props.description] - Accessible description
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {React.ComponentProps<"dialog">} props
 */
export function Dialog({
	open,
	onClose,
	title,
	description,
	size = "md",
	className,
	children,
	...props
}) {
	// The native element has to exist before showModal() can be called, so
	// the ref is attached and the state applied in an effect.
	return (
		<DialogShell
			open={open}
			onClose={onClose}
			title={title}
			description={description}
			size={size}
			className={className}
			{...props}
		>
			{children}
		</DialogShell>
	);
}

const sizes = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-2xl",
};

/**
 * The imperative half of the dialog.
 *
 * Split out so the ref is available at the point the effect runs.
 */
function DialogShell({
	open,
	onClose,
	title,
	description,
	size = "md",
	className,
	children,
	...props
}) {
	return (
		<dialog
			ref={(node) => {
				if (!node) {
					return;
				}

				if (open && !node.open) {
					node.showModal();
				} else if (!open && node.open) {
					node.close();
				}
			}}
			onClose={onClose}
			onCancel={onClose}
			aria-labelledby={title ? "dialog-title" : undefined}
			aria-describedby={description ? "dialog-description" : undefined}
			className={cn(
				"w-full rounded-(--radius-lg) border border-(--border) bg-(--surface-raised) p-0 text-(--text) shadow-(--shadow-md)",
				"backdrop:bg-black/40 backdrop:backdrop-blur-[1px]",
				"open:flex open:flex-col",
				sizes[size] ?? sizes.md,
				className,
			)}
			{...props}
		>
			<div className="flex items-start justify-between gap-4 border-b border-(--border) px-5 py-4">
				<div className="flex flex-col gap-1">
					{title ? (
						<h2
							id="dialog-title"
							className="text-base font-semibold tracking-tight"
						>
							{title}
						</h2>
					) : null}
					{description ? (
						<p id="dialog-description" className="text-sm text-(--text-muted)">
							{description}
						</p>
					) : null}
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close dialog"
					className={cn(
						"-mr-1 rounded-(--radius) p-1.5 text-(--text-muted) cursor-pointer",
						"hover:bg-(--surface-hover) hover:text-(--text)",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)",
					)}
				>
					<svg
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.75"
						strokeLinecap="round"
						className="size-4"
						aria-hidden="true"
					>
						<path d="M5 5l10 10M15 5L5 15" />
					</svg>
				</button>
			</div>
			<div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
		</dialog>
	);
}
