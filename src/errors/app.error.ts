export class ApplicationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends ApplicationError {
  constructor(entity: string, id: string) {
    super(`${entity} with ID '${id}' was not found.`, 404);
  }
}

export class ForbiddenError extends ApplicationError {
  constructor(message: string = "Access denied.") {
    super(message, 403);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 400);
  }
}
