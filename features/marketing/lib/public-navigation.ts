function normalizePath(path: string): string {
    const pathname = path.split(/[?#]/, 1)[0] || "/";
    return pathname === "/" ? pathname : pathname.replace(/\/+$/, "") || "/";
}

export function isActiveNavItem(pathname: string, href: string): boolean {
    const currentPath = normalizePath(pathname);
    const targetPath = normalizePath(href);
    if (currentPath === "/" || targetPath === "/") return false;
    if (targetPath === "/membership") return currentPath === targetPath;
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}