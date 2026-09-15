export function PasswordVisibilityIcon({ isVisible }: { isVisible: boolean }) {
    if (isVisible) {
        return (
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path
                    d="M3 3l18 18M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6M9.9 4.2A10.2 10.2 0 0 1 12 4c5.5 0 9 5.2 9 8a8.1 8.1 0 0 1-1.8 3.8M6.6 6.7C4.4 8.2 3 10.6 3 12c0 2.8 3.5 8 9 8 1.3 0 2.5-.3 3.5-.8"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                />
            </svg>
        );
    }

    return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path
                d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
            <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
            />
        </svg>
    );
}
