import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (request, response) => {
return response.status(200).json(new ApiResponse(200, {}, "👍 All system fine."));
});

export { healthcheck };
