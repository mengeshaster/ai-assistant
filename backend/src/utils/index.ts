// Utility functions for the application

export const generateId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const formatTimestamp = (date: Date = new Date()): string => {
    return date.toISOString();
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

export const extractTextFromContent = (content: string | any[]): string => {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        const textContent = content.find(c => c.type === 'text');
        return textContent?.text || '';
    }

    return '';
};

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const retryAsync = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> => {
    let lastError: Error;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (i === maxRetries) {
                throw lastError;
            }

            await sleep(delay * Math.pow(2, i)); // Exponential backoff
        }
    }

    throw lastError!;
};
