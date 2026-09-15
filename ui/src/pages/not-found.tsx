export function NotFoundPage() {
    return (
        <main className="grid min-h-svh place-items-center bg-stone-50 px-6 text-center text-zinc-950">
            <div className="space-y-4">
                <p className="text-sm font-medium text-zinc-500">404</p>
                <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
                <a
                    className="inline-flex text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950"
                    href="/"
                >
                    Go home
                </a>
            </div>
        </main>
    );
}
