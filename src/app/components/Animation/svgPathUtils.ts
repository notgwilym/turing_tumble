/**
 * svgPathUtils.ts
 *
 * Parses SVG path `d` strings, extracts start/end points,
 * and applies affine transforms (translate + scale) to
 * pin start/end to calculated positions.
 */

export interface PathPoint {
    x: number;
    y: number;
}

interface PathCommand {
    command: string; // M, L, C, Q, S, T, A, H, V, Z (uppercase = absolute)
    args: number[];
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

const CMD_RE = /([MmLlHhVvCcSsQqTtAaZz])/;

/** Parse an SVG path d string into a list of commands with numeric args */
export function parsePath(d: string): PathCommand[] {
    const tokens = d.trim().split(CMD_RE).filter(s => s.length > 0);
    const commands: PathCommand[] = [];

    let i = 0;
    while (i < tokens.length) {
        const cmd = tokens[i];
        if (/[A-Za-z]/.test(cmd) && cmd.length === 1) {
            i++;
            const argStr = (i < tokens.length && !/^[A-Za-z]$/.test(tokens[i]))
                ? tokens[i++]
                : '';
            const args = argStr
                .trim()
                .replace(/,/g, ' ')
                .replace(/-/g, ' -')
                .split(/\s+/)
                .filter(s => s.length > 0)
                .map(Number)
                .filter(n => !isNaN(n));
            commands.push({ command: cmd, args });
        } else {
            i++;
        }
    }
    return commands;
}

/** Serialize commands back to a d string */
export function serializePath(commands: PathCommand[]): string {
    return commands.map(c => {
        if (c.command === 'Z' || c.command === 'z') return c.command;
        return c.command + ' ' + c.args.join(' ');
    }).join(' ');
}

// ─── Endpoint Extraction ─────────────────────────────────────────────────────

/** Get the starting point of a path (first M command) */
export function getPathStart(commands: PathCommand[]): PathPoint | null {
    for (const c of commands) {
        if (c.command === 'M' && c.args.length >= 2) {
            return { x: c.args[0], y: c.args[1] };
        }
        if (c.command === 'm' && c.args.length >= 2) {
            return { x: c.args[0], y: c.args[1] };
        }
    }
    return null;
}

/**
 * Get the endpoint of a path by walking through all commands
 * and tracking the current point.
 */
export function getPathEnd(commands: PathCommand[]): PathPoint | null {
    let cx = 0, cy = 0; // current point
    let startX = 0, startY = 0; // for Z command

    for (const { command: cmd, args } of commands) {
        switch (cmd) {
            case 'M':
                if (args.length >= 2) { cx = args[0]; cy = args[1]; startX = cx; startY = cy; }
                // Subsequent pairs are implicit L
                for (let i = 2; i + 1 < args.length; i += 2) { cx = args[i]; cy = args[i + 1]; }
                break;
            case 'm':
                if (args.length >= 2) { cx += args[0]; cy += args[1]; startX = cx; startY = cy; }
                for (let i = 2; i + 1 < args.length; i += 2) { cx += args[i]; cy += args[i + 1]; }
                break;
            case 'L':
                for (let i = 0; i + 1 < args.length; i += 2) { cx = args[i]; cy = args[i + 1]; }
                break;
            case 'l':
                for (let i = 0; i + 1 < args.length; i += 2) { cx += args[i]; cy += args[i + 1]; }
                break;
            case 'H': if (args.length >= 1) cx = args[args.length - 1]; break;
            case 'h': if (args.length >= 1) cx += args[args.length - 1]; break;
            case 'V': if (args.length >= 1) cy = args[args.length - 1]; break;
            case 'v': if (args.length >= 1) cy += args[args.length - 1]; break;
            case 'C':
                // x1 y1 x2 y2 x y — endpoint is last pair
                for (let i = 0; i + 5 < args.length; i += 6) { cx = args[i + 4]; cy = args[i + 5]; }
                break;
            case 'c':
                for (let i = 0; i + 5 < args.length; i += 6) { cx += args[i + 4]; cy += args[i + 5]; }
                break;
            case 'S':
                for (let i = 0; i + 3 < args.length; i += 4) { cx = args[i + 2]; cy = args[i + 3]; }
                break;
            case 's':
                for (let i = 0; i + 3 < args.length; i += 4) { cx += args[i + 2]; cy += args[i + 3]; }
                break;
            case 'Q':
                for (let i = 0; i + 3 < args.length; i += 4) { cx = args[i + 2]; cy = args[i + 3]; }
                break;
            case 'q':
                for (let i = 0; i + 3 < args.length; i += 4) { cx += args[i + 2]; cy += args[i + 3]; }
                break;
            case 'T':
                for (let i = 0; i + 1 < args.length; i += 2) { cx = args[i]; cy = args[i + 1]; }
                break;
            case 't':
                for (let i = 0; i + 1 < args.length; i += 2) { cx += args[i]; cy += args[i + 1]; }
                break;
            case 'A':
                // rx ry rotation large-arc sweep x y — 7 args per arc
                for (let i = 0; i + 6 < args.length; i += 7) { cx = args[i + 5]; cy = args[i + 6]; }
                break;
            case 'a':
                for (let i = 0; i + 6 < args.length; i += 7) { cx += args[i + 5]; cy += args[i + 6]; }
                break;
            case 'Z':
            case 'z':
                cx = startX; cy = startY;
                break;
        }
    }
    return { x: cx, y: cy };
}

// ─── Transform ───────────────────────────────────────────────────────────────

/**
 * Convert all relative commands to absolute so we can apply transforms uniformly.
 */
export function toAbsolute(commands: PathCommand[]): PathCommand[] {
    const result: PathCommand[] = [];
    let cx = 0, cy = 0;
    let startX = 0, startY = 0;

    for (const { command: cmd, args } of commands) {
        const isRel = cmd === cmd.toLowerCase() && cmd !== 'z' && cmd !== 'Z';
        const absCmd = cmd.toUpperCase();

        if (absCmd === 'Z') {
            result.push({ command: 'Z', args: [] });
            cx = startX; cy = startY;
            continue;
        }

        const newArgs = [...args];

        switch (absCmd) {
            case 'M':
                if (isRel && newArgs.length >= 2) { newArgs[0] += cx; newArgs[1] += cy; }
                if (newArgs.length >= 2) { cx = newArgs[0]; cy = newArgs[1]; startX = cx; startY = cy; }
                for (let i = 2; i + 1 < newArgs.length; i += 2) {
                    if (isRel) { newArgs[i] += cx; newArgs[i + 1] += cy; }
                    cx = newArgs[i]; cy = newArgs[i + 1];
                }
                break;
            case 'L':
                for (let i = 0; i + 1 < newArgs.length; i += 2) {
                    if (isRel) { newArgs[i] += cx; newArgs[i + 1] += cy; }
                    cx = newArgs[i]; cy = newArgs[i + 1];
                }
                break;
            case 'H':
                if (isRel) newArgs[0] += cx;
                cx = newArgs[0];
                break;
            case 'V':
                if (isRel) newArgs[0] += cy;
                cy = newArgs[0];
                break;
            case 'C':
                for (let i = 0; i + 5 < newArgs.length; i += 6) {
                    if (isRel) {
                        newArgs[i] += cx; newArgs[i + 1] += cy;
                        newArgs[i + 2] += cx; newArgs[i + 3] += cy;
                        newArgs[i + 4] += cx; newArgs[i + 5] += cy;
                    }
                    cx = newArgs[i + 4]; cy = newArgs[i + 5];
                }
                break;
            case 'S':
                for (let i = 0; i + 3 < newArgs.length; i += 4) {
                    if (isRel) {
                        newArgs[i] += cx; newArgs[i + 1] += cy;
                        newArgs[i + 2] += cx; newArgs[i + 3] += cy;
                    }
                    cx = newArgs[i + 2]; cy = newArgs[i + 3];
                }
                break;
            case 'Q':
                for (let i = 0; i + 3 < newArgs.length; i += 4) {
                    if (isRel) {
                        newArgs[i] += cx; newArgs[i + 1] += cy;
                        newArgs[i + 2] += cx; newArgs[i + 3] += cy;
                    }
                    cx = newArgs[i + 2]; cy = newArgs[i + 3];
                }
                break;
            case 'T':
                for (let i = 0; i + 1 < newArgs.length; i += 2) {
                    if (isRel) { newArgs[i] += cx; newArgs[i + 1] += cy; }
                    cx = newArgs[i]; cy = newArgs[i + 1];
                }
                break;
            case 'A':
                for (let i = 0; i + 6 < newArgs.length; i += 7) {
                    if (isRel) {
                        newArgs[i + 5] += cx; newArgs[i + 6] += cy;
                    }
                    cx = newArgs[i + 5]; cy = newArgs[i + 6];
                }
                break;
        }

        result.push({ command: absCmd, args: newArgs });
    }
    return result;
}

/**
 * Apply scale + translate to all coordinate values in an absolute path.
 * Transform is: newPoint = (oldPoint - origin) * scale + target
 *
 * This pins the path's start to `targetStart` and stretches so its
 * end lands on `targetEnd`.
 */
export function transformPathToEndpoints(
    commands: PathCommand[],
    targetStart: PathPoint,
    targetEnd: PathPoint
): PathCommand[] {
    const absCommands = toAbsolute(commands);
    const start = getPathStart(absCommands);
    const end = getPathEnd(absCommands);
    if (!start || !end) return absCommands;

    const authoredDx = end.x - start.x;
    const authoredDy = end.y - start.y;
    const targetDx = targetEnd.x - targetStart.x;
    const targetDy = targetEnd.y - targetStart.y;

    // Scale factors (handle zero-length gracefully)
    const sx = Math.abs(authoredDx) > 0.001 ? targetDx / authoredDx : 1;
    const sy = Math.abs(authoredDy) > 0.001 ? targetDy / authoredDy : 1;

    // Transform a single x,y pair
    const tx = (x: number, y: number): [number, number] => {
        return [
            (x - start.x) * sx + targetStart.x,
            (y - start.y) * sy + targetStart.y,
        ];
    };

    const result: PathCommand[] = [];

    for (const { command: cmd, args } of absCommands) {
        const newArgs = [...args];

        switch (cmd) {
            case 'M':
            case 'L':
            case 'T':
                for (let i = 0; i + 1 < newArgs.length; i += 2) {
                    [newArgs[i], newArgs[i + 1]] = tx(newArgs[i], newArgs[i + 1]);
                }
                break;
            case 'H':
                // H only has x, need to reconstruct
                for (let i = 0; i < newArgs.length; i++) {
                    newArgs[i] = (newArgs[i] - start.x) * sx + targetStart.x;
                }
                break;
            case 'V':
                for (let i = 0; i < newArgs.length; i++) {
                    newArgs[i] = (newArgs[i] - start.y) * sy + targetStart.y;
                }
                break;
            case 'C':
                for (let i = 0; i + 5 < newArgs.length; i += 6) {
                    [newArgs[i], newArgs[i + 1]] = tx(newArgs[i], newArgs[i + 1]);
                    [newArgs[i + 2], newArgs[i + 3]] = tx(newArgs[i + 2], newArgs[i + 3]);
                    [newArgs[i + 4], newArgs[i + 5]] = tx(newArgs[i + 4], newArgs[i + 5]);
                }
                break;
            case 'S':
            case 'Q':
                for (let i = 0; i + 3 < newArgs.length; i += 4) {
                    [newArgs[i], newArgs[i + 1]] = tx(newArgs[i], newArgs[i + 1]);
                    [newArgs[i + 2], newArgs[i + 3]] = tx(newArgs[i + 2], newArgs[i + 3]);
                }
                break;
            case 'A':
                for (let i = 0; i + 6 < newArgs.length; i += 7) {
                    // Scale the radii
                    newArgs[i] *= Math.abs(sx);
                    newArgs[i + 1] *= Math.abs(sy);
                    // Transform the endpoint
                    [newArgs[i + 5], newArgs[i + 6]] = tx(newArgs[i + 5], newArgs[i + 6]);
                }
                break;
            case 'Z':
                break;
        }
        result.push({ command: cmd, args: newArgs });
    }

    return result;
}

/**
 * Mirror a path's x coordinates (for generating flipped piece variants).
 * Assumes the path is in piece-centre-relative coordinates (origin at centre).
 */
export function mirrorPathX(commands: PathCommand[]): PathCommand[] {
    const result: PathCommand[] = [];

    for (const { command: cmd, args } of commands) {
        const newArgs = [...args];

        switch (cmd) {
            case 'M': case 'L': case 'T':
                for (let i = 0; i + 1 < newArgs.length; i += 2) { newArgs[i] = -newArgs[i]; }
                break;
            case 'H':
                for (let i = 0; i < newArgs.length; i++) { newArgs[i] = -newArgs[i]; }
                break;
            case 'C':
                for (let i = 0; i + 5 < newArgs.length; i += 6) {
                    newArgs[i] = -newArgs[i];
                    newArgs[i + 2] = -newArgs[i + 2];
                    newArgs[i + 4] = -newArgs[i + 4];
                }
                break;
            case 'S': case 'Q':
                for (let i = 0; i + 3 < newArgs.length; i += 4) {
                    newArgs[i] = -newArgs[i];
                    newArgs[i + 2] = -newArgs[i + 2];
                }
                break;
            case 'A':
                for (let i = 0; i + 6 < newArgs.length; i += 7) {
                    // Flip sweep flag and negate endpoint x
                    newArgs[i + 4] = newArgs[i + 4] === 0 ? 1 : 0;
                    newArgs[i + 5] = -newArgs[i + 5];
                }
                break;
        }
        result.push({ command: cmd, args: newArgs });
    }
    return result;
}

/**
 * Get squeeze factors — how much the transform distorts the authored path.
 * Close to 1.0 = minimal distortion.
 */
export function getSqueeze(
    commands: PathCommand[],
    targetStart: PathPoint,
    targetEnd: PathPoint
): { scaleX: number; scaleY: number } {
    const absCommands = toAbsolute(commands);
    const start = getPathStart(absCommands);
    const end = getPathEnd(absCommands);
    if (!start || !end) return { scaleX: 1, scaleY: 1 };

    const authoredDx = end.x - start.x;
    const authoredDy = end.y - start.y;
    const targetDx = targetEnd.x - targetStart.x;
    const targetDy = targetEnd.y - targetStart.y;

    return {
        scaleX: Math.abs(authoredDx) > 0.001 ? targetDx / authoredDx : 1,
        scaleY: Math.abs(authoredDy) > 0.001 ? targetDy / authoredDy : 1,
    };
}