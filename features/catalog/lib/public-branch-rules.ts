export type PublicBranch = {
    id: string;
    name: string;
    location: string;
    contactNumber: string | null;
};

export type PublicBranchRecord = PublicBranch & {
    isActive: boolean;
    archivedAt: Date | null;
};

export function filterPublicBranches(branches: readonly PublicBranchRecord[]): PublicBranch[] {
    return branches
        .filter((branch) => branch.isActive && branch.archivedAt === null)
        .map(({ id, name, location, contactNumber }) => ({ id, name, location, contactNumber }));
}