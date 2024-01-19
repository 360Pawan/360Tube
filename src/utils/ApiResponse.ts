class ApiResponse {
  statusCode: number;
  data: any;
  success: boolean;
  message: string;

  constructor(statusCode, data, message = `\n 👍 Success`) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
