import { Request, Response } from "express";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";

const healthcheck = asyncHandler(
  async (request: Request, response: Response) => {
    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 All system fine."));
  }
);

export { healthcheck };
