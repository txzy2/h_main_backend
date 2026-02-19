// Это тип для ответа API
export interface ApiSuccessResponse<T> {
    success: true;
    data: T | null;
}

export interface ApiErrorResponse {
    success: false;
    message: string;
    statusCode: number;
}

// Это класс-хелпер для создания ответов
export class ApiResponse {
    static ok<T>(data: T | null = null): ApiSuccessResponse<T> {
        return {
            success: true,
            data
        };
    }

    static err(message: string, statusCode: number): ApiErrorResponse {
        return {
            success: false,
            message,
            statusCode: statusCode
        };
    }
}
