// Every error response from the API has this shape.
export interface ErrorDetail {
    field: string;
    message: string;
}

export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: ErrorDetail[];
    };
}
