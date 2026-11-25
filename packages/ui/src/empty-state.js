import { cn } from "./utils.js";

/**
 * A placeholder shown when there is nothing to display.
 *
 * @param {Object} props
 * @param {string} props.title - The headline
 * @param {string} [props.description] - One line of context
 * @param {React.ReactNode} [props.action] - A call to action
 * @param {React.ComponentProps<"div">} props
 */
export function EmptyState({
	title,
	description,
	action,
	className,
	children,
	...props
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-2 rounded-(--radius-lg) border border-dashed border-(--border) bg-(--surface-raised) px-6 py-12 text-center",
				className,
			)}
			{...props}
		>
			<p className="text-sm font-semibold text-(--text)">{title}</p>
			{description ? (
				<p className="max-w-sm text-sm text-(--text-muted)">{description}</p>
			) : null}
			{children}
			{action ? <div className="mt-2">{action}</div> : null}
		</div>
	);
}
