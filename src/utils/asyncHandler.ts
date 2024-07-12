export const asyncHandler = (requestHandler) => {
  return (request, response, next) =>
    Promise.resolve(requestHandler(request, response, next)).catch((error) =>
      next(error)
    );
};
