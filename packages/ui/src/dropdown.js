import { cn } from "./utils.js";

/**
 * A dropdown menu.
 *
 * Built on the native `<details>` element, so the menu opens and closes
 * without any JavaScript state, and `Escape` closes it as the platform
 * expects. The summary is the trigger; the content is the menu.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.trigger - The content of the trigger button
 * @param {string} [props.label] - Accessible name of the menu
 * @param {"left" | "right"} [props.align]
 * @param {React.ComponentProps<"details">} props
 */
export function Dropdown({
	trigger,
	label,
	align = "right",
	className,
	children,
	...props
}) {
	return (
		<details className={cn("group relative", className)} {...props}>
			<summary
				aria-label={label}
				className={cn(
					"flex cursor-pointer list-none items-center gap-1 rounded-(--radius) px-2 py-1 text-sm text-(--text-muted)",
					"hover:bg-(--surface-hover) hover:text-(--text)",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent)",
					"[&::-webkit-details-marker]:hidden",
				)}
			>
				{trigger}
			</summary>
			<div
				className={cn(
					"absolute z-20 mt-1 min-w-44 rounded-(--radius) border border-(--border) bg-(--surface-raised) p-1 shadow-(--shadow-md)",
					align === "right" ? "right-0" : "left-0",
				)}
			>
				{children}
			</div>
		</details>
	);
}

/**
 * An item inside a dropdown menu.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon
 * @param {boolean} [props.danger]
 * @param {React.ComponentProps<"button">} props
 */
export function DropdownItem({
	icon,
	danger = false,
	className,
	children,
	type = "button",
	...props
}) {
	return (
		<button
			type={type}
			className={cn(
				"flex w-full cursor-pointer items-center gap-2 rounded-(--radius-sm, 0.375rem) px-2 py-1.5 text-left text-sm",
				"hover:bg-(--surface-hover) focus-visible:outline-none focus-visible:bg-(--surface-hover)",
				danger ? "text-(--danger) hover:bg-(--danger-soft)" : "text-(--text)",
				className,
			)}
			{...props}
		>
			{icon ? (
				<span className="shrink-0" aria-hidden="true">
					{icon}
				</span>
			) : null}
			{children}
		</button>
	);
}
