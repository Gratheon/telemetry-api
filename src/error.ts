export class TelemetryServerError extends Error {
    // You can add any additional properties or methods you need
    constructor(message: string, public errorCode?: number, public httpStatus?: number) {
        super(message); // Call the parent class constructor with the message
        this.name = 'TelemetryServerError'; // Set the name of the error to your custom type
        this.message = message;
        this.httpStatus = httpStatus;
        this.errorCode = errorCode;
    }
}

export const errorCodes = {
    hiveIdMissing: 4001,
    fieldsMissing: 4002,

    internalServerError: 5000,
}