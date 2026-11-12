export default function Loading() {
    return (
        <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden">
            <span aria-hidden="true" className="route-loading-progress block h-full w-full bg-primary" />
            <span className="sr-only">Loading</span>
        </div>
    );
}
