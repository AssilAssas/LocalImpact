export class DomainError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = "DOMAIN_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Authentification requise.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Action non autorisée pour votre rôle.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Ressource introuvable.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Conflit détecté.") {
    super(message, 409, "CONFLICT");
  }
}
