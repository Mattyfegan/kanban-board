import "./globals.css";

export const metadata = {
	title: "Kanban Board",
	description:
		"Projects, boards, custom columns, tasks, priorities, due dates, assignments, drag-and-drop and activity history.",
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
	return (
		<html lang="en" data-theme="light">
			<body className="min-h-screen bg-(--surface) text-(--text) antialiased">
				{children}
			</body>
		</html>
	);
}
