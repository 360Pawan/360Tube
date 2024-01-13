import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (request, response) => {
  response.status(201).json({
    message: "You are created.",
  });
});

export { registerUser };
