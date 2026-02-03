"""Custom exceptions for the Innonet application."""


class InnonetException(Exception):
    """Base exception for Innonet application."""
    pass


class NotFoundError(InnonetException):
    """Resource not found."""
    def __init__(self, resource: str, resource_id: str = None):
        if resource_id:
            message = f"{resource} with id '{resource_id}' not found"
        else:
            message = f"{resource} not found"
        super().__init__(message)
        self.resource = resource
        self.resource_id = resource_id


class ValidationError(InnonetException):
    """Invalid input data."""
    def __init__(self, message: str, field: str = None):
        super().__init__(message)
        self.field = field


class AuthorizationError(InnonetException):
    """User not authorized for this action."""
    def __init__(self, message: str = "You are not authorized to perform this action"):
        super().__init__(message)


class ConflictError(InnonetException):
    """Resource conflict (e.g., duplicate, full capacity)."""
    def __init__(self, message: str):
        super().__init__(message)


class AlreadyExistsError(InnonetException):
    """Resource already exists."""
    def __init__(self, resource: str, identifier: str = None):
        if identifier:
            message = f"{resource} with '{identifier}' already exists"
        else:
            message = f"{resource} already exists"
        super().__init__(message)
        self.resource = resource
        self.identifier = identifier


class CapacityExceededError(ConflictError):
    """Capacity limit has been reached."""
    def __init__(self, resource: str, capacity: int):
        message = f"{resource} has reached maximum capacity of {capacity}"
        super().__init__(message)
        self.resource = resource
        self.capacity = capacity
