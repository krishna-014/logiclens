/**
 * Simple structured logger utility.
 * Can be replaced with winston/pino in the future.
 */

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function timestamp() {
    return new Date().toISOString();
}

export const logger = {
    info: (msg, ...args) => {
        console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.green}INFO${COLORS.reset}  ${msg}`, ...args);
    },
    warn: (msg, ...args) => {
        console.warn(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}WARN${COLORS.reset}  ${msg}`, ...args);
    },
    error: (msg, ...args) => {
        console.error(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.red}ERROR${COLORS.reset} ${msg}`, ...args);
    },
    debug: (msg, ...args) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.cyan}DEBUG${COLORS.reset} ${msg}`, ...args);
        }
    },
    request: (method, url, status, duration) => {
        const color = status >= 400 ? COLORS.red : COLORS.green;
        console.log(
            `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.blue}HTTP${COLORS.reset}  ${method} ${url} ${color}${status}${COLORS.reset} ${COLORS.gray}${duration}ms${COLORS.reset}`
        );
    }
};
