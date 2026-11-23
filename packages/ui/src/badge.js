import { cn } from "./utils.js";

const tones = {
	neutral: "bg-(--surface-raised) text-(--text-muted) border-(--border)",
	info: "bg-(--info-soft) text-(--info) border-(--info-border)",
	success: "bg-(--success-soft) text-(--success) border-(--success-border)",
	warning: "bg-(--warning-soft) text-(--warning) border-(--warning-border)",
	danger: "bg-(--danger-soft) text-(--danger) border-(--danger-border)",
};

/**
 * Small status label.
 *
 * @param {Object} props
 * @param {"neutral" | "info" | "success" | "warning" | "danger"} [props.tone]
 * @param {React.ComponentProps<"span">} props
 */
export function Badge({ tone = "neutral", className, children, ...props }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
				tones[tone] ?? tones.neutral,
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}
