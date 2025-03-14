import "./globals.css";
export const metadata = {
	title: "Pixel Drawing",
	description: "Challenge Nextjs by drawing pixels",
};

export default function RootLayout({children}) {
	return (
		<html lang='en'>
			<body>{children}</body>
		</html>
	);
}
