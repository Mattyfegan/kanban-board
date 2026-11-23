import { cn } from "./utils.js";

/**
 * Surface container used for cards, panels and board columns.
 *
 * @param {React.ComponentProps<"div">} props
 */
export function Card({ className, children, ...props }) {
	return (
		<div
			className={cn(
				"rounded-(--radius-lg) border border-(--border) bg-(--surface-raised) shadow-(--shadow-sm)",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

/**
 * @param {React.ComponentProps<"div">} props
 */
export function CardHeader({ className, children, ...props }) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 border-b border-(--border) px-4 py-3",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

/**
 * @param {React.ComponentProps<"h3">} props
 */
export function CardTitle({ className, children, ...props }) {
	return (
		<h3
			className={cn("text-sm font-semibold text-(--text)", className)}
			{...props}
		>
			{children}
		</h3>
	);
}

/**
 * @param {React.ComponentProps<"div">} props
 */
export function CardBody({ className, children, ...props }) {
	return (
		<div
			className={cn("px-4 py-3 text-sm text-(--text-muted)", className)}
			{...props}
		>
			{children}
		</div>
	);
}
