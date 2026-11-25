import { cn } from "./utils.js";

const variants = {
	default:
		"border border-(--border) bg-(--surface-raised) text-(--text) hover:border-(--accent)",
	outlined:
		"border border-(--border) bg-transparent text-(--text) hover:bg-(--surface-hover)",
	ghost:
		"border border-transparent bg-transparent text-(--text-muted) hover:bg-(--surface-hover)",
};

const sizes = {
	sm: "h-8 px-2.5 text-xs",
	md: "h-10 px-3 text-sm",
	lg: "h-12 px-4 text-base",
};

/**
 * Text input.
 *
 * Renders a plain `<input>` so the browser's own keyboard, autofill and
 * accessibility behaviour applies without any extra wiring.
 *
 * @param {Object} props
 * @param {"default" | "outlined" | "ghost"} [props.variant]
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {React.ComponentProps<"input">} props
 */
export function Input({
	variant = "default",
	size = "md",
	className,
	type = "text",
	...props
}) {
	return (
		<input
			type={type}
			className={cn(
				"w-full rounded-(--radius) transition-colors duration-150",
				"placeholder:text-(--text-muted) focus-visible:outline-none",
				"focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface)",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				variants[variant] ?? variants.default,
				sizes[size] ?? sizes.md,
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Single-line text area.
 *
 * @param {Object} props
 * @param {"default" | "outlined" | "ghost"} [props.variant]
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {React.ComponentProps<"textarea">} props
 */
export function Textarea({
	variant = "default",
	size = "md",
	className,
	rows = 3,
	...props
}) {
	return (
		<textarea
			rows={rows}
			className={cn(
				"w-full resize-y rounded-(--radius) transition-colors duration-150",
				"placeholder:text-(--text-muted) focus-visible:outline-none",
				"focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface)",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				variants[variant] ?? variants.default,
				sizes[size] ?? sizes.md,
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Native select, styled to match the input.
 *
 * A native `<select>` is used rather than a custom listbox on purpose: the
 * platform control comes with keyboard support, a screen reader mode and a
 * mobile picker for free.
 *
 * @param {Object} props
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {React.ComponentProps<"select">} props
 */
export function Select({ size = "md", className, children, ...props }) {
	return (
		<select
			className={cn(
				"w-full cursor-pointer appearance-none rounded-(--radius) transition-colors duration-150",
				"bg-(--surface-raised) pr-8 text-(--text) focus-visible:outline-none",
				"focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface)",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				sizes[size] ?? sizes.md,
				className,
			)}
			{...props}
		>
			{children}
		</select>
	);
}

/**
 * A labelled form field.
 *
 * The label is bound to the control with `htmlFor`, and the control is
 * referenced by id, so clicking the label focuses the field and a screen
 * reader announces the right name.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string} [props.htmlFor]
 * @param {string} [props.hint]
 * @param {string} [props.error]
 * @param {React.ComponentProps<"div">} props
 */
export function Field({ label, htmlFor, hint, error, className, children }) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<label
				htmlFor={htmlFor}
				className="text-xs font-semibold tracking-wide text-(--text-muted) uppercase"
			>
				{label}
			</label>
			{children}
			{hint ? <p className="text-xs text-(--text-muted)">{hint}</p> : null}
			{error ? (
				<p className="text-xs text-(--danger)" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}
