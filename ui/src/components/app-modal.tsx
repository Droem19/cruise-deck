import { type ReactNode, useEffect, useId, useRef } from 'react';

type AppModalProps = {
    title: string;
    description?: string;
    showCloseButton?: boolean;
    children: ReactNode;
    onClose: () => void;
};

export function AppModal({ title, description, showCloseButton = true, children, onClose }: AppModalProps) {
    const titleId = useId();
    const descriptionId = useId();
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLElement>(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

        document.body.style.overflow = 'hidden';
        (closeButtonRef.current ?? dialogRef.current)?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCloseRef.current();
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
            previousActiveElement?.focus();
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
            <button
                className="absolute inset-0 cursor-default"
                type="button"
                aria-label="Close modal"
                onClick={onClose}
            />
            <section
                className="relative flex max-h-[calc(100svh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl"
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
            >
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-semibold text-zinc-950" id={titleId}>
                            {title}
                        </h2>
                        {description ? (
                            <p className="mt-1 text-sm leading-6 text-zinc-500" id={descriptionId}>
                                {description}
                            </p>
                        ) : null}
                    </div>
                    {showCloseButton ? (
                        <button
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-4 focus:ring-[#45AEFC]/25"
                            type="button"
                            aria-label="Close modal"
                            ref={closeButtonRef}
                            onClick={onClose}
                        >
                            X
                        </button>
                    ) : null}
                </div>

                <div className="overflow-y-auto px-6 py-5">{children}</div>
            </section>
        </div>
    );
}
