import Link from "next/link";

type GalleryImage = {
    id: string;
    url: string;
    altText: string | null;
    caption?: string | null;
    sortOrder: number;
};

export function NewsGallery({ images, title }: { images: GalleryImage[]; title: string }) {
    if (!images.length) return null;

    return (
        <div className="mx-auto mt-6 grid max-w-4xl gap-5">
            {[...images].sort((left, right) => left.sortOrder - right.sortOrder).map((image) => (
                <figure key={image.id} className="overflow-hidden border border-outline-variant bg-surface-container-low">
                    <Link href={image.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${image.caption || title} image in a new tab`} className="block p-3 sm:p-5">
                        <img
                            src={image.url}
                            alt={image.altText ?? title}
                            loading="lazy"
                            decoding="async"
                            className="mx-auto block h-auto max-h-[80vh] w-auto max-w-full object-contain"
                        />
                    </Link>
                    {image.caption ? <figcaption className="border-t border-outline-variant px-4 py-3 text-body-sm text-on-surface-variant">{image.caption}</figcaption> : null}
                </figure>
            ))}
        </div>
    );
}