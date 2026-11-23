import { cn } from "./utils.js";

const variants = {
	primary:
		"bg-(--accent) text-(--accent-contrast) border border-(--accent) hover:bg-(--accent-hover)",
	secondary:
		"bg-(--surface-raised) text-(--text) border border-(--border) hover:bg-(--surface-hover)",
	ghost:
		"bg-transparent text-(--text-muted) border border-transparent hover:bg-(--surface-hover) hover:text-(--text)",
	danger:
		"bg-(--danger) text-(--danger-contrast) border border-(--danger) hover:bg-(--danger-hover)",
};

const sizes = {
	sm: "h-8 px-3 text-xs",
	md: "h-10 px-4 text-sm",
	lg: "h-12 px-6 text-base",
};

/**
 * Primary interactive control.
 *
 * Renders a plain `<button>`. A `href` turns it into an anchor so navigation
 * stays real HTML rather than a JavaScript handler.
 *
 * @param {Object} props
 * @param {"primary" | "secondary" | "ghost" | "danger"} [props.variant]
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {string} [props.href]
 * @param {React.ComponentProps<"button">} props
 */
export function Button({
	variant = "primary",
	size = "md",
	href,
	className,
	type = "button",
	children,
	...props
}) {
	const classes = cn(
		"inline-flex items-center justify-center gap-2 rounded-(--radius) font-semibold tracking-tight",
		"transition-colors duration-150 cursor-pointer select-none",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--surface)",
		"disabled:opacity-40 disabled:cursor-not-allowed",
		variants[variant] ?? variants.primary,
		sizes[size] ?? sizes.md,
		className,
	);

	if (href) {
		return (
			<a href={href} className={classes} {...props}>
				{children}
			</a>
		);
	}

	return (
		<button type={type} className={classes} {...props}>
			{children}
		</button>
	);
}
