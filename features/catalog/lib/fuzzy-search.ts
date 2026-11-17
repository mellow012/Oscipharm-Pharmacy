export type CatalogSearchFields = {
    brandName: string;
    ingredientName?: string | null;
    strength?: string | null;
    form?: string | null;
    packLabel?: string | null;
};

function normalize(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[\p{P}\p{S}]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function damerauLevenshtein(left: string, right: string) {
    const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
    for (let row = 0; row <= left.length; row += 1) matrix[row][0] = row;
    for (let column = 0; column <= right.length; column += 1) matrix[0][column] = column;

    for (let row = 1; row <= left.length; row += 1) {
        for (let column = 1; column <= right.length; column += 1) {
            const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
            matrix[row][column] = Math.min(
                matrix[row - 1][column] + 1,
                matrix[row][column - 1] + 1,
                matrix[row - 1][column - 1] + substitutionCost,
            );

            if (
                row > 1
                && column > 1
                && left[row - 1] === right[column - 2]
                && left[row - 2] === right[column - 1]
            ) {
                matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + 1);
            }
        }
    }

    return matrix[left.length][right.length];
}

function tokenMatchRank(queryToken: string, fieldTokens: string[]) {
    if (fieldTokens.some((token) => token === queryToken)) return 0;
    if (fieldTokens.some((token) => token.startsWith(queryToken))) return 1;
    if (fieldTokens.some((token) => token.includes(queryToken))) return 2;

    const maxDistance = queryToken.length <= 3 ? 0 : queryToken.length <= 6 ? 1 : 2;
    if (maxDistance === 0) return null;
    return fieldTokens.some((token) => damerauLevenshtein(queryToken, token) <= maxDistance) ? 3 : null;
}

function getSearchRank(product: CatalogSearchFields, queryTokens: string[]) {
    const fieldTokens = [
        product.brandName,
        product.ingredientName,
        product.strength,
        product.form,
        product.packLabel,
    ]
        .filter((field): field is string => Boolean(field))
        .flatMap((field) => normalize(field).split(" ").filter(Boolean));

    const tokenRanks = queryTokens.map((token) => tokenMatchRank(token, fieldTokens));
    if (tokenRanks.some((rank) => rank === null)) return null;
    return tokenRanks.reduce<number>((total, rank) => total + (rank ?? 0), 0);
}

export function searchCatalogProducts<T extends CatalogSearchFields>(products: T[], query: string): T[] {
    const queryTokens = normalize(query).split(" ").filter(Boolean);
    if (!queryTokens.length) return [...products];

    return products
        .map((product) => ({ product, rank: getSearchRank(product, queryTokens) }))
        .filter((entry): entry is { product: T; rank: number } => entry.rank !== null)
        .sort((left, right) => left.rank - right.rank || left.product.brandName.localeCompare(right.product.brandName))
        .map(({ product }) => product);
}