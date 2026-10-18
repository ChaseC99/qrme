import './StarRating.css';

interface Props {
    rating: number;
    size?: number;
    gap?: number;
    filledColor?: string;
    emptyColor?: string;
}

const starPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z';

export default function StarRating({
    rating,
    size = 18,
    gap,
    filledColor = '#f5b400',
    emptyColor = '#e6e1d6',
}: Props) {
    const normalizedRating = Math.min(5, Math.max(0, rating));

    return <span className="star-rating" role="img" aria-label={`${normalizedRating} out of 5 stars`} style={{ gap }}>
        {Array.from({ length: 5 }, (_, index) => {
            const filled = Math.min(1, Math.max(0, normalizedRating - index));

            return <svg key={index} className="rating-star" viewBox="0 0 24 24" width={size} height={size}
                aria-hidden="true" focusable="false">
                <path d={starPath} fill={emptyColor} />
                <path d={starPath} fill={filledColor} style={{ clipPath: `inset(0 ${(1 - filled) * 100}% 0 0)` }} />
            </svg>;
        })}
    </span>;
}
