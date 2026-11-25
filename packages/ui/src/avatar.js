import { cn } from "./utils.js";

/**
 * A user's initials in a coloured circle.
 *
 * The colour comes from the user's `avatarColor`, so the same person is the
 * same colour everywhere in the app.
 *
 * @param {Object} props
 * @param {string} props.name - Used to derive the initials
 * @param {string} [props.color] - Background colour
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {string} [props.title] - Tooltip text; the initials are also read
 *   out as the name
 * @param {React.ComponentProps<"span">} props
 */
export function Avatar({
	name,
	color,
	size = "md",
	className,
	title,
	...props
}) {
	const initials = initialsFor(name);

	const sizes = {
		sm: "size-6 text-[10px]",
		md: "size-8 text-xs",
		lg: "size-10 text-sm",
	};

	return (
		<span
			title={title ?? name}
			aria-label={name}
			role="img"
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
				sizes[size] ?? sizes.md,
				className,
			)}
			style={color ? { backgroundColor: color } : undefined}
			{...props}
		>
			{initials}
		</span>
	);
}

/**
 * The initials for a name: the first letter of the first two words.
 *
 * @param {string} name
 * @returns {string}
 */
export function initialsFor(name) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}
