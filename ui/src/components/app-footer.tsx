const currentYear = new Date().getFullYear();

export function AppFooter() {
    return (
        <footer className="border-t border-zinc-200 bg-white">
            <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center px-4 text-sm font-medium text-zinc-500 sm:px-6">
                <p>&copy; {currentYear} Cruise Deck</p>
            </div>
        </footer>
    );
}
