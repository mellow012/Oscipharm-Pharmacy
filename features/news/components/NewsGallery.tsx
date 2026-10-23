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
        <div className="mt-6 grid gap-4">
            {[...images].sort((left, right) => left.sortOrder - right.sortOrder).map((image) => (
                <figure key={image.id}>
                    <img
                        src={image.url}
                        alt={image.altText ?? title}
                        loading="lazy"
                        decoding="async"
                        className="w-full rounded object-cover"
                    />
                    {image.caption ? <figcaption className="mt-2 text-sm text-muted">{image.caption}</figcaption> : null}
                </figure>
            ))}
        </div>
    );
}