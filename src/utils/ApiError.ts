class ApiError extends Error {
  statusCode: number;
  data: null;
  success: boolean;

  constructor(
    statusCode,
    message = `\n 😰 Something went wrong.`,
    // errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    // this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      ...this,
      message: this.message,
    };
  }
}

export { ApiError };
