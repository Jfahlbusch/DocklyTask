'use client';

import Link from 'next/link';

export default function AccessDeniedPage() {
	return (
		<div className="p-6 max-w-2xl mx-auto">
			<h1 className="text-2xl font-semibold mb-2">Zugriff verweigert</h1>
			<p className="text-gray-600 mb-6">Dein Benutzer hat keine Berechtigung für diesen Mandanten.</p>
			<Link className="text-blue-600 hover:underline" href="/">Zurück zur Startseite</Link>
		</div>
	);
}


